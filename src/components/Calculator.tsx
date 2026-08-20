import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
  MortEvaluationRecord,
  BlockDimensions,
  PresenceStatus,
} from '../types';
import { evaluateDecision } from '../utils/decisionEngine';
import { assessHydrodynamics } from '../utils/hydrodynamics';
import { PRESET_BLOCKS, PROTECTED_SPECIES_CATALOG } from '../data/protocolStandards';
import { DecisionCard } from './DecisionCard';
import {
  Anchor,
  TreeDeciduous,
  Waves,
  Scale,
  Compass,
  MapPin,
  Calendar,
  User,
  Info,
  Check,
  Sparkles,
  HelpCircle,
  Maximize2,
  Box,
  Camera,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Clipboard,
  AlertCircle,
  Eye,
  X,
  SearchX,
} from 'lucide-react';

interface CalculatorProps {
  onSaveEvaluation: (record: MortEvaluationRecord) => void;
  onPrintReport: (record: MortEvaluationRecord) => void;
  initialRecord?: MortEvaluationRecord | null;
}

export const Calculator: React.FC<CalculatorProps> = ({
  onSaveEvaluation,
  onPrintReport,
  initialRecord,
}) => {
  // General Info
  const [code, setCode] = useState<string>(initialRecord?.code || 'M-01');
  const [date, setDate] = useState<string>(
    initialRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [locationName, setLocationName] = useState<string>(
    initialRecord?.locationName || 'Cala Montgó (Costa Brava)'
  );
  const [observerName, setObserverName] = useState<string>(
    initialRecord?.observerName || 'Equip Tècnic de Restauració'
  );
  const [depthM, setDepthM] = useState<number>(initialRecord?.depthM || 8);
  const [usageStatus, setUsageStatus] = useState<MortUsageStatus>(
    initialRecord?.usageStatus || 'in_use'
  );
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>(
    initialRecord?.presenceStatus || 'located'
  );
  const [notFoundReason, setNotFoundReason] = useState<string>(
    initialRecord?.notFoundReason || 'No detectat en prospecció visual ni sonar de fons'
  );
  const [latitude, setLatitude] = useState<string>(
    initialRecord?.latitude ? String(initialRecord.latitude) : '42.1154'
  );
  const [longitude, setLongitude] = useState<string>(
    initialRecord?.longitude ? String(initialRecord.longitude) : '3.1762'
  );
  const [generalNotes, setGeneralNotes] = useState<string>(
    initialRecord?.generalNotes || ''
  );

  // Photos State (supporting multiple photos and clipboard paste)
  const [photos, setPhotos] = useState<string[]>(() => {
    if (initialRecord?.photos && initialRecord.photos.length > 0) {
      return initialRecord.photos;
    }
    if (initialRecord?.photoUrl) {
      return [initialRecord.photoUrl];
    }
    return [];
  });
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const result = loadEvent.target?.result as string;
              if (result) {
                setPhotos((prev) => [...prev, result]);
                setCopyFeedback('Foto enganxada correctament des del porta-retalls!');
                setTimeout(() => setCopyFeedback(null), 3500);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const res = loadEvent.target?.result as string;
          if (res) {
            setPhotos((prev) => [...prev, res]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Dimensions & Presets
  const [selectedPresetId, setSelectedPresetId] = useState<string>('block_80x80x40');
  const [dimensions, setDimensions] = useState<BlockDimensions>(
    initialRecord?.dimensions || {
      lengthCm: 80,
      widthCm: 80,
      heightCm: 40,
      concreteDensityKgM3: 2400,
    }
  );

  // Criteria States
  const [c1Species, setC1Species] = useState<SpeciesPresenceOption>(
    initialRecord?.c1_speciesPresence || 'none'
  );
  const [c1SelectedSpecies, setC1SelectedSpecies] = useState<string[]>([]);
  const [c1Notes, setC1Notes] = useState<string>(initialRecord?.c1_speciesNotes || '');

  const [c2Substrate, setC2Substrate] = useState<SubstrateImpactOption>(
    initialRecord?.c2_substrateImpact || 'active_erosion_halo'
  );
  const [c2HaloRadius, setC2HaloRadius] = useState<number>(
    initialRecord?.c2_haloRadiusM || 2.5
  );
  const [c2HasMobileElements, setC2HasMobileElements] = useState<boolean>(
    initialRecord?.c2_hasMobileElements ?? true
  );

  const [c3AutoFromPhysics, setC3AutoFromPhysics] = useState<boolean>(
    initialRecord?.c3_useCustomPhysics ?? true
  );
  const [c3DynamismManual, setC3DynamismManual] = useState<DynamismRiskOption>(
    initialRecord?.c3_dynamismRisk || 'high_risk'
  );

  const [c4Stability, setC4Stability] = useState<StabilityIntegrationOption>(
    initialRecord?.c4_stabilityIntegration || 'not_buried_no_void'
  );
  const [c4Notes, setC4Notes] = useState<string>(initialRecord?.c4_notes || '');

  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Compute Hydrodynamics
  const hydroAssessment = useMemo(() => {
    return assessHydrodynamics(dimensions, depthM, 9);
  }, [dimensions, depthM]);

  // Derive C3 score based on auto physics or manual
  const effectiveC3: DynamismRiskOption = useMemo(() => {
    if (!c3AutoFromPhysics) return c3DynamismManual;
    if (hydroAssessment.slidingRiskScore === 3) return 'high_risk';
    if (hydroAssessment.slidingRiskScore === 2) return 'moderate_risk';
    if (hydroAssessment.slidingRiskScore === 1) return 'low_risk';
    return 'no_risk';
  }, [c3AutoFromPhysics, c3DynamismManual, hydroAssessment]);

  // Evaluate Decision Result
  const decisionResult = useMemo(() => {
    return evaluateDecision(
      c1Species,
      c2Substrate,
      effectiveC3,
      c4Stability,
      c2HasMobileElements,
      presenceStatus === 'not_found'
    );
  }, [c1Species, c2Substrate, effectiveC3, c4Stability, c2HasMobileElements, presenceStatus]);

  // Reset saved status when criteria change
  useEffect(() => {
    setIsSaved(false);
  }, [
    code,
    date,
    locationName,
    depthM,
    usageStatus,
    presenceStatus,
    notFoundReason,
    photos,
    dimensions,
    c1Species,
    c2Substrate,
    effectiveC3,
    c4Stability,
  ]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = PRESET_BLOCKS.find((b) => b.id === presetId);
    if (p) {
      setDimensions((prev) => ({
        ...prev,
        lengthCm: p.dimensionsCm.length,
        widthCm: p.dimensionsCm.width,
        heightCm: p.dimensionsCm.height,
      }));
    }
  };

  const toggleSpeciesSelection = (spName: string) => {
    setC1SelectedSpecies((prev) => {
      const next = prev.includes(spName) ? prev.filter((s) => s !== spName) : [...prev, spName];
      if (next.length > 0 && c1Species === 'none') {
        setC1Species('high_coverage_or_protected');
      }
      return next;
    });
  };

  const buildCurrentRecord = (): MortEvaluationRecord => {
    return {
      id: initialRecord?.id || `mort_${Date.now()}`,
      code,
      date,
      locationName,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      depthM,
      usageStatus,
      presenceStatus,
      notFoundReason: presenceStatus === 'not_found' ? notFoundReason : undefined,
      dimensions,
      c1_speciesPresence: presenceStatus === 'not_found' ? 'none' : c1Species,
      c1_speciesNotes: c1Notes || (c1SelectedSpecies.length > 0 ? c1SelectedSpecies.join(', ') : undefined),
      c2_substrateImpact: presenceStatus === 'not_found' ? 'none' : c2Substrate,
      c2_hasMobileElements: presenceStatus === 'not_found' ? false : c2HasMobileElements,
      c2_haloRadiusM: c2HaloRadius,
      c3_dynamismRisk: effectiveC3,
      c3_useCustomPhysics: c3AutoFromPhysics,
      c4_stabilityIntegration: presenceStatus === 'not_found' ? 'large_deep_stable' : c4Stability,
      c4_notes: c4Notes,
      result: decisionResult,
      hydrodynamics: hydroAssessment,
      observerName,
      generalNotes,
      photoUrl: photos[0] || undefined,
      photos: photos.length > 0 ? photos : undefined,
    };
  };

  const handleSave = () => {
    const record = buildCurrentRecord();
    onSaveEvaluation(record);
    setIsSaved(true);
  };

  const handlePrint = () => {
    const record = buildCurrentRecord();
    onPrintReport(record);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Dynamic Summary Strip Header in Natural Teal (#134E4A) */}
      <div className="bg-[#134E4A] text-white rounded-2xl p-4 sm:p-5 shadow-md border border-[#0f3e3b] flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-20 backdrop-blur-md bg-[#134E4A]/95">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-[#FAF9F6] font-mono font-bold text-sm">
            {code || 'M-01'}
          </div>
          <div>
            <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Puntuació Total del Protocol</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-serif italic font-bold text-white">
                {decisionResult.totalScore > 0 ? `+${decisionResult.totalScore}` : decisionResult.totalScore}
              </span>
              <span className="text-xs text-white/70 font-medium">punts</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${decisionResult.badgeClass}`}>
                {decisionResult.recommendedAction}
              </span>
            </div>
          </div>
        </div>

        {/* Small live breakdown chips */}
        <div className="flex items-center gap-2 text-xs overflow-x-auto w-full md:w-auto pb-1 md:pb-0 font-mono">
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            Espècies: <strong className={decisionResult.scoresBreakdown.c1_species < 0 ? 'text-emerald-300' : 'text-white'}>{decisionResult.scoresBreakdown.c1_species}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            Substrat: <strong className={decisionResult.scoresBreakdown.c2_substrate > 0 ? 'text-amber-300' : 'text-white'}>+{decisionResult.scoresBreakdown.c2_substrate}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            Dinamisme: <strong className={decisionResult.scoresBreakdown.c3_dynamism > 0 ? 'text-amber-300' : 'text-white'}>+{decisionResult.scoresBreakdown.c3_dynamism}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            Estabilitat: <strong className={decisionResult.scoresBreakdown.c4_stability < 0 ? 'text-emerald-300' : decisionResult.scoresBreakdown.c4_stability > 0 ? 'text-amber-300' : 'text-white'}>
              {decisionResult.scoresBreakdown.c4_stability > 0 ? `+${decisionResult.scoresBreakdown.c4_stability}` : decisionResult.scoresBreakdown.c4_stability}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Form Inputs and Criteria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): The 4 Evaluation Criteria */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 0: Identificació del Mort i Fons */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E5DF] pb-3">
              <h3 className="text-base font-serif font-bold italic text-[#134E4A] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#134E4A]" />
                Dades de la Inspecció i Caracterització
              </h3>
              <span className="text-xs font-mono text-[#64746B] uppercase tracking-wider">Campanya Subaquàtica</span>
            </div>

            {/* Presència del Mort (Localitzat / No Localitzat) */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5E5DF] space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#134E4A]">
                Estat de Localització del Mort al Fons
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPresenceStatus('located')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition ${
                    presenceStatus === 'located'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-600/30'
                      : 'bg-white border-[#D1D1C7] text-[#4A4A43] hover:bg-[#F5F5F0]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    presenceStatus === 'located' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-400'
                  }`}>
                    {presenceStatus === 'located' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#134E4A]">🟢 Mort Localitzat (Present)</div>
                    <div className="text-[11px] text-[#64746B]">Estructura trobada i avaluada in situ</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresenceStatus('not_found')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition ${
                    presenceStatus === 'not_found'
                      ? 'bg-amber-50 border-amber-600 text-amber-950 font-bold shadow-xs ring-2 ring-amber-600/30'
                      : 'bg-white border-[#D1D1C7] text-[#4A4A43] hover:bg-[#F5F5F0]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    presenceStatus === 'not_found' ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-400'
                  }`}>
                    {presenceStatus === 'not_found' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">⚠️ Mort No Localitzat / Desaparegut</div>
                    <div className="text-[11px] text-[#64746B]">No trobat a les coordenades previstes</div>
                  </div>
                </button>
              </div>

              {presenceStatus === 'not_found' && (
                <div className="mt-3 p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-amber-900 font-semibold">
                    <SearchX className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>Motiu de la no localització o desaparició del mort:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      'No detectat en prospecció visual ni sonar de fons',
                      'Soterrat completament pel sediment mòbil',
                      'Arrossegat per temporals a major fondària',
                      'Retirat prèviament o traslladat desconegut',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setNotFoundReason(reason)}
                        className={`px-3 py-2 rounded-lg border text-left transition text-[11px] ${
                          notFoundReason === reason
                            ? 'bg-amber-100 border-amber-600 font-bold text-amber-950'
                            : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={notFoundReason}
                    onChange={(e) => setNotFoundReason(e.target.value)}
                    placeholder="Escriu un altre motiu o detall de la recerca..."
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white text-amber-950 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Codi del Bloc / Mort</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: M-01"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Localització / Cala</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex: Cala Montgó"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Data d'Inspecció</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Fondària inspeccionada (m)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="45"
                    step="0.5"
                    value={depthM}
                    onChange={(e) => setDepthM(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-[#134E4A] focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                  />
                  <span className="text-[#64746B] font-medium font-mono text-[11px]">metres</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Estat de Fondeig</label>
                <select
                  value={usageStatus}
                  onChange={(e) => setUsageStatus(e.target.value as MortUsageStatus)}
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs bg-[#FAF9F6] focus:ring-2 focus:ring-[#134E4A]"
                >
                  <option value="in_use">Mort en ús actiu (embarcació amarrada)</option>
                  <option value="abandoned">Mort en desús (abandonat / sense ús)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Observador / Equip</label>
                <input
                  type="text"
                  value={observerName}
                  onChange={(e) => setObserverName(e.target.value)}
                  placeholder="Nom de l'auditor"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Latitud (GPS WGS84)</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Ex: 42.1154"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-mono bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Longitud (GPS WGS84)</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Ex: 3.1762"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-mono bg-[#FAF9F6]"
                />
              </div>
            </div>

            {/* Photographic Documentation Section (Supports Drag & Drop, File Picker & Clipboard Paste Ctrl+V) */}
            <div className="pt-4 border-t border-[#E5E5DF] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-[#134E4A] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#134E4A]" />
                  Documentació Fotogràfica Subaquàtica ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
                </label>
                <span className="text-[11px] text-[#64746B] flex items-center gap-1 bg-[#F5F5F0] px-2.5 py-1 rounded-lg border border-[#E5E5DF]">
                  <Clipboard className="w-3 h-3 text-[#134E4A]" />
                  Pots enganxar directament amb <strong>Ctrl+V</strong> o <strong>Cmd+V</strong>
                </span>
              </div>

              {copyFeedback && (
                <div className="p-2.5 bg-emerald-100 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium border border-emerald-300 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>{copyFeedback}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#C4C4B8] hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F2F2EB] transition rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-[#E9E9E0] group-hover:bg-[#134E4A] group-hover:text-white text-[#134E4A] flex items-center justify-center transition">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs text-[#134E4A] font-semibold">
                  Clica per pujar fotos o arrossega els fitxers aquí
                </div>
                <div className="text-[11px] text-[#64746B]">
                  Accepta JPG, PNG, WEBP o enganxar des del porta-retalls (captures de vídeo/càmera submarina)
                </div>
              </div>

              {/* Photos Gallery */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative group rounded-xl overflow-hidden border border-[#D1D1C7] bg-[#E9E9E0] aspect-4/3"
                    >
                      <img
                        src={photo}
                        alt={`Foto ${index + 1} de ${code}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewPhoto(photo)}
                      />
                      {index === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-[#134E4A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="p-1.5 bg-white/90 hover:bg-white text-[#134E4A] rounded-lg shadow-xs"
                          title="Ampliar foto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dimensions Section (only shown if mort is located) */}
            {presenceStatus === 'located' && (
              <div className="pt-3 border-t border-[#E5E5DF]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <label className="text-xs font-semibold text-[#134E4A] flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-[#134E4A]" />
                    Dimensions del bloc de formigó
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto">
                    {PRESET_BLOCKS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectPreset(b.id)}
                        className={`px-2.5 py-1 rounded-lg border font-mono transition ${
                          selectedPresetId === b.id
                            ? 'bg-[#134E4A] border-[#134E4A] text-white font-bold shadow-xs'
                            : 'bg-[#FAF9F6] border-[#D1D1C7] text-[#134E4A] hover:bg-[#E9E9E0]'
                        }`}
                      >
                        {b.dimensionsCm.length}x{b.dimensionsCm.width}x{b.dimensionsCm.height}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <span className="text-[11px] text-[#64746B]">Llarg (cm)</span>
                    <input
                      type="number"
                      value={dimensions.lengthCm}
                      onChange={(e) => {
                        setDimensions((prev) => ({ ...prev, lengthCm: Number(e.target.value) }));
                        setSelectedPresetId('custom');
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64746B]">Ample (cm)</span>
                    <input
                      type="number"
                      value={dimensions.widthCm}
                      onChange={(e) => {
                        setDimensions((prev) => ({ ...prev, widthCm: Number(e.target.value) }));
                        setSelectedPresetId('custom');
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64746B]">Alt (cm)</span>
                    <input
                      type="number"
                      value={dimensions.heightCm}
                      onChange={(e) => {
                        setDimensions((prev) => ({ ...prev, heightCm: Number(e.target.value) }));
                        setSelectedPresetId('custom');
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs bg-[#FAF9F6]"
                    />
                  </div>
                  <div className="bg-[#E9E9E0] p-1.5 rounded-xl border border-[#DCDCD2] flex flex-col justify-center text-center">
                    <span className="text-[10px] text-[#64746B] uppercase font-semibold">Pes submergit</span>
                    <span className="font-bold text-[#134E4A] font-mono text-xs">{hydroAssessment.submergedWeightKg} kg</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* If Mort is Not Found, show a clear guidance card instead of the 4 criteria */}
          {presenceStatus === 'not_found' && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-3xl p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <SearchX className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-amber-950 font-serif">
                    Fitxa d'Estructura No Localitzada
                  </h4>
                  <p className="text-xs text-amber-800">
                    Aquest registre s'arxivarà com a inspecció de no presència. Els 4 criteris de diagnosi de retirada no apliquen per absència del bloc físic.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
                <div className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
                  Recomanació Operativa de Gestió:
                </div>
                <p className="leading-relaxed">
                  Actualitzar el cens de sistemes de fondeig informant de la baixa de l'estructura. Es recomana fer una segona prospecció en període de calma o en un radi de 15 metres en el sentit de la dinàmica de temporals predominants abans de donar el mort per definitivament desplaçat o desintegrat.
                </p>
              </div>
            </div>
          )}

          {/* THE 4 CRITERIA (Only displayed if Mort is Located) */}
          {presenceStatus === 'located' && (
            <>
              {/* CRITERI 1: Espècies Amenaçades o Hàbitats Protegits */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E5DF] pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#134E4A] text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-base font-serif font-bold italic text-[#134E4A]">
                    Protecció d'espècies amenaçades o hàbitats protegits
                  </h3>
                </div>
                <p className="text-xs text-[#64746B] mt-1.5 leading-relaxed">
                  Justificació ecològica: Colonització per espècies de creixement lent (<em>Cystoseira spp.</em>, comunitats de coral·ligen, <em>Pinna nobilis</em>). La retirada destruiria hàbitats protegits per Directiva Europea i Gencat.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                {decisionResult.scoresBreakdown.c1_species} pts
              </span>
            </div>

            {/* Options list */}
            <div className="space-y-2.5">
              
              {/* Option A: -10 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c1Species === 'high_coverage_or_protected'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c1_species"
                  checked={c1Species === 'high_coverage_or_protected'}
                  onChange={() => setC1Species('high_coverage_or_protected')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Presència elevada (&gt;10% de cobertura) o exemplars reproductors d'espècies protegides
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      -10 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Cobertura de <em>Cystoseira / Ericaria / Gongolaria</em> &gt; 10%, presència de <em>Cladocora caespitosa</em>, o colònies de coral·ligen consolidat.
                  </p>
                </div>
              </label>

              {/* Option B: -7 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c1Species === 'low_coverage'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c1_species"
                  checked={c1Species === 'low_coverage'}
                  onChange={() => setC1Species('low_coverage')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Presència d'espècies amenaçades / d'interès en densitats inferiors al 10%
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      -7 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Exemplars aïllats d'algues fucals protegides o taques incipients de bioconstructors.
                  </p>
                </div>
              </label>

              {/* Option C: -5 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c1Species === 'renaturalized_algal'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c1_species"
                  checked={c1Species === 'renaturalized_algal'}
                  onChange={() => setC1Species('renaturalized_algal')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Presència de recobriment algal o d'organismes renaturalitzats generals
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      -5 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    El mort actua ja plenament com un escull artificial integrat (algues fotòfiles, esponges, briozous, tunicats).
                  </p>
                </div>
              </label>

              {/* Option D: 0 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c1Species === 'none'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c1_species"
                  checked={c1Species === 'none'}
                  onChange={() => setC1Species('none')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Absència d'espècies amenaçades, d'interès o hàbitats protegits
                    </span>
                    <span className="text-xs font-mono font-bold text-[#64746B] bg-[#E9E9E0] px-2.5 py-0.5 rounded-md">
                      0 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Superfície de formigó nua, amb pel·lícula bacteriana/fang o només espècies oportunistes sense valor de conservació.
                  </p>
                </div>
              </label>
            </div>

            {/* Quick Species Checklist Tag Pills */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64746B] mb-2">
                Espècies catalogades observades (selecció per a fitxa tècnica):
              </label>
              <div className="flex flex-wrap gap-2">
                {PROTECTED_SPECIES_CATALOG.map((sp) => {
                  const active = c1SelectedSpecies.includes(sp.scientificName);
                  return (
                    <button
                      key={sp.scientificName}
                      type="button"
                      onClick={() => toggleSpeciesSelection(sp.scientificName)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#134E4A] text-white border-[#134E4A] font-medium shadow-xs'
                          : 'bg-[#FAF9F6] text-[#4A4A43] border-[#D1D1C7] hover:bg-[#E9E9E0]'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>{sp.scientificName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CRITERI 2: Impacte sobre el substrat annex */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E5DF] pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#134E4A] text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-base font-serif font-bold italic text-[#134E4A]">
                    Impacte sobre el substrat annex (elements mòbils / abrasió)
                  </h3>
                </div>
                <p className="text-xs text-[#64746B] mt-1.5 leading-relaxed">
                  Justificació ecològica: Inestabilitat mecànica o elements mòbils (cadenes, garreig) generen halos d'abrasió que impedeixen que els rizomes de <em>Posidonia oceanica</em> tanquin les clarianes, augmentant la fragmentació de la praderia.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 shrink-0">
                +{decisionResult.scoresBreakdown.c2_substrate} pts
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Option A: +5 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c2Substrate === 'active_erosion_halo'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c2_substrate"
                  checked={c2Substrate === 'active_erosion_halo'}
                  onChange={() => setC2Substrate('active_erosion_halo')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Existeix "ferida" o "calva" activa a la praderia / abrasió per cadena
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-900 bg-rose-100 px-2.5 py-0.5 rounded-md">
                      +5 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Evidència directa d'erosió activa, rizomes exposats/trencats o halo de desvegetació per garreig o fregament continu de cadenes.
                  </p>
                </div>
              </label>

              {/* Option B: 0 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c2Substrate === 'none'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c2_substrate"
                  checked={c2Substrate === 'none'}
                  onChange={() => setC2Substrate('none')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Absència d'abrasió activa o desplaçament
                    </span>
                    <span className="text-xs font-mono font-bold text-[#64746B] bg-[#E9E9E0] px-2.5 py-0.5 rounded-md">
                      0 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    No s'observa cap halo d'erosió ni elements mòbils que estiguin escombrant el fons vegetal annex.
                  </p>
                </div>
              </label>
            </div>

            {/* Extra Field measurements if active */}
            {c2Substrate === 'active_erosion_halo' && (
              <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#D1D1C7] flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#134E4A]">Radi de l'halo d'abrasió:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="30"
                    value={c2HaloRadius}
                    onChange={(e) => setC2HaloRadius(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 border border-[#D1D1C7] rounded-lg bg-white font-bold text-[#134E4A] text-xs font-mono"
                  />
                  <span className="text-[#64746B] font-medium">metres</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[#4A4A43] font-medium">
                  <input
                    type="checkbox"
                    checked={c2HasMobileElements}
                    onChange={(e) => setC2HasMobileElements(e.target.checked)}
                    className="accent-[#134E4A]"
                  />
                  <span>Presència de cadenes/caps solts tocant el fons</span>
                </label>
              </div>
            )}
          </div>

          {/* CRITERI 3: Dinamisme i Risc - Tamany i fondària */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E5DF] pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#134E4A] text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-base font-serif font-bold italic text-[#134E4A]">
                    Dinamisme i risc (Tamany, pes i fondària)
                  </h3>
                </div>
                <p className="text-xs text-[#64746B] mt-1.5 leading-relaxed">
                  Justificació hidrodinàmica: Blocs de pes reduït (&lt;500 kg / &lt;100 kg alt risc) en zones someres (&lt;15 m) sotmesos a temporals ordinaris llisquen i amplien l'halo d'impacte.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                +{decisionResult.scoresBreakdown.c3_dynamism} pts
              </span>
            </div>

            {/* Switch auto physics vs manual */}
            <div className="flex items-center justify-between bg-[#E9E9E0] p-2.5 rounded-2xl border border-[#DCDCD2] text-xs">
              <span className="font-semibold text-[#134E4A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#134E4A]" />
                Mode de Càlcul del Risc
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setC3AutoFromPhysics(true)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                    c3AutoFromPhysics
                      ? 'bg-[#134E4A] text-white shadow-xs'
                      : 'bg-white text-[#134E4A] border border-[#D1D1C7]'
                  }`}
                >
                  Automàtic per Física Hidrodinàmica
                </button>
                <button
                  type="button"
                  onClick={() => setC3AutoFromPhysics(false)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                    !c3AutoFromPhysics
                      ? 'bg-[#134E4A] text-white shadow-xs'
                      : 'bg-white text-[#134E4A] border border-[#D1D1C7]'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {c3AutoFromPhysics ? (
              <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-[#134E4A]">
                  <span>Diagnosi Física Automàtica a -{depthM} m:</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#134E4A] text-white font-mono">
                    +{hydroAssessment.slidingRiskScore} punts
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#4A4A43] pt-1 font-mono">
                  <div>Pes Submergit: <strong>{hydroAssessment.submergedWeightKg} kg</strong></div>
                  <div>Velocitat u_b: <strong>{hydroAssessment.criticalBottomVelocityUb} m/s</strong></div>
                  <div>Onada necessària: <strong>{typeof hydroAssessment.criticalWaveHeightM === 'number' ? `${hydroAssessment.criticalWaveHeightM} m` : 'Improbable'}</strong></div>
                  <div>Límit rompent: <strong>{hydroAssessment.breakingWaveHeightLimitM} m</strong></div>
                </div>
                <p className="text-[#64746B] text-[11px] leading-relaxed">
                  {hydroAssessment.slidingRiskScore === 3
                    ? 'Mort de pes reduït en zona somera: una onada ordinària supera la velocitat orbital crítica generant lliscament.'
                    : hydroAssessment.slidingRiskScore === 2
                    ? 'Pes moderat: risc de mobilització durant temporals forts.'
                    : hydroAssessment.slidingRiskScore === 1
                    ? 'Risc baix: requereix temporals excepcionals per lliscar.'
                    : 'Absència de risc de desplaçament per gran inèrcia o fondària segura.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                    c3DynamismManual === 'high_risk'
                      ? 'border-[#134E4A] bg-[#FAF9F6] ring-1 ring-[#134E4A]'
                      : 'border-[#E5E5DF] hover:border-[#D1D1C7]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#134E4A] block">
                      Risc Alt (Categorització Blau): Alta mobilitat / arrossegament
                    </span>
                    <span className="text-[11px] text-[#64746B]">
                      Bloc petit (&lt;500 kg) en zona somera (&lt;15 m) amb risc imminent de moviment en temporal ordinari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      +3 punts
                    </span>
                    <input
                      type="radio"
                      name="c3_manual"
                      checked={c3DynamismManual === 'high_risk'}
                      onChange={() => setC3DynamismManual('high_risk')}
                      className="accent-[#134E4A]"
                    />
                  </div>
                </label>

                <label
                  className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                    c3DynamismManual === 'moderate_risk'
                      ? 'border-[#134E4A] bg-[#FAF9F6] ring-1 ring-[#134E4A]'
                      : 'border-[#E5E5DF] hover:border-[#D1D1C7]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#134E4A] block">
                      Risc Mitjà-Alt (Categorització Verd): Mobilització en temporals forts
                    </span>
                    <span className="text-[11px] text-[#64746B]">
                      Pes mitjà o fondària intermèdia amb risc de lliscament durant episodis d'onatge sever.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      +2 punts
                    </span>
                    <input
                      type="radio"
                      name="c3_manual"
                      checked={c3DynamismManual === 'moderate_risk'}
                      onChange={() => setC3DynamismManual('moderate_risk')}
                      className="accent-[#134E4A]"
                    />
                  </div>
                </label>

                <label
                  className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                    c3DynamismManual === 'low_risk'
                      ? 'border-[#134E4A] bg-[#FAF9F6] ring-1 ring-[#134E4A]'
                      : 'border-[#E5E5DF] hover:border-[#D1D1C7]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#134E4A] block">
                      Risc Baix (Categorització Taronja): Mobilitat només en temporals extrems
                    </span>
                    <span className="text-[11px] text-[#64746B]">
                      Bloc de bon pes o fondària &gt;15 m amb estabilitat general satisfactòria.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      +1 punt
                    </span>
                    <input
                      type="radio"
                      name="c3_manual"
                      checked={c3DynamismManual === 'low_risk'}
                      onChange={() => setC3DynamismManual('low_risk')}
                      className="accent-[#134E4A]"
                    />
                  </div>
                </label>

                <label
                  className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                    c3DynamismManual === 'no_risk'
                      ? 'border-[#134E4A] bg-[#FAF9F6] ring-1 ring-[#134E4A]'
                      : 'border-[#E5E5DF] hover:border-[#D1D1C7]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#134E4A] block">
                      Absència de Risc (Categorització Vermell): Bloc totalment estable
                    </span>
                    <span className="text-[11px] text-[#64746B]">
                      Gran inèrcia per pes elevat o fondària profunda (&gt;20 m); cap risc de desplaçament.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-mono font-bold text-[#64746B] bg-[#E9E9E0] px-2 py-0.5 rounded-md">
                      0 punts
                    </span>
                    <input
                      type="radio"
                      name="c3_manual"
                      checked={c3DynamismManual === 'no_risk'}
                      onChange={() => setC3DynamismManual('no_risk')}
                      className="accent-[#134E4A]"
                    />
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* CRITERI 4: Estabilitat i integració en l'hàbitat */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E5DF] pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#134E4A] text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-base font-serif font-bold italic text-[#134E4A]">
                    Estabilitat i integració en l'hàbitat (enterrament i rizoma)
                  </h3>
                </div>
                <p className="text-xs text-[#64746B] mt-1.5 leading-relaxed">
                  Justificació ecològica: Blocs enterrats o amb rizoma de <em>Posidonia</em> crescut en contacte directe. La seva extracció crearia una obertura a la mata colonitzable per invasores o marmites d'erosió.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#E9E9E0] text-[#134E4A] border border-[#D1D1C7] shrink-0">
                {decisionResult.scoresBreakdown.c4_stability > 0
                  ? `+${decisionResult.scoresBreakdown.c4_stability}`
                  : decisionResult.scoresBreakdown.c4_stability}{' '}
                pts
              </span>
            </div>

            <div className="space-y-2.5">
              
              {/* Option A: -5 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c4Stability === 'fixed_by_roots_or_sediment'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c4_stability"
                  checked={c4Stability === 'fixed_by_roots_or_sediment'}
                  onChange={() => setC4Stability('fixed_by_roots_or_sediment')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Bloc fixat pel sediment o arrels/rizomes de la praderia (mata cohesionada)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      -5 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    El rizoma ha crescut adherit o envoltant el bloc. La retirada desestabilitzaria el llit marí i crearia marmites d'erosió.
                  </p>
                </div>
              </label>

              {/* Option B: -5 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c4Stability === 'not_buried_generates_void'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c4_stability"
                  checked={c4Stability === 'not_buried_generates_void'}
                  onChange={() => setC4Stability('not_buried_generates_void')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Bloc no enterrat, no toca rizoma, però la seva retirada SÍ generaria un buit danyós
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      -5 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    La remoció mecànica alteraria la dinàmica de corrents locals o deixaria una depressió inestable.
                  </p>
                </div>
              </label>

              {/* Option C: +5 pts */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c4Stability === 'not_buried_no_void'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c4_stability"
                  checked={c4Stability === 'not_buried_no_void'}
                  onChange={() => setC4Stability('not_buried_no_void')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Bloc no enterrat, no toca rizoma, i la seva retirada NO genera espai buit perjudicial
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md">
                      +5 punts
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Bloc lliure sobre sorra o grava sense arrelament. Extracció neta viable sense risc de resuspensió severa.
                  </p>
                </div>
              </label>

              {/* Option D: +1 pt */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                  c4Stability === 'large_deep_stable'
                    ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                    : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="c4_stability"
                  checked={c4Stability === 'large_deep_stable'}
                  onChange={() => setC4Stability('large_deep_stable')}
                  className="mt-1 accent-[#134E4A]"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#134E4A]">
                      Bloc gran o profund (estable)
                    </span>
                    <span className="text-xs font-mono font-bold text-[#64746B] bg-[#E9E9E0] px-2.5 py-0.5 rounded-md">
                      +1 punt
                    </span>
                  </div>
                  <p className="text-xs text-[#64746B]">
                    Bloc de gran tonatge o fondària elevada amb alta inèrcia.
                  </p>
                </div>
              </label>
            </div>
          </div>
          </>
          )}

          {/* Observations & Field Notes */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7]">
            <label className="block text-xs font-serif font-bold italic text-[#134E4A] mb-2">
              Observacions generals de camp / Notes per a l'acta
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Ex: Estat de les anelles de fondeig, tipus de fons marí adjacent, presència de fauna associada..."
              className="w-full px-3.5 py-2.5 border border-[#D1D1C7] rounded-2xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
            />
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Decision Result Output */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <DecisionCard
              result={decisionResult}
              onSaveToInventory={handleSave}
              onPrintReport={handlePrint}
              isSaved={isSaved}
            />
          </div>
        </div>

      </div>

      {/* Lightbox / Enlarged Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition z-10"
              title="Tancar imatge"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Fotografia subaquàtica ampliada"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
