import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
  MortEvaluationRecord,
  BlockDimensions,
  BlockItem,
  PresenceStatus,
  StructureType,
  OtherStructureDetails,
  BlockConnectionMode,
  HydrodynamicAssessment,
} from '../types';
import { evaluateDecision } from '../utils/decisionEngine';
import { assessHydrodynamics, calculateSubmergedWeight } from '../utils/hydrodynamics';
import { PRESET_BLOCKS, PROTECTED_SPECIES_CATALOG } from '../data/protocolStandards';
import { compressImageToMaxSize, generateThumbnail, cacheFullPhotos, formatBytes } from '../utils/imageCompressor';
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
  Layers,
  Plus,
  Minus,
  Camera,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Clipboard,
  AlertCircle,
  Eye,
  X,
  SearchX,
  Copy,
  CheckCheck,
  FileText,
  Link2,
  GitMerge,
  Split,
} from 'lucide-react';

interface CalculatorProps {
  onSaveEvaluation: (record: MortEvaluationRecord) => void;
  onPrintReport: (record: MortEvaluationRecord) => void;
  initialRecord?: MortEvaluationRecord | null;
  existingLocations?: string[];
}

export const COMMON_COASTAL_LOCATIONS = [
  "Cala Montgó (L'Escala)",
  "Cala Montgó (Torroella de Montgrí)",
  "Cala Joncols (Roses)",
  "Cala Pelosa (Roses)",
  "Cala Murtra (Roses)",
  "Cala Rustella (Roses)",
  "Cala Calís (Roses)",
  "Cala Culip (Cadaqués)",
  "Cala Portlligat (Cadaqués)",
  "Cala Guillola (Cadaqués)",
  "Cala Jugadora (Cadaqués)",
  "Cala Bona (Tossa de Mar)",
  "Cala Pola (Tossa de Mar)",
  "Cala Giverola (Tossa de Mar)",
  "Cala Futadera (Tossa de Mar)",
  "Cala Salionç (Tossa de Mar)",
  "Cala Castell (Palamós)",
  "Cala S'Alguer (Palamós)",
  "Cala Estreta (Palamós)",
  "Cala Margarida (Palamós)",
  "Cala Fosca (Palamós)",
  "Cala Pedrosa (Torroella de Montgrí)",
  "Cala Ferriol (Torroella de Montgrí)",
  "Illes Medes - La Meda Gran",
  "Illes Medes - La Meda Petita",
  "Illes Medes - Els Tascons",
  "Illes Medes - El Carall Bernat",
  "Illes Medes - El Salpatx",
  "Cala Aiguablava (Begur)",
  "Cala Sa Tuna (Begur)",
  "Cala Sa Riera (Begur)",
  "Cala d'Aiguafreda (Begur)",
  "Cala d'Illa Roja (Begur)",
  "Cala Fornells (Begur)",
  "Cala Tamariu (Palafrugell)",
  "Cala Port Bo (Calella de Palafrugell)",
  "Cala Golfet (Calella de Palafrugell)",
  "Cala Sant Roc (Calella de Palafrugell)",
  "Port de la Selva - Cala Tamariua",
  "Port de la Selva - Cala Tavallera",
  "Llançà - Platja de Grifeu",
  "Llançà - Cala Garbet",
  "Cadaqués - Badia de Cadaqués",
  "Cap de Creus - Cala Fredosa",
  "Sant Feliu de Guíxols - Cala Jonca",
  "Sant Feliu de Guíxols - Cala Maset",
  "Sitges - Cala Morisca (Garraf)",
  "Sitges - Platja de Terramar",
  "Vilanova i la Geltrú",
  "Tarragona - Cala Romana",
  "L'Ametlla de Mar - Cala Calafató",
  "L'Ametlla de Mar - Cala Vidre",
  "L'Ametlla de Mar - Cala Forn",
  "L'Ampolla - Cala Maria",
  "Delta de l'Ebre - Badia dels Alfacs",
  "Delta de l'Ebre - Badia del Fangar",
  "Menorca - Cala Macarella",
  "Menorca - Cala Galdana",
  "Mallorca - Cala Figuera",
  "Mallorca - Cala d'Or",
  "Formentera - Cala Saona",
  "Eivissa - Cala Vadella",
];

const OTHER_STRUCTURE_QUICK_PRESETS = [
  "Àncora d'almirallat",
  "Àncora Danforth / Hall",
  "Estructura metàl·lica / Xassís",
  "Pneumàtic farcit de formigó",
  "Bidó amb formigó",
  "Pedra natural / Escullera",
  "Restes d'orri / caps i cadenat",
  "Bloc irregular de runa",
];

