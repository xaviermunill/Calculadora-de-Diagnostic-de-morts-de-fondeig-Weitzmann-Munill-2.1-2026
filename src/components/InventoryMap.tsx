import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { MortEvaluationRecord, ActionCategory } from '../types';
import {
  MapPin,
  Layers,
  Printer,
  Filter,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  SearchX,
  FileSpreadsheet,
  X,
  Compass,
  Maximize2,
  Minimize2,
  Anchor,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { exportInventoryToExcel } from '../utils/excelExport';
import { exportMapAndTableToPdf } from '../utils/mapPdfExport';

interface InventoryMapProps {
  records: MortEvaluationRecord[];
  onSelectRecordForEdit: (record: MortEvaluationRecord) => void;
  onPrintRecord: (record: MortEvaluationRecord) => void;
  onOpenBatchDossier?: (cala?: string) => void;
}

export const InventoryMap: React.FC<InventoryMapProps> = ({
  records,
  onSelectRecordForEdit,
  onPrintRecord,
  onOpenBatchDossier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Map state
  const [baseLayerType, setBaseLayerType] = useState<'satellite' | 'streets'>('satellite');
  const [selectedCala, setSelectedCala] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startCode, setStartCode] = useState<string>('');
  const [endCode, setEndCode] = useState<string>('');
  const [selectedPointForDetail, setSelectedPointForDetail] = useState<MortEvaluationRecord | null>(null);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Extract unique locations/calas
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    records.forEach((r) => {
      if (r.locationName) {
        locSet.add(r.locationName);
      }
    });
    return Array.from(locSet).sort();
  }, [records]);

  // Selected individual IDs on map
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(records.map((r) => r.id));
  });

  // Filtered pool of points
  const filteredPoints = useMemo(() => {
    let list = records.filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number');

    // Filter by location
    if (selectedCala !== 'all') {
      list = list.filter((r) => r.locationName === selectedCala || r.locationName.includes(selectedCala));
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'not_found') {
        list = list.filter((r) => r.presenceStatus === 'not_found');
      } else {
        list = list.filter((r) => r.result.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          (r.observerName && r.observerName.toLowerCase().includes(q))
      );
    }

    // Range filter
    if (startCode || endCode) {
      const startIndex = startCode
        ? list.findIndex((r) => r.code.toLowerCase() === startCode.toLowerCase())
        : 0;
      const endIndex = endCode
        ? list.findIndex((r) => r.code.toLowerCase() === endCode.toLowerCase())
        : list.length - 1;

      if (startIndex >= 0 && endIndex >= 0) {
        const from = Math.min(startIndex, endIndex);
        const to = Math.max(startIndex, endIndex);
        list = list.slice(from, to + 1);
      } else if (startIndex >= 0) {
        list = list.slice(startIndex);
      } else if (endIndex >= 0) {
        list = list.slice(0, endIndex + 1);
      }
    }

    return list;
  }, [records, selectedCala, selectedCategory, searchTerm, startCode, endCode]);

  // Final points plotted on map (filtered & selected)
  const plottedPoints = useMemo(() => {
    return filteredPoints.filter((r) => selectedIds.has(r.id));
  }, [filteredPoints, selectedIds]);

  // Summary statistics of plotted points
  const mapStats = useMemo(() => {
    const total = plottedPoints.length;
    const conservation = plottedPoints.filter((r) => r.result.category === 'conservation').length;
    const low = plottedPoints.filter((r) => r.result.category === 'low_priority').length;
    const medium = plottedPoints.filter((r) => r.result.category === 'medium_priority').length;
    const high = plottedPoints.filter((r) => r.result.category === 'high_priority').length;
    const notFound = plottedPoints.filter((r) => r.presenceStatus === 'not_found').length;
    const totalWeightTonnes =
      Math.round(
        (plottedPoints.reduce((sum, r) => sum + (r.hydrodynamics?.weightAirKg || 0), 0) / 1000) * 10
      ) / 10;

    return { total, conservation, low, medium, high, notFound, totalWeightTonnes };
  }, [plottedPoints]);

  // Bulk selection toggles
  const handleSelectAllMatched = () => {
    const next = new Set(selectedIds);
    filteredPoints.forEach((r) => next.add(r.id));
    setSelectedIds(next);
  };

  const handleDeselectAllMatched = () => {
    const next = new Set(selectedIds);
    filteredPoints.forEach((r) => next.delete(r.id));
    setSelectedIds(next);
  };

  // Helper for marker colors
  const getMarkerColor = (r: MortEvaluationRecord) => {
    if (r.presenceStatus === 'not_found') return '#D97706'; // Amber/Orange
    switch (r.result.category) {
      case 'conservation':
        return '#15803D'; // Green
      case 'low_priority':
        return '#0284C7'; // Sky / Blue
      case 'medium_priority':
        return '#CA8A04'; // Yellow / Ochre
      case 'high_priority':
        return '#DC2626'; // Red
      default:
        return '#4B5563';
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Map
      const map = L.map(mapContainerRef.current, {
        center: [42.0, 3.2],
        zoom: 10,
        zoomControl: false,
      });

      // Zoom control in top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Layer group for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Tile Layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (baseLayerType === 'satellite') {
      // Esri World Imagery (Satellite)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics, GIS User Community',
        maxZoom: 19,
      }).addTo(map);

      // Add subtle reference labels/borders
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        opacity: 0.8,
      }).addTo(map);
    } else {
      // OpenStreetMap Streets
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
    }

    // Force resize calculation
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // Cleanup on unmount
    };
  }, [baseLayerType]);

  // Update Markers when plottedPoints changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerGroupRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (plottedPoints.length === 0) return;

    const latLngBounds = L.latLngBounds([]);

    plottedPoints.forEach((r) => {
      if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return;

      const latLng = L.latLng(r.latitude, r.longitude);
      latLngBounds.extend(latLng);

      const color = getMarkerColor(r);
      const isNotFound = r.presenceStatus === 'not_found';
      const labelText = r.code.replace(/^M-/, '');

      // Create Custom HTML Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-mort-pin',
        html: `
          <div style="
            background-color: ${color};
            color: white;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            font-weight: bold;
            padding: 3px 6px;
            border-radius: 12px;
            border: 2px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            ${isNotFound ? '⚠️ ' : ''}${r.code}
          </div>
        `,
        iconSize: [40, 24],
        iconAnchor: [20, 12],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Interactive Popup Content
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #134E4A; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E5E5DF; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="font-family: monospace; font-size: 14px; color: #134E4A;">${r.code}</strong>
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 6px; background-color: ${color}20; color: ${color};">
              ${r.result.recommendedAction}
            </span>
          </div>
          <div style="margin-bottom: 4px; font-weight: 600; color: #134E4A;">📍 ${r.locationName}</div>
          <div style="color: #5C6B5E; margin-bottom: 2px; font-size: 11px;">Fondària: <strong>-${r.depthM} m</strong> | Ús: <strong>${r.usageStatus === 'in_use' ? 'En ús' : 'Abandonat'}</strong></div>
          <div style="color: #5C6B5E; margin-bottom: 4px; font-size: 11px;">Dimensions: <strong>${r.dimensions.lengthCm}x${r.dimensions.widthCm}x${r.dimensions.heightCm} cm</strong></div>
          <div style="color: #5C6B5E; margin-bottom: 6px; font-size: 11px;">Pes subm.: <strong>${r.hydrodynamics?.submergedWeightKg || 0} kg</strong> | Punts: <strong>${r.presenceStatus === 'not_found' ? 'Ø' : r.result.totalScore} pts</strong></div>
          <div style="font-size: 10px; background: #FAF9F6; border: 1px solid #D1D1C7; padding: 4px 6px; border-radius: 6px; margin-bottom: 6px; color: #3D5A45;">
            ${r.result.mitigationAction || r.result.operationalRecommendation}
          </div>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <button id="popup-btn-view-${r.id}" style="background: #134E4A; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer; flex: 1;">
              Veure Fitxa
            </button>
            <button id="popup-btn-edit-${r.id}" style="background: #E9E9E0; color: #134E4A; border: 1px solid #D1D1C7; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">
              Editar
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const viewBtn = document.getElementById(`popup-btn-view-${r.id}`);
        const editBtn = document.getElementById(`popup-btn-edit-${r.id}`);
        if (viewBtn) {
          viewBtn.onclick = () => onPrintRecord(r);
        }
        if (editBtn) {
          editBtn.onclick = () => onSelectRecordForEdit(r);
        }
      });

      marker.on('click', () => {
        setSelectedPointForDetail(r);
      });

      marker.addTo(markersLayer);
    });

    if (latLngBounds.isValid()) {
      map.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [plottedPoints]);

  // Print Map trigger (window.print)
  const handlePrintMap = () => {
    window.print();
  };

  // Download PDF trigger (direct .pdf file generation of Map and Table)
  const handleDownloadPdf = async () => {
    if (plottedPoints.length === 0 || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      await exportMapAndTableToPdf({
        mapElement: mapContainerRef.current,
        records: plottedPoints,
        sectorName: selectedCala === 'all' ? 'Costa Brava / Litoral de Catalunya' : selectedCala,
        stats: mapStats,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export Excel of plotted points
  const handleExportExcel = () => {
    if (plottedPoints.length === 0) return;
    exportInventoryToExcel(plottedPoints);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner with Quick Actions (Hidden in Print) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E9E9E0] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Visor Cartogràfic Oficial i Georeferenciació</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#134E4A] tracking-tight">
              Mapa de Diagnosi i Distribució de Morts
            </h2>
            <p className="text-xs sm:text-sm text-[#5C6B5E] mt-1 font-sans">
              Visualització espacial de punts de fondeig, anàlisi de concentracions i descàrrega/impressió de plànols de camp per a equips de rescat i busseig.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Base Layer Switcher */}
            <div className="flex items-center bg-[#E9E9E0] p-1 rounded-full border border-[#D1D1C7] text-xs font-medium">
              <button
                onClick={() => setBaseLayerType('satellite')}
                className={`px-3 py-1.5 rounded-full transition ${
                  baseLayerType === 'satellite' ? 'bg-[#134E4A] text-white shadow-xs' : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                Satèl·lit HD
              </button>
              <button
                onClick={() => setBaseLayerType('streets')}
                className={`px-3 py-1.5 rounded-full transition ${
                  baseLayerType === 'streets' ? 'bg-[#134E4A] text-white shadow-xs' : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                Topogràfic
              </button>
            </div>

            {onOpenBatchDossier && (
              <button
                onClick={() => onOpenBatchDossier(selectedCala !== 'all' ? selectedCala : undefined)}
                className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3.5 py-2 rounded-full border border-[#D1D1C7] transition shadow-xs"
                title="Generar dossier de fitxes d'aquesta zona"
              >
                <FileText className="w-4 h-4" />
                <span>Dossier Fitxes ({plottedPoints.length})</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={plottedPoints.length === 0}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition shadow-xs"
              title="Exportar dades georeferenciades a Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            {/* DOWNLOAD PDF BUTTON */}
            <button
              id="btn-download-map-pdf"
              onClick={handleDownloadPdf}
              disabled={plottedPoints.length === 0 || isGeneratingPdf}
              className="flex items-center gap-2 bg-[#0E3B38] hover:bg-[#134E4A] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm"
              title="Baixar plànol i taula de coordenades en format PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-200" />
                  <span>Generant PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF (Mapa + Taula)</span>
                </>
              )}
            </button>

            {/* PRINT MAP BUTTON */}
            <button
              id="btn-print-cartographic-map"
              onClick={handlePrintMap}
              disabled={plottedPoints.length === 0}
              className="flex items-center gap-2 bg-[#134E4A] hover:bg-[#0E3B38] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm"
              title="Imprimir mapa cartogràfic i llistat de coordenades"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

          </div>
        </div>

        {/* Filter Controls for Map */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Cala Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
              Zona / Cala
            </label>
            <select
              value={selectedCala}
              onChange={(e) => setSelectedCala(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-medium focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
            >
              <option value="all">Totes les localitzacions ({records.length} blocs)</option>
              {uniqueLocations.map((loc) => {
                const count = records.filter((r) => r.locationName === loc).length;
                return (
                  <option key={loc} value={loc}>
                    {loc} ({count} blocs)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Range: From Code */}
          <div>
            <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
              Des del Codi
            </label>
            <select
              value={startCode}
              onChange={(e) => setStartCode(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-mono focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
            >
              <option value="">-- Primer punt --</option>
              {records.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.code} ({r.locationName})
                </option>
              ))}
            </select>
          </div>

          {/* Range: To Code */}
          <div>
            <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
              Fins al Codi
            </label>
            <select
              value={endCode}
              onChange={(e) => setEndCode(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-mono focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
            >
              <option value="">-- Últim punt --</option>
              {records.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.code} ({r.locationName})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
              Classificació Dictamen
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-medium focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
            >
              <option value="all">Totes les categories</option>
              <option value="conservation">🟢 Conservar (Refugi / Escull)</option>
              <option value="low_priority">🔵 Prioritat Baixa (Mitigació)</option>
              <option value="medium_priority">🟡 Prioritat Mitjana (Retirada)</option>
              <option value="high_priority">🔴 Prioritat Alta (Retirada urgent)</option>
              <option value="not_found">⚠️ No localitzat / Soterrat</option>
            </select>
          </div>

        </div>

        {/* Legend Bar & Selection Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E9E9E0] text-xs">
          
          {/* Priority Color Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-[#134E4A] uppercase text-[11px] tracking-wider">Llegenda:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#15803D] inline-block shadow-2xs"></span>
              <span className="text-[#134E4A] font-medium">Conservar ({mapStats.conservation})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0284C7] inline-block shadow-2xs"></span>
              <span className="text-[#134E4A] font-medium">P. Baixa ({mapStats.low})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#CA8A04] inline-block shadow-2xs"></span>
              <span className="text-[#134E4A] font-medium">P. Mitjana ({mapStats.medium})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#DC2626] inline-block shadow-2xs"></span>
              <span className="text-[#134E4A] font-medium">P. Alta ({mapStats.high})</span>
            </div>

            {mapStats.notFound > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#D97706] inline-block shadow-2xs"></span>
                <span className="text-amber-900 font-medium">No Loc. ({mapStats.notFound})</span>
              </div>
            )}
          </div>

          {/* Plotted count badge */}
          <div className="flex items-center gap-3">
            <span className="text-[#5C6B5E]">
              Punts al mapa: <strong>{plottedPoints.length}</strong> de {records.length} | <strong>{mapStats.totalWeightTonnes} t</strong> formigó
            </span>
            <button
              onClick={handleSelectAllMatched}
              className="text-[#134E4A] hover:underline font-semibold flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Marcar tots</span>
            </button>
            <button
              onClick={handleDeselectAllMatched}
              className="text-[#7A8A7C] hover:underline font-medium flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Desmarcar</span>
            </button>
          </div>

        </div>

      </div>

      {/* PRINTABLE CARTOGRAPHIC MAP VIEW (Visible in browser and formatted for Print) */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D1D1C7] overflow-hidden print:border-none print:shadow-none">
        
        {/* Printable Header (Always on Print, clean in web view) */}
        <div className="p-6 border-b border-[#D1D1C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
              Protocol Oficial de Diagnosi • Plànol de Restauració d'Hàbitats Marins (v3.6)
            </div>
            <h3 className="text-xl font-serif font-bold text-[#134E4A] tracking-tight mt-0.5">
              PLÀNOL GEOREFERENCIAT DE FONDEJOS I ACTUACIONS ({plottedPoints.length} PUNTS)
            </h3>
            <p className="text-xs text-[#5C6B5E]">
              Sector: {selectedCala === 'all' ? 'Costa Brava / Litoral de Catalunya' : selectedCala} • Sistema de Coordenades: WGS84
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-mono font-bold text-[#134E4A]">DATA: {new Date().toLocaleDateString('ca-ES')}</div>
            <div className="text-[11px] text-[#5C6B5E]">Total Formigó: {mapStats.totalWeightTonnes} tones</div>
          </div>
        </div>

        {/* Map Container Viewport */}
        <div className="relative w-full h-[580px] sm:h-[650px] print:h-[500px] bg-[#E9E9E0]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Selected Point Info Card in web view */}
          {selectedPointForDetail && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-[#D1D1C7] max-w-sm w-full space-y-2.5 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#134E4A]">{selectedPointForDetail.code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedPointForDetail.result.badgeClass}`}>
                    {selectedPointForDetail.result.recommendedAction}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPointForDetail(null)}
                  className="text-[#7A8A7C] hover:text-[#134E4A] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#5C6B5E] space-y-1">
                <div><strong>Ubicació:</strong> {selectedPointForDetail.locationName}</div>
                <div><strong>Fondària:</strong> -{selectedPointForDetail.depthM} m | <strong>Pes:</strong> {selectedPointForDetail.hydrodynamics?.weightAirKg} kg</div>
                <div><strong>GPS:</strong> {selectedPointForDetail.latitude?.toFixed(5)}, {selectedPointForDetail.longitude?.toFixed(5)}</div>
                <div className="text-[11px] text-[#134E4A] font-medium bg-[#FAF9F6] p-2 rounded-xl border border-[#E9E9E0]">
                  {selectedPointForDetail.result.mitigationAction || selectedPointForDetail.result.operationalRecommendation}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onPrintRecord(selectedPointForDetail)}
                  className="flex-1 bg-[#134E4A] hover:bg-[#0E3B38] text-white text-xs font-semibold py-1.5 rounded-lg transition"
                >
                  Veure Fitxa Oficial
                </button>
                <button
                  onClick={() => onSelectRecordForEdit(selectedPointForDetail)}
                  className="bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold py-1.5 px-3 rounded-lg border border-[#D1D1C7] transition"
                >
                  Editar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Georeferenced Data Table for Printed Map / Field Work */}
        <div className="p-6 border-t border-[#D1D1C7] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-serif font-bold text-sm text-[#134E4A] uppercase tracking-wider">
                Taula de Coordenades i Ordre de Treball de Camp ({plottedPoints.length} punts)
              </h4>
              <span className="text-xs text-[#5C6B5E]">
                Classificació georeferenciada segons protocol científic de restauració
              </span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleDownloadPdf}
                disabled={plottedPoints.length === 0 || isGeneratingPdf}
                className="flex items-center gap-1.5 bg-[#0E3B38] hover:bg-[#134E4A] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
                title="Descarregar PDF complet (Mapa + Taula)"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Baixar PDF</span>
              </button>
              <button
                onClick={handlePrintMap}
                disabled={plottedPoints.length === 0}
                className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#D1D1C7] transition shadow-xs"
                title="Imprimir document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          <div className="border border-[#D1D1C7] rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#E9E9E0] uppercase text-[#134E4A] font-serif font-bold tracking-wider">
                <tr>
                  <th className="p-2.5">Codi</th>
                  <th className="p-2.5">Cala / Localització</th>
                  <th className="p-2.5">Coordenades GPS</th>
                  <th className="p-2.5">Fondària</th>
                  <th className="p-2.5">Pes (Aire/Subm.)</th>
                  <th className="p-2.5">Punts</th>
                  <th className="p-2.5">Dictamen i Mesura</th>
                  <th className="p-2.5 text-right print:hidden">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E9E0]">
                {plottedPoints.map((r) => {
                  const color = getMarkerColor(r);
                  return (
                    <tr key={r.id} className="hover:bg-[#FAF9F6] transition">
                      <td className="p-2.5 font-mono font-bold text-[#134E4A] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                        <span>{r.code}</span>
                      </td>
                      <td className="p-2.5 font-medium text-[#134E4A]">{r.locationName}</td>
                      <td className="p-2.5 font-mono text-[#5C6B5E] text-[11px]">
                        {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </td>
                      <td className="p-2.5 font-semibold text-[#134E4A]">-{r.depthM} m</td>
                      <td className="p-2.5 text-[#5C6B5E]">
                        {r.hydrodynamics?.weightAirKg || 0} kg / {r.hydrodynamics?.submergedWeightKg || 0} kg
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {r.presenceStatus === 'not_found' ? 'Ø' : r.result.totalScore}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${r.result.badgeClass}`}>
                          {r.result.recommendedAction}
                        </span>
                        <div className="text-[10px] text-[#5C6B5E] mt-0.5 line-clamp-1">
                          {r.result.mitigationAction || r.result.operationalRecommendation}
                        </div>
                      </td>
                      <td className="p-2.5 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onPrintRecord(r)}
                            className="text-[#134E4A] hover:underline font-semibold text-[11px]"
                          >
                            Fitxa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartographic Sign-off Box for Official Print */}
          <div className="pt-6 border-t border-[#D1D1C7] grid grid-cols-2 gap-8 text-xs text-[#5C6B5E]">
            <div>
              <div className="font-semibold text-[#134E4A]">Cap de Missió / Cartògraf Responsable:</div>
              <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
              <div className="mt-1 text-[11px] text-[#7A8A7C]">Signatura i Data d'Aprovació</div>
            </div>
            <div>
              <div className="font-semibold text-[#134E4A]">Validació de Camp i Segell Oficial:</div>
              <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
              <div className="mt-1 text-[11px] text-[#7A8A7C]">Autoritat de Vigilància i Reserves Marines</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