const createDefaultBlockItem = (
  number: number,
  baseRecord?: Partial<MortEvaluationRecord> | null,
  templateBlock?: BlockItem
): BlockItem => {
  if (templateBlock) {
    return {
      ...templateBlock,
      id: `block_${number}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blockNumber: number,
      label: `Mort ${number}`,
    };
  }

  const defaultDim: BlockDimensions = baseRecord?.dimensions || {
    lengthCm: 80,
    widthCm: 80,
    heightCm: 40,
    concreteDensityKgM3: 2400,
  };

  return {
    id: `block_${number}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    blockNumber: number,
    label: `Mort ${number}`,
    structureType: 'concrete_block',
    dimensions: defaultDim,
    presetId: 'block_80x80x40',
    otherStructure: {
      customTypeDescription: '',
      estimatedVolumeM3: 0.1,
      estimatedWeightAirKg: 240,
      estimatedSubmergedWeightKg: 137,
      structureNotes: '',
    },
    c1_speciesPresence: baseRecord?.c1_speciesPresence || 'none',
    c1_selectedSpecies: [],
    c1_speciesNotes: baseRecord?.c1_speciesNotes || '',
    c2_substrateImpact: baseRecord?.c2_substrateImpact || 'active_erosion_halo',
    c2_hasMobileElements: baseRecord?.c2_hasMobileElements ?? true,
    c2_haloRadiusM: baseRecord?.c2_haloRadiusM ?? 2.5,
    c2_notes: baseRecord?.c2_notes || '',
    c3_dynamismRisk: baseRecord?.c3_dynamismRisk || 'high_risk',
    c3_useCustomPhysics: baseRecord?.c3_useCustomPhysics ?? true,
    c4_stabilityIntegration: baseRecord?.c4_stabilityIntegration || 'not_buried_no_void',
    c4_notes: baseRecord?.c4_notes || '',
    notes: '',
  };
};

export const Calculator: React.FC<CalculatorProps> = ({
  onSaveEvaluation,
  onPrintReport,
  initialRecord,
  existingLocations = [],
}) => {
  // General Info
  const [code, setCode] = useState<string>(initialRecord?.code || '');
  const [date, setDate] = useState<string>(
    initialRecord?.date || new Date().toISOString().split('T')[0]
  );
  const [locationName, setLocationName] = useState<string>(
    initialRecord?.locationName || ''
  );
  const [observerName, setObserverName] = useState<string>(
    initialRecord?.observerName || 'W&X'
  );
  const [depthInput, setDepthInput] = useState<string>(
    initialRecord?.depthM !== undefined ? String(initialRecord.depthM).replace('.', ',') : ''
  );
  const depthM = useMemo(() => {
    const val = parseFloat(depthInput.replace(',', '.'));
    return isNaN(val) ? 8 : val;
  }, [depthInput]);

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
    initialRecord?.latitude ? String(initialRecord.latitude).replace('.', ',') : ''
  );
  const [longitude, setLongitude] = useState<string>(
    initialRecord?.longitude ? String(initialRecord.longitude).replace('.', ',') : ''
  );
  const [generalNotes, setGeneralNotes] = useState<string>(
    initialRecord?.generalNotes || ''
  );

  // Multi-Block State
  const [numberOfBlocks, setNumberOfBlocks] = useState<number>(
    initialRecord?.numberOfBlocks || (initialRecord?.blocks && initialRecord.blocks.length > 0 ? initialRecord.blocks.length : 1)
  );

  const [connectionMode, setConnectionMode] = useState<BlockConnectionMode>(
    initialRecord?.connectionMode || 'chained'
  );

  const [blocks, setBlocks] = useState<BlockItem[]>(() => {
    if (initialRecord?.blocks && initialRecord.blocks.length > 0) {
      return initialRecord.blocks.map((b, idx) => ({
        ...createDefaultBlockItem(idx + 1, initialRecord),
        ...b,
        blockNumber: idx + 1,
        label: b.label || `Mort ${idx + 1}`,
        structureType: b.structureType || 'concrete_block',
        dimensions: b.dimensions || initialRecord.dimensions || { lengthCm: 80, widthCm: 80, heightCm: 40, concreteDensityKgM3: 2400 },
        otherStructure: b.otherStructure || {
          customTypeDescription: '',
          estimatedVolumeM3: 0.1,
          estimatedWeightAirKg: 240,
          estimatedSubmergedWeightKg: 137,
          structureNotes: '',
        },
        c1_speciesPresence: b.c1_speciesPresence || initialRecord.c1_speciesPresence || 'none',
        c1_selectedSpecies: b.c1_selectedSpecies || [],
        c1_speciesNotes: b.c1_speciesNotes || initialRecord.c1_speciesNotes || '',
        c2_substrateImpact: b.c2_substrateImpact || initialRecord.c2_substrateImpact || 'active_erosion_halo',
        c2_hasMobileElements: b.c2_hasMobileElements ?? initialRecord.c2_hasMobileElements ?? true,
        c2_haloRadiusM: b.c2_haloRadiusM ?? initialRecord.c2_haloRadiusM ?? 2.5,
        c2_notes: b.c2_notes || initialRecord.c2_notes || '',
        c3_dynamismRisk: b.c3_dynamismRisk || initialRecord.c3_dynamismRisk || 'high_risk',
        c3_useCustomPhysics: b.c3_useCustomPhysics ?? initialRecord.c3_useCustomPhysics ?? true,
        c4_stabilityIntegration: b.c4_stabilityIntegration || initialRecord.c4_stabilityIntegration || 'not_buried_no_void',
        c4_notes: b.c4_notes || initialRecord.c4_notes || '',
        notes: b.notes || '',
      }));
    }
    return [createDefaultBlockItem(1, initialRecord)];
  });

  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Combine locations for suggestions
  const locationSuggestions = useMemo(() => {
    const combined = new Set([...existingLocations, ...COMMON_COASTAL_LOCATIONS]);
    return Array.from(combined);
  }, [existingLocations]);

  // Photos State
  const [photos, setPhotos] = useState<string[]>(() => {
    if (initialRecord?.photos && initialRecord.photos.length > 0) {
      return initialRecord.photos;
    }
    if (initialRecord?.photoUrl) {
      return [initialRecord.photoUrl];
    }
    return [];
  });
  const [thumbnails, setThumbnails] = useState<string[]>(() => {
    if (initialRecord?.thumbnails && initialRecord.thumbnails.length > 0) {
      return initialRecord.thumbnails;
    }
    return [];
  });
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process & compress photos
  const processAndAddFiles = async (files: FileList | File[]) => {
    setIsProcessingPhotos(true);
    let addedCount = 0;
    const compressionNotes: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files instanceof FileList ? files.item(i) : files[i];
      if (!file || !file.type.startsWith('image/')) continue;

      try {
        const result = await compressImageToMaxSize(file, 1024 * 1024); // max 1MB
        const thumb = await generateThumbnail(result.dataUrl, 200, 0.65);

        setPhotos((prev) => [...prev, result.dataUrl]);
        setThumbnails((prev) => [...prev, thumb]);
        addedCount++;

        if (result.wasCompressed) {
          compressionNotes.push(
            `Reduïda de ${formatBytes(result.originalSize)} a ${formatBytes(result.finalSize)} (≤1MB)`
          );
        }
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }

    setIsProcessingPhotos(false);

    if (addedCount > 0) {
      if (compressionNotes.length > 0) {
        setCopyFeedback(`Foto(s) afegida(s) i comprimida(s) a ≤1MB (${compressionNotes[0]})`);
      } else {
        setCopyFeedback(`${addedCount} foto(s) afegida(s) correctament (≤1MB) amb miniatura`);
      }
      setTimeout(() => setCopyFeedback(null), 4000);
    }
  };

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        await processAndAddFiles(imageFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processAndAddFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };

  // Block count update
  const handleBlockCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(20, count));
    setNumberOfBlocks(newCount);
    setBlocks((prev) => {
      const current = [...prev];
      if (newCount > current.length) {
        for (let i = current.length + 1; i <= newCount; i++) {
          current.push(createDefaultBlockItem(i, initialRecord, current[0]));
        }
      } else if (newCount < current.length) {
        return current.slice(0, newCount);
      }
      return current;
    });
    if (activeBlockIndex >= newCount) {
      setActiveBlockIndex(newCount - 1);
    }
  };

  // Block field modifier helper
  const updateActiveBlock = (updater: (prev: BlockItem) => BlockItem) => {
    setBlocks((prev) => {
      const next = [...prev];
      const idx = activeBlockIndex < next.length ? activeBlockIndex : 0;
      if (next[idx]) {
        next[idx] = updater(next[idx]);
      }
      return next;
    });
  };

  const updateActiveBlockField = <K extends keyof BlockItem>(field: K, value: BlockItem[K]) => {
    updateActiveBlock((b) => ({ ...b, [field]: value }));
  };

  // Dimensions & Presets for active block
  const updateActiveBlockDimensions = (newDim: Partial<BlockDimensions>, presetId?: string) => {
    updateActiveBlock((b) => ({
      ...b,
      dimensions: {
        ...b.dimensions,
        ...newDim,
      },
      presetId: presetId !== undefined ? presetId : 'custom',
    }));
  };

  const handleSelectPresetForActiveBlock = (presetId: string) => {
    const p = PRESET_BLOCKS.find((b) => b.id === presetId);
    if (p) {
      updateActiveBlockDimensions({
        lengthCm: p.dimensionsCm.length,
        widthCm: p.dimensionsCm.width,
        heightCm: p.dimensionsCm.height,
      }, presetId);
    }
  };

  // Other Structure updater
  const updateActiveOtherStructure = (updates: Partial<OtherStructureDetails>) => {
    updateActiveBlock((b) => {
      const current = b.otherStructure || {
        customTypeDescription: '',
        estimatedVolumeM3: 0.1,
        estimatedWeightAirKg: 240,
        estimatedSubmergedWeightKg: 137,
        structureNotes: '',
      };
      const merged: OtherStructureDetails = {
        ...current,
        ...updates,
      };

      // Auto-compute submerged weight if volume and air weight are supplied and submerged weight not manually overridden
      if (updates.estimatedVolumeM3 !== undefined || updates.estimatedWeightAirKg !== undefined) {
        if (updates.estimatedSubmergedWeightKg === undefined) {
          const vol = merged.estimatedVolumeM3 || 0.1;
          const air = merged.estimatedWeightAirKg || (vol * 2400);
          merged.estimatedSubmergedWeightKg = Math.max(1, Math.round((air - vol * 1025) * 10) / 10);
        }
      }

      return {
        ...b,
        otherStructure: merged,
      };
    });
  };

  // Copy criteria helpers
  const handleCopyFromBlock1 = () => {
    if (blocks.length <= 1 || activeBlockIndex === 0) return;
    const b1 = blocks[0];
    updateActiveBlock((current) => ({
      ...current,
      structureType: b1.structureType,
      dimensions: { ...b1.dimensions },
      presetId: b1.presetId,
      otherStructure: b1.otherStructure ? { ...b1.otherStructure } : undefined,
      c1_speciesPresence: b1.c1_speciesPresence,
      c1_selectedSpecies: [...(b1.c1_selectedSpecies || [])],
      c1_speciesNotes: b1.c1_speciesNotes,
      c2_substrateImpact: b1.c2_substrateImpact,
      c2_hasMobileElements: b1.c2_hasMobileElements,
      c2_haloRadiusM: b1.c2_haloRadiusM,
      c2_notes: b1.c2_notes,
      c3_dynamismRisk: b1.c3_dynamismRisk,
      c3_useCustomPhysics: b1.c3_useCustomPhysics,
      c4_stabilityIntegration: b1.c4_stabilityIntegration,
      c4_notes: b1.c4_notes,
      notes: b1.notes,
    }));
    setActionFeedback(`Criteris i paràmetres del Mort 1 copiats a ${blocks[activeBlockIndex]?.label || `Mort ${activeBlockIndex + 1}`}`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleApplyToAllBlocks = () => {
    const src = blocks[activeBlockIndex] || blocks[0];
    setBlocks((prev) =>
      prev.map((b, idx) => ({
        ...b,
        structureType: src.structureType,
        dimensions: { ...src.dimensions },
        presetId: src.presetId,
        otherStructure: src.otherStructure ? { ...src.otherStructure } : undefined,
        c1_speciesPresence: src.c1_speciesPresence,
        c1_selectedSpecies: [...(src.c1_selectedSpecies || [])],
        c1_speciesNotes: src.c1_speciesNotes,
        c2_substrateImpact: src.c2_substrateImpact,
        c2_hasMobileElements: src.c2_hasMobileElements,
        c2_haloRadiusM: src.c2_haloRadiusM,
        c2_notes: src.c2_notes,
        c3_dynamismRisk: src.c3_dynamismRisk,
        c3_useCustomPhysics: src.c3_useCustomPhysics,
        c4_stabilityIntegration: src.c4_stabilityIntegration,
        c4_notes: src.c4_notes,
        notes: idx === activeBlockIndex ? b.notes : src.notes,
      }))
    );
    setActionFeedback(`Criteris de ${src.label || `Mort ${activeBlockIndex + 1}`} aplicats a tots els ${blocks.length} morts.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const toggleSpeciesSelection = (spName: string) => {
    updateActiveBlock((b) => {
      const current = b.c1_selectedSpecies || [];
      const next = current.includes(spName) ? current.filter((s) => s !== spName) : [...current, spName];
      let presence = b.c1_speciesPresence;
      if (next.length > 0 && presence === 'none') {
        presence = 'high_coverage_or_protected';
      }
      return {
        ...b,
        c1_selectedSpecies: next,
        c1_speciesPresence: presence,
      };
    });
  };

  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Combined Physics when blocks are concatenated in a chain
  const combinedPhysics = useMemo(() => {
    let totalVolumeM3 = 0;
    let totalWeightAirKg = 0;
    let totalSubmergedWeightKg = 0;

    blocks.forEach((b) => {
      if (b.structureType === 'other_structure' && b.otherStructure) {
        const v = b.otherStructure.estimatedVolumeM3 ?? 0.1;
        const wAir = b.otherStructure.estimatedWeightAirKg ?? 240;
        const wSub = b.otherStructure.estimatedSubmergedWeightKg ?? 137;
        totalVolumeM3 += v;
        totalWeightAirKg += wAir;
        totalSubmergedWeightKg += wSub;
      } else {
        const calc = calculateSubmergedWeight(
          b.dimensions.lengthCm,
          b.dimensions.widthCm,
          b.dimensions.heightCm,
          b.dimensions.concreteDensityKgM3 || 2400
        );
        totalVolumeM3 += calc.volumeM3;
        totalWeightAirKg += calc.weightAirKg;
        totalSubmergedWeightKg += calc.submergedWeightKg;
      }
    });

    totalVolumeM3 = Math.round(totalVolumeM3 * 1000) / 1000;
    totalWeightAirKg = Math.round(totalWeightAirKg * 10) / 10;
    totalSubmergedWeightKg = Math.round(totalSubmergedWeightKg * 10) / 10;

    const combinedHydro = assessHydrodynamics(
      { lengthCm: 0, widthCm: 0, heightCm: 0, concreteDensityKgM3: 2400 },
      depthM,
      9,
      {
        volumeM3: totalVolumeM3,
        weightAirKg: totalWeightAirKg,
        submergedWeightKg: totalSubmergedWeightKg,
      }
    );

    return {
      totalVolumeM3,
      totalWeightAirKg,
      totalSubmergedWeightKg,
      combinedHydro,
    };
  }, [blocks, depthM]);

  // Compute Hydrodynamics and Diagnostics for EVERY block:
  // - If connectionMode === 'chained' and numberOfBlocks > 1:
  //   Diagnosi com si fos un sol mort que suma el pes de tots
  // - If connectionMode === 'isolated' or numberOfBlocks === 1:
  //   Diagnosi dels morts per separat
  const evaluatedBlocks = useMemo<BlockItem[]>(() => {
    const isChained = connectionMode === 'chained' && blocks.length > 1;

    return blocks.map((b, idx) => {
      // 1. Hydrodynamics (individual vs combined)
      let indivHydro: HydrodynamicAssessment;
      if (b.structureType === 'other_structure' && b.otherStructure) {
        indivHydro = assessHydrodynamics(b.dimensions, depthM, 9, {
          volumeM3: b.otherStructure.estimatedVolumeM3,
          weightAirKg: b.otherStructure.estimatedWeightAirKg,
          submergedWeightKg: b.otherStructure.estimatedSubmergedWeightKg,
        });
      } else {
        indivHydro = assessHydrodynamics(b.dimensions, depthM, 9);
      }

      const effectiveHydro = isChained ? combinedPhysics.combinedHydro : indivHydro;

      // 2. Dynamic risk
      let effectiveC3: DynamismRiskOption = 'high_risk';
      if (b.c3_useCustomPhysics === false) {
        effectiveC3 = b.c3_dynamismRisk || 'high_risk';
      } else {
        if (effectiveHydro.slidingRiskScore === 3) effectiveC3 = 'high_risk';
        else if (effectiveHydro.slidingRiskScore === 2) effectiveC3 = 'moderate_risk';
        else if (effectiveHydro.slidingRiskScore === 1) effectiveC3 = 'low_risk';
        else effectiveC3 = 'no_risk';
      }

      // 3. Evaluate Decision
      const res = evaluateDecision(
        presenceStatus === 'not_found' ? 'none' : (b.c1_speciesPresence || 'none'),
        presenceStatus === 'not_found' ? 'none' : (b.c2_substrateImpact || 'active_erosion_halo'),
        effectiveC3,
        presenceStatus === 'not_found' ? 'not_buried_no_void' : (b.c4_stabilityIntegration || 'not_buried_no_void'),
        presenceStatus === 'not_found' ? false : (b.c2_hasMobileElements ?? true),
        presenceStatus === 'not_found'
      );

      return {
        ...b,
        blockNumber: idx + 1,
        label: b.label || `Mort ${idx + 1}`,
        c3_dynamismRisk: effectiveC3,
        hydrodynamics: effectiveHydro,
        result: res,
      };
    });
  }, [blocks, depthM, presenceStatus, connectionMode, combinedPhysics]);

  // Active block currently being viewed/edited
  const activeBlock = evaluatedBlocks[activeBlockIndex] || evaluatedBlocks[0] || {
    id: 'block_1',
    blockNumber: 1,
    label: 'Mort 1',
    structureType: 'concrete_block',
    dimensions: { lengthCm: 80, widthCm: 80, heightCm: 40, concreteDensityKgM3: 2400 },
    presetId: 'block_80x80x40',
    c1_speciesPresence: 'none',
    c2_substrateImpact: 'active_erosion_halo',
    c2_hasMobileElements: true,
    c3_dynamismRisk: 'high_risk',
    c3_useCustomPhysics: true,
    c4_stabilityIntegration: 'not_buried_no_void',
  };

  const rawActiveBlock = blocks[activeBlockIndex] || blocks[0];
  const dimensions = rawActiveBlock.dimensions || { lengthCm: 80, widthCm: 80, heightCm: 40, concreteDensityKgM3: 2400 };
  const hydroAssessment = activeBlock.hydrodynamics || assessHydrodynamics(dimensions, depthM, 9);
  const decisionResult = activeBlock.result || evaluateDecision(
    rawActiveBlock.c1_speciesPresence || 'none',
    rawActiveBlock.c2_substrateImpact || 'active_erosion_halo',
    'high_risk',
    rawActiveBlock.c4_stabilityIntegration || 'not_buried_no_void',
    rawActiveBlock.c2_hasMobileElements ?? true,
    presenceStatus === 'not_found'
  );

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
    blocks,
    numberOfBlocks,
    connectionMode,
  ]);

  const buildCurrentRecord = (): MortEvaluationRecord => {
    const parsedLat = latitude ? parseFloat(String(latitude).replace(',', '.')) : undefined;
    const parsedLng = longitude ? parseFloat(String(longitude).replace(',', '.')) : undefined;
    const recordId = initialRecord?.id || `mort_${Date.now()}`;

    if (photos.length > 0) {
      cacheFullPhotos(recordId, photos);
    }

    const firstBlock = evaluatedBlocks[0] || activeBlock;

    return {
      id: recordId,
      code: code || 'codi bloc/boia o waypoint',
      date,
      locationName: locationName || 'Nom cala',
      latitude: isNaN(parsedLat as number) ? undefined : parsedLat,
      longitude: isNaN(parsedLng as number) ? undefined : parsedLng,
      depthM,
      usageStatus,
      presenceStatus,
      notFoundReason: presenceStatus === 'not_found' ? notFoundReason : undefined,
      numberOfBlocks,
      connectionMode,
      dimensions: firstBlock.dimensions || dimensions,
      blocks: evaluatedBlocks,
      c1_speciesPresence: presenceStatus === 'not_found' ? 'none' : firstBlock.c1_speciesPresence,
      c1_speciesNotes: firstBlock.c1_speciesNotes || (firstBlock.c1_selectedSpecies && firstBlock.c1_selectedSpecies.length > 0 ? firstBlock.c1_selectedSpecies.join(', ') : undefined),
      c2_substrateImpact: presenceStatus === 'not_found' ? 'none' : firstBlock.c2_substrateImpact,
      c2_hasMobileElements: presenceStatus === 'not_found' ? false : (firstBlock.c2_hasMobileElements ?? true),
      c2_haloRadiusM: firstBlock.c2_haloRadiusM,
      c2_notes: firstBlock.c2_notes,
      c3_dynamismRisk: firstBlock.c3_dynamismRisk,
      c3_useCustomPhysics: firstBlock.c3_useCustomPhysics,
      c4_stabilityIntegration: presenceStatus === 'not_found' ? 'not_buried_no_void' : firstBlock.c4_stabilityIntegration,
      c4_notes: firstBlock.c4_notes,
      result: firstBlock.result || decisionResult,
      hydrodynamics: connectionMode === 'chained' && numberOfBlocks > 1 ? combinedPhysics.combinedHydro : (firstBlock.hydrodynamics || hydroAssessment),
      observerName,
      generalNotes: generalNotes || firstBlock.notes,
      photoUrl: photos[0] || undefined,
      photos: photos.length > 0 ? photos : undefined,
      thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
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

  // Active block criteria values
  const activeC1Species = rawActiveBlock.c1_speciesPresence || 'none';
  const activeC1SelectedSpecies = rawActiveBlock.c1_selectedSpecies || [];
  const activeC1Notes = rawActiveBlock.c1_speciesNotes || '';

  const activeC2Substrate = rawActiveBlock.c2_substrateImpact || 'active_erosion_halo';
  const activeC2HasMobile = rawActiveBlock.c2_hasMobileElements ?? true;
  const activeC2HaloRadius = rawActiveBlock.c2_haloRadiusM ?? 2.5;
  const activeC2Notes = rawActiveBlock.c2_notes || '';

  const activeC3Auto = rawActiveBlock.c3_useCustomPhysics ?? true;
  const activeC3Manual = rawActiveBlock.c3_dynamismRisk || 'high_risk';

  const activeC4Stability = rawActiveBlock.c4_stabilityIntegration || 'not_buried_no_void';
  const activeC4Notes = rawActiveBlock.c4_notes || '';

  const activeBlockNotes = rawActiveBlock.notes || '';
  const activeStructureType: StructureType = rawActiveBlock.structureType || 'concrete_block';
  const activeOtherStructure = rawActiveBlock.otherStructure || {
    customTypeDescription: '',
    estimatedVolumeM3: 0.1,
    estimatedWeightAirKg: 240,
    estimatedSubmergedWeightKg: 137,
    structureNotes: '',
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
            <div className="text-xs text-white/70 uppercase tracking-wider font-semibold flex items-center gap-2">
              <span>Puntuació Protocol:</span>
              {numberOfBlocks > 1 && (
                <span className="bg-white/20 text-white font-mono px-2 py-0.5 rounded text-[11px]">
                  {activeBlock.label || `Mort ${activeBlockIndex + 1}`} ({activeBlockIndex + 1}/{numberOfBlocks})
                </span>
              )}
            </div>
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
            1. Espècies: <strong className={decisionResult.scoresBreakdown.c1_species < 0 ? 'text-emerald-300' : 'text-white'}>{decisionResult.scoresBreakdown.c1_species}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            2. Substrat: <strong className={decisionResult.scoresBreakdown.c2_substrate > 0 ? 'text-amber-300' : 'text-white'}>+{decisionResult.scoresBreakdown.c2_substrate}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            3. Dinamisme: <strong className={decisionResult.scoresBreakdown.c3_dynamism > 0 ? 'text-amber-300' : 'text-white'}>+{decisionResult.scoresBreakdown.c3_dynamism}</strong>
          </span>
          <span className="bg-white/10 px-2.5 py-1 rounded-lg text-white/90 border border-white/15 whitespace-nowrap">
            4. Estabilitat: <strong className={decisionResult.scoresBreakdown.c4_stability < 0 ? 'text-emerald-300' : decisionResult.scoresBreakdown.c4_stability > 0 ? 'text-amber-300' : 'text-white'}>
              {decisionResult.scoresBreakdown.c4_stability > 0 ? `+${decisionResult.scoresBreakdown.c4_stability}` : decisionResult.scoresBreakdown.c4_stability}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Form Inputs and Criteria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Identification & Independent Evaluation Criteria */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 0: Identificació del Mort i Fons */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E5DF] pb-3">
              <h3 className="text-base font-serif font-bold italic text-[#134E4A] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#134E4A]" />
                Dades de la Inspecció i Caracterització
              </h3>
              <span className="text-xs font-mono text-[#64746B] uppercase tracking-wider">v2.5 • Campanya Subaquàtica</span>
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
                  placeholder="codi bloc/boia o waypoint"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">
                  Localització / Cala (Suggereix en escriure)
                </label>
                <input
                  type="text"
                  list="location-datalist"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Nom cala"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
                <datalist id="location-datalist">
                  {locationSuggestions.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#134E4A]">Fondària (m)</label>
                  <span className="text-[10px] text-[#7A8A7C]">Accepta coma (ex: 8,5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={depthInput}
                    onChange={(e) => setDepthInput(e.target.value)}
                    placeholder="escriu fondaria"
                    className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-[#134E4A] focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                  />
                  <span className="text-[#64746B] font-medium font-mono text-[11px]">metres</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#134E4A] mb-1">Nombre de morts / blocs</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBlockCountChange(numberOfBlocks - 1)}
                    disabled={numberOfBlocks <= 1}
                    className="w-8 h-8 rounded-lg bg-[#E9E9E0] hover:bg-[#DCDCD2] disabled:opacity-40 text-[#134E4A] font-bold flex items-center justify-center transition"
                    title="Reduir nombre de morts"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={numberOfBlocks}
                    onChange={(e) => handleBlockCountChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-center text-[#134E4A] focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                  />
                  <button
                    type="button"
                    onClick={() => handleBlockCountChange(numberOfBlocks + 1)}
                    className="w-8 h-8 rounded-lg bg-[#134E4A] hover:bg-[#0f3e3b] text-white font-bold flex items-center justify-center transition"
                    title="Afegir un altre mort"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Selector de Concatenats amb cadena vs Aïllats (al costat de Nombre de morts) */}
              <div className={numberOfBlocks > 1 ? "col-span-1 sm:col-span-2 lg:col-span-2 bg-[#FAF9F6] p-3 rounded-2xl border border-[#D1D1C7]" : ""}>
                <label className="block font-semibold text-[#134E4A] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#134E4A]" />
                    Disposició / Connexió dels morts
                  </span>
                  {numberOfBlocks > 1 && (
                    <span className="text-[10px] font-mono text-[#64746B]">
                      {connectionMode === 'chained' ? 'Solidaris (suma de pesos)' : 'Aïllats (diagnosi individual)'}
                    </span>
                  )}
                </label>
                {numberOfBlocks > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConnectionMode('chained')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                        connectionMode === 'chained'
                          ? 'bg-[#134E4A] border-[#134E4A] text-white font-bold shadow-xs ring-2 ring-[#134E4A]/30'
                          : 'bg-white border-[#D1D1C7] text-[#134E4A] hover:bg-[#F5F5F0]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${connectionMode === 'chained' ? 'bg-white/20 text-white' : 'bg-[#E9E9E0] text-[#134E4A]'}`}>
                        <GitMerge className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Concatenats amb cadena</div>
                        <div className={`text-[10px] ${connectionMode === 'chained' ? 'text-white/80' : 'text-[#64746B]'}`}>
                          Suma el pes de tots els morts ({combinedPhysics.totalSubmergedWeightKg} kg)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConnectionMode('isolated')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                        connectionMode === 'isolated'
                          ? 'bg-[#134E4A] border-[#134E4A] text-white font-bold shadow-xs ring-2 ring-[#134E4A]/30'
                          : 'bg-white border-[#D1D1C7] text-[#134E4A] hover:bg-[#F5F5F0]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${connectionMode === 'isolated' ? 'bg-white/20 text-white' : 'bg-[#E9E9E0] text-[#134E4A]'}`}>
                        <Split className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Aïllats / independents</div>
                        <div className={`text-[10px] ${connectionMode === 'isolated' ? 'text-white/80' : 'text-[#64746B]'}`}>
                          Diagnosi separada per a cada mort
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 border border-[#E5E5DF] rounded-xl text-xs bg-white text-[#64746B] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>1 sol mort de fondeig (estructura individual)</span>
                  </div>
                )}
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
                  placeholder="Nom de l'auditor (Per defecte: W&X)"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#134E4A]">Latitud (GPS WGS84)</label>
                  <span className="text-[10px] text-[#7A8A7C]">Coma o punt</span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="42,xxxx"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-mono bg-[#FAF9F6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#134E4A]">Longitud (GPS WGS84)</label>
                  <span className="text-[10px] text-[#7A8A7C]">Coma o punt</span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="3,xxxx"
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-mono bg-[#FAF9F6]"
                />
              </div>
            </div>

            {/* Photographic Documentation Section */}
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
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropFiles}
                className={`border-2 border-dashed transition rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group ${
                  isDraggingOver
                    ? 'border-[#134E4A] bg-[#E0F2FE]'
                    : 'border-[#C4C4B8] hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F2F2EB]'
                }`}
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
                  {isProcessingPhotos
                    ? 'Optimitzant i comprimint imatges (≤ 1MB)...'
                    : 'Clica per pujar fotos o arrossega els fitxers aquí'}
                </div>
                <div className="text-[11px] text-[#64746B] flex items-center gap-1.5 flex-wrap justify-center">
                  <span>Accepta JPG, PNG, WEBP o enganxar amb Ctrl+V</span>
                  <span className="bg-[#E0F2FE] text-[#0E7490] font-semibold px-2 py-0.5 rounded text-[10px] border border-[#BAE6FD]">
                    Auto-reducció a ≤ 1MB
                  </span>
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
          </div>

          {/* Photo Modal Preview */}
          {previewPhoto && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setPreviewPhoto(null)}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img src={previewPhoto} alt="Foto ampliada" className="max-w-full max-h-[82vh] object-contain rounded-xl" />
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* If Mort is Not Found, show guidance card */}
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
                    Aquest registre s'arxivarà com a inspecció de no presència. Els 5 criteris de diagnosi de retirada no apliquen per absència del bloc físic.
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

          {/* INDIVIDUAL MORT EVALUATION & CHARACTERIZATION */}
          {presenceStatus === 'located' && (
            <div className="space-y-6">
              
              {/* Multi-Mort Selector Bar (When numberOfBlocks > 1) */}
              {numberOfBlocks > 1 && (
                <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#D1D1C7] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5DF] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-serif font-bold text-[#134E4A] flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#134E4A]" />
                          Morts de Fondeig Avaluats ({numberOfBlocks} unitats)
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          connectionMode === 'chained'
                            ? 'bg-[#134E4A] text-white'
                            : 'bg-[#E9E9E0] text-[#134E4A] border border-[#D1D1C7]'
                        }`}>
                          {connectionMode === 'chained' ? '⛓️ Concatenats (pes sumat)' : '🔗 Aïllats (independent)'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64746B] mt-0.5">
                        {connectionMode === 'chained'
                          ? `Els ${numberOfBlocks} morts actuen com un sol cos solidari de ${combinedPhysics.totalSubmergedWeightKg} kg submergits totals. Pots caracteritzar les dimensions o espècies de cada peça.`
                          : `Els morts estan separats. Cada mort té la seva pròpia avaluació física, puntuació i dictamen independent.`}
                      </p>
                    </div>

                    {/* Copy tools */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeBlockIndex > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyFromBlock1}
                          className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] border border-[#D1D1C7] font-medium flex items-center gap-1.5 transition"
                          title="Copiar criteris i dimensions del Mort 1 a aquest mort"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#134E4A]" />
                          <span>Copiar del Mort 1</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleApplyToAllBlocks}
                        className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] border border-[#D1D1C7] font-medium flex items-center gap-1.5 transition"
                        title="Aplicar criteris d'aquest mort a tots els altres"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-[#134E4A]" />
                        <span>Aplicar a tots</span>
                      </button>
                    </div>
                  </div>

                  {actionFeedback && (
                    <div className="p-2.5 bg-emerald-100 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium border border-emerald-300">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>{actionFeedback}</span>
                    </div>
                  )}

                  {/* Mort Navigation Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {evaluatedBlocks.map((b, idx) => {
                      const isCurrent = activeBlockIndex === idx;
                      const res = b.result;
                      const isLeave = res?.finalDecision === 'LEAVE';
                      const isRemove = res?.finalDecision === 'REMOVE';
                      return (
                        <button
                          key={b.id || idx}
                          type="button"
                          onClick={() => setActiveBlockIndex(idx)}
                          className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 transition whitespace-nowrap ${
                            isCurrent
                              ? 'bg-[#134E4A] border-[#134E4A] text-white shadow-md ring-2 ring-[#134E4A]/30'
                              : 'bg-white border-[#D1D1C7] text-[#134E4A] hover:bg-[#FAF9F6]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{b.label || `Mort ${idx + 1}`}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isCurrent ? 'bg-white/20 text-white' : 'bg-[#E9E9E0] text-[#134E4A]'
                            }`}>
                              {b.structureType === 'other_structure' ? 'Altra Estruct.' : `${b.hydrodynamics?.submergedWeightKg || 0} kg`}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-white text-[#134E4A]'
                              : isLeave
                              ? 'bg-emerald-100 text-emerald-900'
                              : isRemove
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {res ? (res.totalScore > 0 ? `+${res.totalScore}` : res.totalScore) : 0} pts
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Physical Characterization: Bloc de Formigó vs Altres Tipus d'Estructures */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5DF] pb-3">
                  <div>
                    <h3 className="text-base font-serif font-bold italic text-[#134E4A] flex items-center gap-2">
                      <Box className="w-4 h-4 text-[#134E4A]" />
                      Caracterització Física de: {activeBlock.label || `Mort ${activeBlockIndex + 1}`}
                    </h3>
                    <p className="text-xs text-[#64746B]">
                      Tria si es tracta d'un bloc de formigó estàndard o d'altres tipus d'estructures (àncores, xarxes, fustes, carrosseries, etc.).
                    </p>
                  </div>

                  {/* Toggle Structure Type */}
                  <div className="flex bg-[#E9E9E0] p-1 rounded-xl border border-[#DCDCD2] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => updateActiveBlockField('structureType', 'concrete_block')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeStructureType === 'concrete_block'
                          ? 'bg-[#134E4A] text-white shadow-xs'
                          : 'text-[#134E4A] hover:bg-white/60'
                      }`}
                    >
                      Bloc de Formigó
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveBlockField('structureType', 'other_structure')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeStructureType === 'other_structure'
                          ? 'bg-[#134E4A] text-white shadow-xs'
                          : 'text-[#134E4A] hover:bg-white/60'
                      }`}
                    >
                      Altres Tipus d'Estructures
                    </button>
                  </div>
                </div>

                {/* Option 1: Standard Concrete Block */}
                {activeStructureType === 'concrete_block' && (
                  <div className="space-y-3">
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1">
                      <span className="text-[10px] text-[#64746B] font-medium shrink-0">Presets comuns:</span>
                      {PRESET_BLOCKS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectPresetForActiveBlock(b.id)}
                          className={`px-2.5 py-1 rounded-lg border font-mono transition whitespace-nowrap ${
                            rawActiveBlock.presetId === b.id
                              ? 'bg-[#134E4A] border-[#134E4A] text-white font-bold shadow-xs'
                              : 'bg-[#FAF9F6] border-[#D1D1C7] text-[#134E4A] hover:bg-[#E9E9E0]'
                          }`}
                        >
                          {b.dimensionsCm.length}x{b.dimensionsCm.width}x{b.dimensionsCm.height}
                        </button>
                      ))}
                    </div>

                    {/* Dimensions Input */}
                    <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5E5DF] space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#134E4A]">
                        <span>Dimensions i Densitat del Bloc de Formigó:</span>
                        <span className="text-[11px] text-[#64746B] font-mono">
                          Densitat: {dimensions.concreteDensityKgM3 || 2400} kg/m³
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-[#64746B] font-medium">Llarg (cm)</span>
                          <input
                            type="number"
                            value={dimensions.lengthCm}
                            onChange={(e) => updateActiveBlockDimensions({ lengthCm: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#64746B] font-medium">Ample (cm)</span>
                          <input
                            type="number"
                            value={dimensions.widthCm}
                            onChange={(e) => updateActiveBlockDimensions({ widthCm: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#64746B] font-medium">Alt (cm)</span>
                          <input
                            type="number"
                            value={dimensions.heightCm}
                            onChange={(e) => updateActiveBlockDimensions({ heightCm: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-[#D1D1C7] rounded-lg text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                          />
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-[#D1D1C7] flex flex-col justify-center text-center">
                          <span className="text-[10px] text-[#64746B] uppercase font-semibold">Pes submergit calculat</span>
                          <span className="font-bold text-[#134E4A] font-mono text-xs">{hydroAssessment.submergedWeightKg} kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 2: Other Structure Types */}
                {activeStructureType === 'other_structure' && (
                  <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#D1D1C7] space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#134E4A]">
                      <span>Caracterització d'Estructura Especial o No Estàndard:</span>
                      <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium">
                        Càlcul per volum &amp; pes estimat
                      </span>
                    </div>

                    {/* Quick presets for description */}
                    <div>
                      <span className="text-[11px] text-[#64746B] font-medium block mb-1.5">
                        Tipologia ràpida:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {OTHER_STRUCTURE_QUICK_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateActiveOtherStructure({ customTypeDescription: preset })}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                              activeOtherStructure.customTypeDescription === preset
                                ? 'bg-[#134E4A] text-white border-[#134E4A] font-medium'
                                : 'bg-white text-[#4A4A43] border-[#D1D1C7] hover:bg-[#E9E9E0]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-[#64746B] font-medium mb-1">
                          Tipus / Descripció de l'Estructura
                        </label>
                        <input
                          type="text"
                          value={activeOtherStructure.customTypeDescription || ''}
                          onChange={(e) => updateActiveOtherStructure({ customTypeDescription: e.target.value })}
                          placeholder="Ex: Àncora d'almirallat antiga amb cep de fusta i cadena pesada"
                          className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-semibold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#64746B] font-medium mb-1">
                          Volum aproximat (m³)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={activeOtherStructure.estimatedVolumeM3 || 0.1}
                          onChange={(e) => updateActiveOtherStructure({ estimatedVolumeM3: parseFloat(e.target.value) || 0.01 })}
                          className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#64746B] font-medium mb-1">
                          Pes estimat a l'aire (kg)
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="1"
                          value={activeOtherStructure.estimatedWeightAirKg || 240}
                          onChange={(e) => updateActiveOtherStructure({ estimatedWeightAirKg: parseFloat(e.target.value) || 10 })}
                          className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#64746B] font-medium mb-1">
                          Pes estimat submergit en aigua salada (kg)
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="1"
                          value={activeOtherStructure.estimatedSubmergedWeightKg || 137}
                          onChange={(e) => updateActiveOtherStructure({ estimatedSubmergedWeightKg: parseFloat(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs font-bold text-[#134E4A] bg-white focus:ring-2 focus:ring-[#134E4A]"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-[#D1D1C7] flex flex-col justify-center">
                        <span className="text-[10px] text-[#64746B] uppercase font-semibold">Diagnosi hidrodinàmica</span>
                        <span className="font-mono text-xs font-bold text-[#134E4A]">
                          u_b = {hydroAssessment.criticalBottomVelocityUb} m/s ({hydroAssessment.slidingRiskScore} pts risc)
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-[#64746B] font-medium mb-1">
                          Comentari / Observacions sobre l'estructura
                        </label>
                        <textarea
                          rows={2}
                          value={activeOtherStructure.structureNotes || ''}
                          onChange={(e) => updateActiveOtherStructure({ structureNotes: e.target.value })}
                          placeholder="Ex: Estat de corrosió, material (ferro colat, acer, formigó irregular), adherències biològiques..."
                          className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#134E4A]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CRITERI 1: Protecció d'espècies amenaçades o hàbitats protegits */}
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

                <div className="space-y-2.5">
                  
                  {/* Option A: -10 pts */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                      activeC1Species === 'high_coverage_or_protected'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c1_species_${activeBlockIndex}`}
                      checked={activeC1Species === 'high_coverage_or_protected'}
                      onChange={() => updateActiveBlockField('c1_speciesPresence', 'high_coverage_or_protected')}
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
                      activeC1Species === 'low_coverage'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c1_species_${activeBlockIndex}`}
                      checked={activeC1Species === 'low_coverage'}
                      onChange={() => updateActiveBlockField('c1_speciesPresence', 'low_coverage')}
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
                      activeC1Species === 'renaturalized_algal'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c1_species_${activeBlockIndex}`}
                      checked={activeC1Species === 'renaturalized_algal'}
                      onChange={() => updateActiveBlockField('c1_speciesPresence', 'renaturalized_algal')}
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
                      activeC1Species === 'none'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c1_species_${activeBlockIndex}`}
                      checked={activeC1Species === 'none'}
                      onChange={() => updateActiveBlockField('c1_speciesPresence', 'none')}
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
                        Superfície de formigó o metall nua, amb pel·lícula bacteriana/fang o només espècies oportunistes.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Quick Species Checklist Tag Pills */}
                <div className="pt-2 space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64746B]">
                    Espècies catalogades observades en aquest mort:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROTECTED_SPECIES_CATALOG.map((sp) => {
                      const active = activeC1SelectedSpecies.includes(sp.scientificName);
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

                  <input
                    type="text"
                    value={activeC1Notes}
                    onChange={(e) => updateActiveBlockField('c1_speciesNotes', e.target.value)}
                    placeholder="Notes addicionals sobre la colonització biològica d'aquest mort..."
                    className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs bg-[#FAF9F6] focus:ring-2 focus:ring-[#134E4A]"
                  />
                </div>
              </div>

              {/* CRITERI 2: Impacte sobre el substrat annex (elements mòbils / abrasió) */}
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
                      Justificació ecològica: Inestabilitat mecànica o elements mòbils (cadenes, garreig) generen halos d'abrasió que impedeixen que els rizomes de <em>Posidonia oceanica</em> tanquin les clarianes.
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
                      activeC2Substrate === 'active_erosion_halo'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c2_substrate_${activeBlockIndex}`}
                      checked={activeC2Substrate === 'active_erosion_halo'}
                      onChange={() => updateActiveBlockField('c2_substrateImpact', 'active_erosion_halo')}
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
                      activeC2Substrate === 'none'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c2_substrate_${activeBlockIndex}`}
                      checked={activeC2Substrate === 'none'}
                      onChange={() => updateActiveBlockField('c2_substrateImpact', 'none')}
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
                {activeC2Substrate === 'active_erosion_halo' && (
                  <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#D1D1C7] flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#134E4A]">Radi de l'halo d'abrasió:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="30"
                        value={activeC2HaloRadius}
                        onChange={(e) => updateActiveBlockField('c2_haloRadiusM', Number(e.target.value))}
                        className="w-20 px-2.5 py-1 border border-[#D1D1C7] rounded-lg bg-white font-bold text-[#134E4A] text-xs font-mono"
                      />
                      <span className="text-[#64746B] font-medium">metres</span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-[#4A4A43] font-medium">
                      <input
                        type="checkbox"
                        checked={activeC2HasMobile}
                        onChange={(e) => updateActiveBlockField('c2_hasMobileElements', e.target.checked)}
                        className="accent-[#134E4A]"
                      />
                      <span>Presència de cadenes/caps solts tocant el fons</span>
                    </label>

                    <input
                      type="text"
                      value={activeC2Notes}
                      onChange={(e) => updateActiveBlockField('c2_notes', e.target.value)}
                      placeholder="Comentari sobre l'impacte en el substrat d'aquest mort..."
                      className="w-full px-3 py-1.5 border border-[#D1D1C7] rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#134E4A]"
                    />
                  </div>
                )}
              </div>

              {/* CRITERI 3: Dinamisme i Risc (Tamany, pes i fondària) */}
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
                      Justificació hidrodinàmica: Blocs o estructures de pes reduït sotmesos a onatge a -{depthM} m llisquen i amplien l'halo d'impacte.
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
                      onClick={() => updateActiveBlockField('c3_useCustomPhysics', true)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        activeC3Auto
                          ? 'bg-[#134E4A] text-white shadow-xs'
                          : 'bg-white text-[#134E4A] border border-[#D1D1C7]'
                      }`}
                    >
                      Automàtic per Física Hidrodinàmica
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveBlockField('c3_useCustomPhysics', false)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        !activeC3Auto
                          ? 'bg-[#134E4A] text-white shadow-xs'
                          : 'bg-white text-[#134E4A] border border-[#D1D1C7]'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {activeC3Auto ? (
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
                        ? 'Estructura de pes reduït en zona somera: una onada ordinària supera la velocitat orbital crítica generant lliscament.'
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
                        activeC3Manual === 'high_risk'
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
                          name={`c3_manual_${activeBlockIndex}`}
                          checked={activeC3Manual === 'high_risk'}
                          onChange={() => updateActiveBlockField('c3_dynamismRisk', 'high_risk')}
                          className="accent-[#134E4A]"
                        />
                      </div>
                    </label>

                    <label
                      className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                        activeC3Manual === 'moderate_risk'
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
                          name={`c3_manual_${activeBlockIndex}`}
                          checked={activeC3Manual === 'moderate_risk'}
                          onChange={() => updateActiveBlockField('c3_dynamismRisk', 'moderate_risk')}
                          className="accent-[#134E4A]"
                        />
                      </div>
                    </label>

                    <label
                      className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                        activeC3Manual === 'low_risk'
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
                          name={`c3_manual_${activeBlockIndex}`}
                          checked={activeC3Manual === 'low_risk'}
                          onChange={() => updateActiveBlockField('c3_dynamismRisk', 'low_risk')}
                          className="accent-[#134E4A]"
                        />
                      </div>
                    </label>

                    <label
                      className={`flex items-start justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                        activeC3Manual === 'no_risk'
                          ? 'border-[#134E4A] bg-[#FAF9F6] ring-1 ring-[#134E4A]'
                          : 'border-[#E5E5DF] hover:border-[#D1D1C7]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#134E4A] block">
                          Absència de Risc (Categorització Vermell): Estructura totalment estable
                        </span>
                        <span className="text-[11px] text-[#64746B]">
                          Gran inèrcia per pes elevat o fondària profunda (&gt;20 m); cap risc de desplaçament.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-mono font-bold text-[#64746B] bg-[#E9E9E0] px-2.5 py-0.5 rounded-md">
                          0 punts
                        </span>
                        <input
                          type="radio"
                          name={`c3_manual_${activeBlockIndex}`}
                          checked={activeC3Manual === 'no_risk'}
                          onChange={() => updateActiveBlockField('c3_dynamismRisk', 'no_risk')}
                          className="accent-[#134E4A]"
                        />
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* CRITERI 4: Estabilitat i integració en l'hàbitat (enterrament i rizoma) */}
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
                      activeC4Stability === 'fixed_by_roots_or_sediment'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c4_stability_${activeBlockIndex}`}
                      checked={activeC4Stability === 'fixed_by_roots_or_sediment'}
                      onChange={() => updateActiveBlockField('c4_stabilityIntegration', 'fixed_by_roots_or_sediment')}
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
                      activeC4Stability === 'not_buried_generates_void'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c4_stability_${activeBlockIndex}`}
                      checked={activeC4Stability === 'not_buried_generates_void'}
                      onChange={() => updateActiveBlockField('c4_stabilityIntegration', 'not_buried_generates_void')}
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
                      activeC4Stability === 'not_buried_no_void'
                        ? 'border-[#134E4A] bg-[#FAF9F6] text-[#134E4A] shadow-xs ring-1 ring-[#134E4A]'
                        : 'border-[#E5E5DF] hover:border-[#D1D1C7] text-[#4A4A43] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c4_stability_${activeBlockIndex}`}
                      checked={activeC4Stability === 'not_buried_no_void'}
                      onChange={() => updateActiveBlockField('c4_stabilityIntegration', 'not_buried_no_void')}
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
                </div>

                <input
                  type="text"
                  value={activeC4Notes}
                  onChange={(e) => updateActiveBlockField('c4_notes', e.target.value)}
                  placeholder="Notes sobre el grau d'enterrament o contacte amb rizoma per aquest mort..."
                  className="w-full px-3 py-2 border border-[#D1D1C7] rounded-xl text-xs bg-[#FAF9F6] focus:ring-2 focus:ring-[#134E4A]"
                />
              </div>

              {/* CRITERI 5 / OBSERVACIONS DE CAMP PER A L'ACTA D'AQUEST MORT */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold italic text-[#134E4A] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#134E4A]" />
                    5. Observacions de camp / Notes per a l'acta ({activeBlock.label || `Mort ${activeBlockIndex + 1}`})
                  </label>
                  <span className="text-[11px] text-[#64746B]">
                    Específiques d'aquest mort
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={activeBlockNotes}
                  onChange={(e) => updateActiveBlockField('notes', e.target.value)}
                  placeholder="Ex: Estat de la gata/grillete, restes de cadenes adherides, presència d'anèmones o esponges, estat mecànic..."
                  className="w-full px-3.5 py-2.5 border border-[#D1D1C7] rounded-2xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
                />
              </div>

            </div>
          )}

          {/* Observations & Field Notes Generals de la Immersió */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[#D1D1C7]">
            <label className="block text-xs font-serif font-bold italic text-[#134E4A] mb-2">
              Observacions generals de la immersió / Notes globals per a l'acta
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Ex: Condicions meteorològiques de la immersió, visibilitat sota l'aigua, tipus de fons marí adjacent a la cala..."
              className="w-full px-3.5 py-2.5 border border-[#D1D1C7] rounded-2xl text-xs focus:ring-2 focus:ring-[#134E4A] bg-[#FAF9F6]"
            />
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Decision Result Output & Multi-Mort Overview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Active Block Decision Card */}
            <DecisionCard
              result={decisionResult}
              onSaveToInventory={handleSave}
              onPrintReport={handlePrint}
              isSaved={isSaved}
            />

            {/* Mort Diagnostics Breakdown if numberOfBlocks > 1 */}
            {numberOfBlocks > 1 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#D1D1C7] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E5DF] pb-2.5">
                  <h4 className="text-xs font-bold text-[#134E4A] flex items-center gap-1.5 uppercase tracking-wider">
                    {connectionMode === 'chained' ? (
                      <>
                        <GitMerge className="w-4 h-4 text-[#134E4A]" />
                        Sistema Concatenat ({evaluatedBlocks.length} morts)
                      </>
                    ) : (
                      <>
                        <Split className="w-4 h-4 text-[#134E4A]" />
                        Diagnosi Individual ({evaluatedBlocks.length} morts)
                      </>
                    )}
                  </h4>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    connectionMode === 'chained' ? 'bg-[#134E4A] text-white' : 'bg-[#E9E9E0] text-[#134E4A]'
                  }`}>
                    {connectionMode === 'chained' ? 'Pes Sumat' : 'Aïllats'}
                  </span>
                </div>

                {connectionMode === 'chained' && (
                  <div className="p-3 bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[#134E4A] font-bold">
                      <span>Suma Total del Tren de Fondeig:</span>
                      <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {combinedPhysics.totalSubmergedWeightKg} kg subm.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#4A4A43]">
                      <div>Volum total: <strong>{combinedPhysics.totalVolumeM3} m³</strong></div>
                      <div>Pes aire: <strong>{combinedPhysics.totalWeightAirKg} kg</strong></div>
                      <div>Velocitat u_b: <strong>{combinedPhysics.combinedHydro.criticalBottomVelocityUb} m/s</strong></div>
                      <div>Risc lliscament: <strong>+{combinedPhysics.combinedHydro.slidingRiskScore} pts</strong></div>
                    </div>
                    <p className="text-[11px] text-[#64746B] leading-relaxed pt-1 border-t border-[#E5E5DF]">
                      La unió amb cadena fa que la inèrcia total del conjunt s'oposi a l'arrossegament hidrodinàmic d'onatge.
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#64746B] flex items-center justify-between">
                    <span>{connectionMode === 'chained' ? 'Morts que integren la cadena:' : 'Morts inspeccionats per separat:'}</span>
                    <span className="text-[10px] font-mono">Clica per editar</span>
                  </div>
                  {evaluatedBlocks.map((b, idx) => {
                    const isSelected = activeBlockIndex === idx;
                    const res = b.result;
                    const isLeave = res?.finalDecision === 'LEAVE';
                    const isRemove = res?.finalDecision === 'REMOVE';
                    const isOther = b.structureType === 'other_structure';

                    return (
                      <div
                        key={b.id || idx}
                        onClick={() => setActiveBlockIndex(idx)}
                        className={`p-3 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-[#134E4A] bg-[#FAF9F6] ring-2 ring-[#134E4A]/30 shadow-xs'
                            : 'border-[#E5E5DF] hover:border-[#D1D1C7] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#134E4A]">{b.label || `Mort ${idx + 1}`}</span>
                            <span className="text-[11px] text-[#64746B] font-mono">
                              {isOther
                                ? (b.otherStructure?.customTypeDescription || "Estructura especial")
                                : `(${b.dimensions.lengthCm}x${b.dimensions.widthCm}x${b.dimensions.heightCm} cm)`}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-[#134E4A]">
                            {res ? (res.totalScore > 0 ? `+${res.totalScore}` : res.totalScore) : 0} pts
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#64746B] font-mono">
                            Pes unitari: {b.hydrodynamics?.submergedWeightKg || 0} kg submergit
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isLeave
                              ? 'bg-emerald-100 text-emerald-900'
                              : isRemove
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {res?.decisionLabel || 'Pendent'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
