import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FileImage,
  Filter,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  RotateCcw,
  Download,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Trash2,
  Sliders,
  ShieldCheck,
  ListFilter,
  CheckCheck,
  Zap,
  MapPin,
  Box,
  MessageSquare,
  Scale,
  Plus,
  Minus,
  CheckCircle,
  UserCheck,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import {
  BatchMortGroup,
  BatchPhotoItem,
  extractMortIdFromPath,
  analyzeMortPhotoGroup,
  convertBatchMortToRecord,
  DEMO_BATCH_LOTS,
} from '../utils/batchPhotoAnalyzer';
import {
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
  MortEvaluationRecord,
  BlockDimensions,
  EvaluatorCriteria,
  EVALUATOR_CRITERIA_OPTIONS,
  getActiveEvaluatorCriteriaLabels,
} from '../types';
import { evaluateDecision } from '../utils/decisionEngine';
import { getMatrix128Combination } from '../data/decisionMatrix128';
import { exportInventoryToExcel } from '../utils/excelExport';

export const DIMENSION_PRESETS: {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  desc: string;
}[] = [
  {
    id: 'std_80x80x40',
    name: '80 × 80 × 40 cm (Estàndard)',
    lengthCm: 80,
    widthCm: 80,
    heightCm: 40,
    weightKg: 614,
    desc: 'Volum 0.256 m³ • Pes aire ~614 kg (Aigua: ~358 kg)',
  },
  {
    id: 'large_100x100x80',
    name: '100 × 100 × 80 cm (Gran)',
    lengthCm: 100,
    widthCm: 100,
    heightCm: 80,
    weightKg: 1920,
    desc: 'Volum 0.800 m³ • Pes aire ~1.920 kg (Aigua: ~1.120 kg)',
  },
  {
    id: 'massive_120x120x80',
    name: '120 × 120 × 80 cm (Massiu)',
    lengthCm: 120,
    widthCm: 120,
    heightCm: 80,
    weightKg: 2765,
    desc: 'Volum 1.152 m³ • Pes aire ~2.765 kg (Aigua: ~1.613 kg)',
  },
  {
    id: 'small_60x60x40',
    name: '60 × 60 × 40 cm (Petit)',
    lengthCm: 60,
    widthCm: 60,
    heightCm: 40,
    weightKg: 345,
    desc: 'Volum 0.144 m³ • Pes aire ~345 kg (Aigua: ~202 kg)',
  },
  {
    id: 'custom',
    name: 'Personalitzat (L × W × H)',
    lengthCm: 80,
    widthCm: 80,
    heightCm: 40,
    weightKg: 614,
    desc: 'Dimensions definides manualment',
  },
];

interface BatchAnalysisSectionProps {
  onImportToInventory: (newRecords: MortEvaluationRecord[]) => void;
  onGoToInventory: () => void;
  isDriveConnected?: boolean;
}

export function BatchAnalysisSection({
  onImportToInventory,
  onGoToInventory,
  isDriveConnected = false,
}: BatchAnalysisSectionProps) {
  const [mortGroups, setMortGroups] = useState<BatchMortGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number; currentName?: string }>({
    current: 0,
    total: 0,
  });
  const [selectedMortId, setSelectedMortId] = useState<string | null>(null);
  const [analyzingMortIds, setAnalyzingMortIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'validated'>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Batch Defaults for Bulk Management Tools
  const [defaultLocationName, setDefaultLocationName] = useState<string>('Cala Montgó');
  const [defaultDepthM, setDefaultDepthM] = useState<number>(8);
  const [defaultNumberOfBlocks, setDefaultNumberOfBlocks] = useState<number>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('std_80x80x40');
  const [defaultDimensions, setDefaultDimensions] = useState<BlockDimensions>({
    lengthCm: 80,
    widthCm: 80,
    heightCm: 40,
    concreteDensityKgM3: 2400,
  });
  const [defaultComment, setDefaultComment] = useState<string>('');
  const [defaultEvaluatorCriteria, setDefaultEvaluatorCriteria] = useState<EvaluatorCriteria>({
    absencePosidoniaOrHabitats: false,
    immediateRemoval: false,
    scheduledRemoval: false,
    neutralizeAndMaintain: false,
    noRemoval: false,
  });
  const [batchActionToast, setBatchActionToast] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Google Drive folder URL / ID input
  const [driveFolderInput, setDriveFolderInput] = useState<string>(
    'https://drive.google.com/drive/folders/1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq'
  );
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // File input refs for local files / folder
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Photo viewer lightbox modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; index: number; total: number; mortCode: string } | null>(
    null
  );

  const showBatchToast = (msg: string) => {
    setBatchActionToast(msg);
    setTimeout(() => {
      setBatchActionToast(null);
    }, 4500);
  };

  /**
   * Handle Preset Selection for Dimensions
   */
  const handleSelectDimensionPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = DIMENSION_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== 'custom') {
      setDefaultDimensions({
        lengthCm: found.lengthCm,
        widthCm: found.widthCm,
        heightCm: found.heightCm,
        concreteDensityKgM3: 2400,
      });
    }
  };

  /**
   * Helper to recalculate decision and 128 Casuística
   */
  const recalculateGroup = (
    c1: SpeciesPresenceOption,
    c2: SubstrateImpactOption,
    c3: DynamismRiskOption,
    c4: StabilityIntegrationOption,
    usage: MortUsageStatus,
    hasMobile: boolean
  ) => {
    const result = evaluateDecision(c1, c2, c3, c4, usage, hasMobile, false);
    const matrix128 = getMatrix128Combination(c1, c2 === 'active_erosion_halo' || hasMobile, c3, c4);
    return { result, matrix128 };
  };

  /**
   * Process an array of File objects (from folder input, drag & drop, or file picker)
   * 1. Groups and sorts photos
   * 2. Shows cards with blank registers
   * 3. AI analysis is an on-demand option per photo/mort
   */
  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    const imageFiles = files.filter(
      (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(f.name)
    );
    if (imageFiles.length === 0) {
      alert("No s'han trobat fitxers d'imatge vàlids.");
      setIsProcessing(false);
      return;
    }

    setProcessingProgress({ current: 0, total: imageFiles.length, currentName: 'Agrupant i ordenant fitxers...' });

    // 1. Group images by Mort identifier
    const groupsMap = new Map<string, { folderOrPrefix: string; photos: BatchPhotoItem[] }>();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const relPath = (file as any).webkitRelativePath || file.name;
      const { mortCode, photoIndex, groupingSource } = extractMortIdFromPath(file.name, relPath);

      const photoUrl = URL.createObjectURL(file);
      const photoItem: BatchPhotoItem = {
        id: `photo_${i}_${file.name}`,
        name: file.name,
        url: photoUrl,
        file,
        sizeBytes: file.size,
        photoIndex,
      };

      if (!groupsMap.has(mortCode)) {
        groupsMap.set(mortCode, {
          folderOrPrefix:
            groupingSource === 'subfolder'
              ? `Subcarpeta /${mortCode}`
              : groupingSource === 'filename_parenthesis'
              ? `Nom amb parèntesi: ${mortCode} (x)`
              : `Prefix fitxer: ${mortCode}`,
          photos: [],
        });
      }

      groupsMap.get(mortCode)!.photos.push(photoItem);
    }

    // 2. Initialize cards for each mort with sorted photos and blank registers
    const groupsArray: BatchMortGroup[] = [];

    for (const [mortCode, data] of groupsMap.entries()) {
      // Sort photos within the mort
      data.photos.sort((a, b) => {
        if (a.photoIndex !== undefined && b.photoIndex !== undefined) {
          return a.photoIndex - b.photoIndex;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      const { result, matrix128 } = recalculateGroup(
        'none',
        'none',
        'no_risk',
        'not_buried_no_void',
        'abandoned',
        false
      );

      groupsArray.push({
        id: `mort_${Date.now()}_${mortCode.replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 6)}`,
        mortCode,
        folderOrPrefix: data.folderOrPrefix,
        photos: data.photos,

        suggestedC1: undefined,
        suggestedC2: undefined,
        suggestedC3: undefined,
        suggestedC4: undefined,
        suggestedUsage: undefined,
        suggestedHasMobileElements: false,
        suggestedDepthM: defaultDepthM,
        confidenceScore: undefined,
        detectedSpecies: [],
        detectedFeatures: [],
        visualObservations: '',
        aiSource: undefined,
        matrix128,

        validatedC1: 'none',
        validatedC2: 'none',
        validatedC3: 'no_risk',
        validatedC4: 'not_buried_no_void',
        validatedUsage: 'abandoned',
        validatedHasMobileElements: false,
        validatedDepthM: defaultDepthM,
        locationName: defaultLocationName,
        numberOfBlocks: defaultNumberOfBlocks,
        dimensions: { ...defaultDimensions },
        connectionMode: defaultNumberOfBlocks > 1 ? 'chained' : 'isolated',
        notes: '',
        isValidated: false,
        evaluatorCriteria: { ...defaultEvaluatorCriteria },

        result,
      });
    }

    // Sort all mort groups naturally by mort code
    groupsArray.sort((a, b) => a.mortCode.localeCompare(b.mortCode, undefined, { numeric: true, sensitivity: 'base' }));

    setMortGroups(groupsArray);
    setIsProcessing(false);
    showBatchToast(`S'han carregat i ordenat ${groupsArray.length} morts (${imageFiles.length} fotos). Registres en blanc llestos.`);
  };

  /**
   * Load Demo Lot directly with sorted photos and blank registers
   */
  const handleLoadDemoLot = async (lotId: string) => {
    const lot = DEMO_BATCH_LOTS.find((l) => l.id === lotId) || DEMO_BATCH_LOTS[0];
    setIsProcessing(true);
    setDefaultLocationName(lot.location);

    setProcessingProgress({ current: 0, total: lot.items.length, currentName: 'Carregant i ordenant lot de mostra...' });

    const groups: BatchMortGroup[] = [];

    for (let i = 0; i < lot.items.length; i++) {
      const item = lot.items[i];

      const photoItems: BatchPhotoItem[] = item.photos.map((p, pIdx) => ({
        id: `demo_${lot.id}_${item.mortCode}_${pIdx}`,
        name: p.name,
        url: p.url,
        photoIndex: p.photoIndex,
      }));

      // Sort photos
      photoItems.sort((a, b) => {
        if (a.photoIndex !== undefined && b.photoIndex !== undefined) {
          return a.photoIndex - b.photoIndex;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      const { result, matrix128 } = recalculateGroup(
        'none',
        'none',
        'no_risk',
        'not_buried_no_void',
        'abandoned',
        false
      );

      groups.push({
        id: `demo_${lot.id}_${item.mortCode}`,
        mortCode: item.mortCode,
        folderOrPrefix: item.folderOrPrefix,
        photos: photoItems,

        suggestedC1: undefined,
        suggestedC2: undefined,
        suggestedC3: undefined,
        suggestedC4: undefined,
        suggestedUsage: undefined,
        suggestedHasMobileElements: false,
        suggestedDepthM: defaultDepthM,
        confidenceScore: undefined,
        detectedSpecies: [],
        detectedFeatures: [],
        visualObservations: '',
        aiSource: undefined,
        matrix128,

        validatedC1: 'none',
        validatedC2: 'none',
        validatedC3: 'no_risk',
        validatedC4: 'not_buried_no_void',
        validatedUsage: 'abandoned',
        validatedHasMobileElements: false,
        validatedDepthM: defaultDepthM,
        locationName: lot.location,
        numberOfBlocks: defaultNumberOfBlocks,
        dimensions: { ...defaultDimensions },
        connectionMode: defaultNumberOfBlocks > 1 ? 'chained' : 'isolated',
        notes: '',
        isValidated: false,
        evaluatorCriteria: { ...defaultEvaluatorCriteria },

        result,
      });
    }

    groups.sort((a, b) => a.mortCode.localeCompare(b.mortCode, undefined, { numeric: true, sensitivity: 'base' }));

    setMortGroups(groups);
    setIsProcessing(false);
    showBatchToast(`S'ha carregat el lot de mostra (${groups.length} morts). Registres en blanc llestos.`);
  };

  /**
   * Run AI Analysis on a single Mort/Photo group on-demand
   */
  const handleAnalyzeSingleMortWithAI = async (mortId: string) => {
    const targetMort = mortGroups.find((m) => m.id === mortId);
    if (!targetMort) return;

    setAnalyzingMortIds((prev) => new Set(prev).add(mortId));

    try {
      const analysis = await analyzeMortPhotoGroup(
        targetMort.mortCode,
        targetMort.photos,
        targetMort.locationName || defaultLocationName
      );

      const { result, matrix128 } = recalculateGroup(
        analysis.suggestedC1,
        analysis.suggestedC2,
        analysis.suggestedC3,
        analysis.suggestedC4,
        analysis.suggestedUsage,
        analysis.suggestedHasMobileElements
      );

      setMortGroups((prev) =>
        prev.map((item) => {
          if (item.id !== mortId) return item;
          return {
            ...item,
            suggestedC1: analysis.suggestedC1,
            suggestedC2: analysis.suggestedC2,
            suggestedC3: analysis.suggestedC3,
            suggestedC4: analysis.suggestedC4,
            suggestedUsage: analysis.suggestedUsage,
            suggestedHasMobileElements: analysis.suggestedHasMobileElements,
            suggestedDepthM: analysis.suggestedDepthM || item.validatedDepthM,
            confidenceScore: analysis.confidenceScore,
            detectedSpecies: analysis.detectedSpecies || [],
            detectedFeatures: analysis.detectedFeatures,
            visualObservations: analysis.visualObservations,
            aiSource: analysis.aiSource,
            matrix128,

            validatedC1: analysis.suggestedC1,
            validatedC2: analysis.suggestedC2,
            validatedC3: analysis.suggestedC3,
            validatedC4: analysis.suggestedC4,
            validatedUsage: analysis.suggestedUsage,
            validatedHasMobileElements: analysis.suggestedHasMobileElements,
            validatedDepthM: analysis.suggestedDepthM || item.validatedDepthM,
            notes: item.notes.trim()
              ? `${item.notes} | ${analysis.visualObservations}`
              : analysis.visualObservations,
            result,
          };
        })
      );

      showBatchToast(
        `Anàlisi IA completada per a ${targetMort.mortCode} (${analysis.confidenceScore}% de confiança).`
      );
    } catch (err) {
      console.error('Error in single mort AI analysis:', err);
      showBatchToast(`Error en l'anàlisi IA de ${targetMort.mortCode}.`);
    } finally {
      setAnalyzingMortIds((prev) => {
        const next = new Set(prev);
        next.delete(mortId);
        return next;
      });
    }
  };

  /**
   * Delete a single Mort from the batch list
   */
  const handleDeleteMort = (mortId: string) => {
    const target = mortGroups.find((m) => m.id === mortId);
    const code = target?.mortCode || 'seleccionat';

    setMortGroups((prev) => prev.filter((m) => m.id !== mortId));
    if (selectedMortId === mortId) {
      setSelectedMortId(null);
    }
    showBatchToast(`S'ha eliminat el mort ${code} del lot.`);
  };

  /**
   * Re-run AI Analysis on all current groups
   */
  const handleReanalyzeAllWithAI = async () => {
    if (mortGroups.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: mortGroups.length, currentName: 'Re-analitzant lot...' });

    const updatedGroups: BatchMortGroup[] = [];

    for (let i = 0; i < mortGroups.length; i++) {
      const g = mortGroups[i];
      setProcessingProgress({
        current: i + 1,
        total: mortGroups.length,
        currentName: `Processant visió IA per a ${g.mortCode}...`,
      });

      const analysis = await analyzeMortPhotoGroup(g.mortCode, g.photos, g.locationName || defaultLocationName);
      const { result, matrix128 } = recalculateGroup(
        analysis.suggestedC1,
        analysis.suggestedC2,
        analysis.suggestedC3,
        analysis.suggestedC4,
        analysis.suggestedUsage,
        analysis.suggestedHasMobileElements
      );

      updatedGroups.push({
        ...g,
        suggestedC1: analysis.suggestedC1,
        suggestedC2: analysis.suggestedC2,
        suggestedC3: analysis.suggestedC3,
        suggestedC4: analysis.suggestedC4,
        suggestedUsage: analysis.suggestedUsage,
        suggestedHasMobileElements: analysis.suggestedHasMobileElements,
        suggestedDepthM: analysis.suggestedDepthM || g.validatedDepthM,
        confidenceScore: analysis.confidenceScore,
        detectedSpecies: analysis.detectedSpecies || [],
        detectedFeatures: analysis.detectedFeatures,
        visualObservations: analysis.visualObservations,
        aiSource: analysis.aiSource,
        matrix128,

        validatedC1: analysis.suggestedC1,
        validatedC2: analysis.suggestedC2,
        validatedC3: analysis.suggestedC3,
        validatedC4: analysis.suggestedC4,
        validatedUsage: analysis.suggestedUsage,
        validatedHasMobileElements: analysis.suggestedHasMobileElements,
        result,
      });
    }

    setMortGroups(updatedGroups);
    setIsProcessing(false);
    showBatchToast(`S'han analitzat tots els ${updatedGroups.length} morts amb IA.`);
  };

  /**
   * Update criteria on a mort group
   */
  const updateMortCriteria = (
    mortId: string,
    field:
      | 'validatedC1'
      | 'validatedC2'
      | 'validatedC3'
      | 'validatedC4'
      | 'validatedUsage'
      | 'validatedHasMobileElements'
      | 'validatedDepthM'
      | 'locationName'
      | 'numberOfBlocks'
      | 'dimensions'
      | 'connectionMode'
      | 'notes',
    value: any
  ) => {
    setMortGroups((prev) =>
      prev.map((item) => {
        if (item.id !== mortId) return item;
        const updated = { ...item, [field]: value };
        const { result, matrix128 } = recalculateGroup(
          updated.validatedC1,
          updated.validatedC2,
          updated.validatedC3,
          updated.validatedC4,
          updated.validatedUsage,
          updated.validatedHasMobileElements
        );
        return { ...updated, result, matrix128 };
      })
    );
  };

  /**
   * Toggle validation status of a single mort
   */
  const toggleValidateMort = (mortId: string) => {
    setMortGroups((prev) =>
      prev.map((item) => (item.id === mortId ? { ...item, isValidated: !item.isValidated } : item))
    );
  };

  /**
   * Validate all morts in the batch
   */
  const handleValidateAll = () => {
    setMortGroups((prev) => prev.map((item) => ({ ...item, isValidated: true })));
    showBatchToast(`S'han validat tots els ${mortGroups.length} morts del lot.`);
  };

  /**
   * Bulk set location name for all morts
   */
  const handleApplyLocationToAll = () => {
    if (!defaultLocationName.trim()) return;
    setMortGroups((prev) => prev.map((item) => ({ ...item, locationName: defaultLocationName })));
    showBatchToast(`S'ha establert la cala / ubicació "${defaultLocationName}" a tots els ${mortGroups.length} morts.`);
  };

  /**
   * Bulk set depth for all morts
   */
  const handleApplyDepthToAll = () => {
    setMortGroups((prev) =>
      prev.map((item) => {
        const updated = { ...item, validatedDepthM: defaultDepthM };
        const { result, matrix128 } = recalculateGroup(
          updated.validatedC1,
          updated.validatedC2,
          updated.validatedC3,
          updated.validatedC4,
          updated.validatedUsage,
          updated.validatedHasMobileElements
        );
        return { ...updated, result, matrix128 };
      })
    );
    showBatchToast(`S'ha aplicat la fondària de ${defaultDepthM}m a tots els ${mortGroups.length} morts.`);
  };

  /**
   * Bulk set number of blocks for all morts
   */
  const handleApplyBlocksToAll = () => {
    setMortGroups((prev) =>
      prev.map((item) => ({
        ...item,
        numberOfBlocks: defaultNumberOfBlocks,
        connectionMode: defaultNumberOfBlocks > 1 ? 'dual_tandem' : 'single_block',
      }))
    );
    showBatchToast(`S'ha establert el número de blocs (${defaultNumberOfBlocks}) a tots els ${mortGroups.length} morts.`);
  };

  /**
   * Bulk set block dimensions for all morts
   */
  const handleApplyDimensionsToAll = () => {
    setMortGroups((prev) =>
      prev.map((item) => ({
        ...item,
        dimensions: { ...defaultDimensions },
      }))
    );
    showBatchToast(
      `S'han aplicat les mides ${defaultDimensions.lengthCm}×${defaultDimensions.widthCm}×${defaultDimensions.heightCm} cm a tots els morts.`
    );
  };

  /**
   * Bulk set or append comment for all morts
   */
  const handleApplyCommentToAll = (mode: 'replace' | 'append') => {
    if (!defaultComment.trim()) return;
    setMortGroups((prev) =>
      prev.map((item) => {
        const newNotes =
          mode === 'replace'
            ? defaultComment
            : item.notes
            ? `${item.notes}\n${defaultComment}`
            : defaultComment;
        return { ...item, notes: newNotes };
      })
    );
    showBatchToast(
      mode === 'replace'
        ? `S'ha actualitzat el comentari a tots els ${mortGroups.length} morts.`
        : `S'ha afegit la nota a tots els ${mortGroups.length} morts.`
    );
  };

  /**
   * Toggle default Evaluator Criteria in Bulk Management Tools
   */
  const toggleDefaultEvaluatorCriteria = (key: keyof EvaluatorCriteria) => {
    setDefaultEvaluatorCriteria((prev) => {
      const next = { ...prev };
      if (key === 'absencePosidoniaOrHabitats') {
        next.absencePosidoniaOrHabitats = !prev.absencePosidoniaOrHabitats;
      } else {
        const wasActive = !!prev[key];
        next.immediateRemoval = false;
        next.scheduledRemoval = false;
        next.neutralizeAndMaintain = false;
        next.noRemoval = false;
        if (!wasActive) next[key] = true;
      }
      return next;
    });
  };

  /**
   * Toggle individual mort Evaluator Criteria
   */
  const toggleMortEvaluatorCriteria = (mortId: string, key: keyof EvaluatorCriteria) => {
    setMortGroups((prev) =>
      prev.map((item) => {
        if (item.id !== mortId) return item;
        const current = item.evaluatorCriteria || {
          absencePosidoniaOrHabitats: false,
          immediateRemoval: false,
          scheduledRemoval: false,
          neutralizeAndMaintain: false,
          noRemoval: false,
        };
        const next: EvaluatorCriteria = { ...current };
        if (key === 'absencePosidoniaOrHabitats') {
          next.absencePosidoniaOrHabitats = !current.absencePosidoniaOrHabitats;
        } else {
          const wasActive = !!current[key];
          next.immediateRemoval = false;
          next.scheduledRemoval = false;
          next.neutralizeAndMaintain = false;
          next.noRemoval = false;
          if (!wasActive) next[key] = true;
        }
        return { ...item, evaluatorCriteria: next };
      })
    );
  };

  /**
   * Bulk apply evaluator criteria to all morts in the lot
   */
  const handleApplyEvaluatorCriteriaToAll = () => {
    setMortGroups((prev) =>
      prev.map((item) => ({
        ...item,
        evaluatorCriteria: { ...defaultEvaluatorCriteria },
      }))
    );
    const activeLabels = getActiveEvaluatorCriteriaLabels(defaultEvaluatorCriteria);
    showBatchToast(
      activeLabels.length > 0
        ? `S'ha aplicat el Criteri de l'Avaluador (${activeLabels.join(' + ')}) a tots els ${mortGroups.length} morts.`
        : `S'ha netejat el Criteri de l'Avaluador a tots els ${mortGroups.length} morts.`
    );
  };

  const handleClearDefaultEvaluatorCriteria = () => {
    setDefaultEvaluatorCriteria({
      absencePosidoniaOrHabitats: false,
      immediateRemoval: false,
      scheduledRemoval: false,
      neutralizeAndMaintain: false,
      noRemoval: false,
    });
  };

  /**
   * Apply all batch defaults at once
   */
  const handleApplyAllDefaultsToAll = () => {
    setMortGroups((prev) =>
      prev.map((item) => {
        const updated = {
          ...item,
          locationName: defaultLocationName || item.locationName,
          validatedDepthM: defaultDepthM,
          numberOfBlocks: defaultNumberOfBlocks,
          dimensions: { ...defaultDimensions },
          connectionMode: defaultNumberOfBlocks > 1 ? 'dual_tandem' : 'single_block',
          notes: defaultComment.trim() ? defaultComment : item.notes,
          evaluatorCriteria: { ...defaultEvaluatorCriteria },
        };
        const { result, matrix128 } = recalculateGroup(
          updated.validatedC1,
          updated.validatedC2,
          updated.validatedC3,
          updated.validatedC4,
          updated.validatedUsage,
          updated.validatedHasMobileElements
        );
        return { ...updated, result, matrix128 };
      })
    );
    showBatchToast(`S'han aplicat tots els paràmetres (cala, fondària, blocs, mides, comentari i criteri avaluador) al lot sencer.`);
  };

  /**
   * Import all validated (or all) records into permanent Inventory
   */
  const handleImportToOfficialInventory = () => {
    if (mortGroups.length === 0) return;
    const recordsToImport = mortGroups.map((g) => convertBatchMortToRecord(g, g.locationName || defaultLocationName));
    onImportToInventory(recordsToImport);

    setImportNotification(
      `S'han incorporat correctament ${recordsToImport.length} registres a l'Inventari Oficial amb les seves 128 casuístiques assignades.`
    );
    setTimeout(() => setImportNotification(null), 6000);
  };

  /**
   * Export Batch analysis to Excel / CSV
   */
  const handleExportBatchExcel = () => {
    if (mortGroups.length === 0) return;
    const records = mortGroups.map((g) => convertBatchMortToRecord(g, g.locationName || defaultLocationName));
    exportInventoryToExcel(records);
  };

  /**
   * Filtered list of mort groups
   */
  const filteredGroups = useMemo(() => {
    return mortGroups.filter((item) => {
      if (filterStatus === 'pending' && item.isValidated) return false;
      if (filterStatus === 'validated' && !item.isValidated) return false;

      if (filterAction !== 'all' && item.result.recommendedAction !== filterAction) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = item.mortCode.toLowerCase().includes(query);
        const matchesLoc = item.locationName.toLowerCase().includes(query);
        const matchesNotes = item.notes.toLowerCase().includes(query);
        const matchesFeatures = item.detectedFeatures.some((f) => f.toLowerCase().includes(query));
        const matchesCasuistica = String(item.matrix128?.id || '').includes(query);
        if (!matchesCode && !matchesLoc && !matchesNotes && !matchesFeatures && !matchesCasuistica) {
          return false;
        }
      }

      return true;
    });
  }, [mortGroups, filterStatus, filterAction, searchQuery]);

  // Statistics summaries
  const stats = useMemo(() => {
    const totalMorts = mortGroups.length;
    const totalPhotos = mortGroups.reduce((acc, m) => acc + m.photos.length, 0);
    const validatedCount = mortGroups.filter((m) => m.isValidated).length;
    const immediateCount = mortGroups.filter((m) => m.result.recommendedAction === 'RETIRADA IMMEDIATA').length;
    const programmedCount = mortGroups.filter((m) => m.result.recommendedAction === 'RETIRADA PROGRAMADA').length;
    const lowPriorityCount = mortGroups.filter(
      (m) =>
        m.result.recommendedAction === 'PRIORITAT BAIXA / MITIGACIÓ' ||
        m.result.recommendedAction === 'AVALUACIÓ ESPECÍFICA'
    ).length;
    const keepCount = mortGroups.filter((m) => m.result.recommendedAction === 'CONSERVAR').length;

    const avgConfidence =
      totalMorts > 0
        ? Math.round(mortGroups.reduce((acc, m) => acc + (m.confidenceScore || 80), 0) / totalMorts)
        : 0;

    return {
      totalMorts,
      totalPhotos,
      validatedCount,
      immediateCount,
      programmedCount,
      lowPriorityCount,
      keepCount,
      avgConfidence,
    };
  }, [mortGroups]);

  // Selected Mort for detailed modal/drawer
  const selectedMort = useMemo(() => {
    if (!selectedMortId) return null;
    return mortGroups.find((m) => m.id === selectedMortId) || null;
  }, [selectedMortId, mortGroups]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-[#134E4A] text-white rounded-xl shadow-xs shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#134E4A]">
                  Pre-Anàlisi Automatitzat d'Imatges (Batch IA)
                </h2>
                <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#1B5E20] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#C8E6C9]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini Vision &amp; 128 Casuístiques
                </span>
              </div>
              <p className="text-sm text-[#4A5D52] mt-1 max-w-3xl leading-relaxed">
                Carregueu carpetes o lots de fotografies submarines. El motor d'IA identifica automàticament els blocs de
                fondeig, n'agrupa les imatges, analitza l'estat biològic (C1..C4) i assigna la casuística oficial exacta
                (1 a 128) per a la revisió i validació en bloc.
              </p>
            </div>
          </div>

          {/* Demo Lots Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#64746B]">Lots de Mostra:</span>
            <button
              id="btn-load-demo-montgo"
              onClick={() => handleLoadDemoLot('lot_montgo_6')}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
            >
              <Zap className="w-3.5 h-3.5 text-[#134E4A]" />
              Cala Montgó (6 Morts / 18 Fotos)
            </button>
            <button
              id="btn-load-demo-giverola"
              onClick={() => handleLoadDemoLot('lot_giverola_4')}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
            >
              <Zap className="w-3.5 h-3.5 text-[#134E4A]" />
              Cala Giverola (4 Morts / 10 Fotos)
            </button>
          </div>
        </div>

        {/* Upload Dropzone & Mode Selector */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-5 border-t border-[#E5E5DC]">
          {/* Upload by Folder */}
          <div
            id="dropzone-folder"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => folderInputRef.current?.click()}
            className="group relative cursor-pointer border-2 border-dashed border-[#134E4A]/30 hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F3F4EE] rounded-xl p-4 transition text-center flex flex-col items-center justify-center min-h-[110px]"
          >
            <input
              type="file"
              ref={folderInputRef}
              onChange={(e) => {
                if (e.target.files) processFiles(Array.from(e.target.files));
              }}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />
            <FolderOpen className="w-6 h-6 text-[#134E4A] group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold text-[#134E4A]">Carregar Carpeta d'Inspecció</span>
            <span className="text-[11px] text-[#64746B] mt-0.5">Agrupa fotos per subcarpetes o noms</span>
          </div>

          {/* Upload Multiple Image Files */}
          <div
            id="dropzone-files"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => filesInputRef.current?.click()}
            className="group relative cursor-pointer border-2 border-dashed border-[#134E4A]/30 hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F3F4EE] rounded-xl p-4 transition text-center flex flex-col items-center justify-center min-h-[110px]"
          >
            <input
              type="file"
              ref={filesInputRef}
              onChange={(e) => {
                if (e.target.files) processFiles(Array.from(e.target.files));
              }}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Upload className="w-6 h-6 text-[#134E4A] group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold text-[#134E4A]">Seleccionar Múltiples Imatges</span>
            <span className="text-[11px] text-[#64746B] mt-0.5">Ex: "MORT_01 (1).jpg", "12 (2).png"</span>
          </div>

          {/* Grouping Rule Information */}
          <div className="bg-[#E9E9E0]/70 border border-[#DCDCD2] rounded-xl p-3.5 flex flex-col justify-center text-xs text-[#4A5D52]">
            <div className="font-bold text-[#134E4A] flex items-center gap-1.5 mb-1">
              <Info className="w-4 h-4 text-[#134E4A]" />
              Patrons d'Agrupació Automàtica:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#556B5D]">
              <li>
                <span className="font-semibold">Parèntesis:</span> <code className="bg-white/60 px-1 rounded">MORT_01 (1).jpg</code>, <code className="bg-white/60 px-1 rounded">MORT_01 (2).jpg</code>
              </li>
              <li>
                <span className="font-semibold">Subcarpetes:</span> <code className="bg-white/60 px-1 rounded">/BLOC_03/DSC01.jpg</code>
              </li>
              <li>
                <span className="font-semibold">Seqüència:</span> <code className="bg-white/60 px-1 rounded">CM_04_1.jpg</code>, <code className="bg-white/60 px-1 rounded">CM_04_2.jpg</code>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live Processing Banner */}
      {isProcessing && (
        <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl p-5 shadow-xs animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#0369A1] font-bold text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
              <span>{processingProgress.currentName || 'Executant diagnosi per visió artificial i IA...'}</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#0369A1]">
              {processingProgress.current} / {processingProgress.total} ({Math.round((processingProgress.current / Math.max(1, processingProgress.total)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-[#BAE6FD] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0284C7] h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((processingProgress.current / Math.max(1, processingProgress.total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {importNotification && (
        <div className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-[#1B5E20] text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={onGoToInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-bold rounded-lg transition"
          >
            <Database className="w-3.5 h-3.5" />
            Veure a l'Inventari
          </button>
        </div>
      )}

      {/* Stats Summary & Bulk Actions Toolbar */}
      {mortGroups.length > 0 && (
        <div className="space-y-4">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#64746B] uppercase tracking-wider block">Morts Detectats</span>
              <span className="text-xl font-bold font-mono text-[#134E4A] mt-0.5 block">{stats.totalMorts}</span>
              <span className="text-[10px] text-[#64746B]">{stats.totalPhotos} fotos agrupades</span>
            </div>

            <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#64746B] uppercase tracking-wider block">Estat Validació</span>
              <span className="text-xl font-bold font-mono text-[#134E4A] mt-0.5 block">
                {stats.validatedCount} / {stats.totalMorts}
              </span>
              <span className="text-[10px] text-[#2E7D32] font-semibold">
                {Math.round((stats.validatedCount / Math.max(1, stats.totalMorts)) * 100)}% validats
              </span>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#991B1B] uppercase tracking-wider block">Retirada Immediata</span>
              <span className="text-xl font-bold font-mono text-[#DC2626] mt-0.5 block">{stats.immediateCount}</span>
              <span className="text-[10px] text-[#991B1B]">Impacte / Risc Màxim</span>
            </div>

            <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#C2410C] uppercase tracking-wider block">Programada</span>
              <span className="text-xl font-bold font-mono text-[#EA580C] mt-0.5 block">{stats.programmedCount}</span>
              <span className="text-[10px] text-[#C2410C]">Pla d'actuació</span>
            </div>

            <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#854D0E] uppercase tracking-wider block">Prioritat Baixa</span>
              <span className="text-xl font-bold font-mono text-[#CA8A04] mt-0.5 block">{stats.lowPriorityCount}</span>
              <span className="text-[10px] text-[#854D0E]">Mitigació cadena</span>
            </div>

            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-[#166534] uppercase tracking-wider block">Conservar</span>
              <span className="text-xl font-bold font-mono text-[#16A34A] mt-0.5 block">{stats.keepCount}</span>
              <span className="text-[10px] text-[#166534]">Escull / Mata viva</span>
            </div>
          </div>

          {/* Quick Actions and Settings Bar - Eines de Gestió i Validació en Bloc */}
          <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5DC]">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#134E4A]" />
                <h3 className="text-sm font-bold font-serif text-[#134E4A]">
                  Eines de Gestió i Validació en Bloc
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReanalyzeAllWithAI}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Re-analitzar amb IA
                </button>

                <button
                  onClick={handleValidateAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#1B5E20] rounded-lg border border-[#C8E6C9] transition"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
                  Validar Tots ({stats.totalMorts})
                </button>

                <button
                  onClick={handleExportBatchExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>

                <button
                  id="btn-import-official-inventory"
                  onClick={handleImportToOfficialInventory}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#134E4A] hover:bg-[#1A6460] text-white rounded-lg shadow-xs transition"
                >
                  <Database className="w-3.5 h-3.5" />
                  Incorporar a l'Inventari ({stats.totalMorts})
                </button>
              </div>
            </div>

            {/* Batch Toast Notice */}
            {batchActionToast && (
              <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-[#2E7D32] shrink-0" />
                <span>{batchActionToast}</span>
              </div>
            )}

            {/* Parameter Grid for Batch Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Cala / Nom de la Ubicació */}
              <div className="bg-white border border-[#D1D1C7] rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#134E4A] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#134E4A]" />
                    <span>Nom de la Cala</span>
                  </div>
                  <input
                    type="text"
                    value={defaultLocationName}
                    onChange={(e) => setDefaultLocationName(e.target.value)}
                    placeholder="Ex: Cala Montgó, Cala Giverola..."
                    className="w-full px-2.5 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] font-medium text-[#134E4A] focus:outline-none focus:border-[#134E4A]"
                  />
                </div>
                <button
                  onClick={handleApplyLocationToAll}
                  title="Aplica aquest nom de cala a tots els morts del lot"
                  className="w-full py-1 text-[11px] font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  Aplicar Cala a Tots
                </button>
              </div>

              {/* 2. Fondària */}
              <div className="bg-white border border-[#D1D1C7] rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#134E4A] mb-1">
                    <Layers className="w-3.5 h-3.5 text-[#134E4A]" />
                    <span>Fondària (Profunditat)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={defaultDepthM}
                      onChange={(e) => setDefaultDepthM(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] font-medium text-[#134E4A] focus:outline-none focus:border-[#134E4A]"
                    />
                    <span className="text-xs font-bold text-[#4A5D52]">metres</span>
                  </div>
                </div>
                <button
                  onClick={handleApplyDepthToAll}
                  title="Aplica aquesta fondària a tots els morts del lot"
                  className="w-full py-1 text-[11px] font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  Aplicar Fondària a Tots
                </button>
              </div>

              {/* 3. Número de Blocs */}
              <div className="bg-white border border-[#D1D1C7] rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#134E4A] mb-1">
                    <Box className="w-3.5 h-3.5 text-[#134E4A]" />
                    <span>Número de Blocs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultNumberOfBlocks((prev) => Math.max(1, prev - 1))}
                      className="p-1 rounded-lg bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] border border-[#D1D1C7]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={defaultNumberOfBlocks}
                      onChange={(e) => setDefaultNumberOfBlocks(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full text-center px-2 py-1.5 text-xs font-bold border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] text-[#134E4A] focus:outline-none focus:border-[#134E4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setDefaultNumberOfBlocks((prev) => Math.min(10, prev + 1))}
                      className="p-1 rounded-lg bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] border border-[#D1D1C7]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-[#64746B] whitespace-nowrap">
                      {defaultNumberOfBlocks === 1 ? '1 bloc' : `${defaultNumberOfBlocks} blocs`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleApplyBlocksToAll}
                  title="Aplica el nombre de blocs a tots els morts del lot"
                  className="w-full py-1 text-[11px] font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  Aplicar Blocs a Tots
                </button>
              </div>

              {/* 4. Tamany de Cada Bloc */}
              <div className="bg-white border border-[#D1D1C7] rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#134E4A] mb-1">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#134E4A]" />
                      Tamany / Mida del Bloc
                    </span>
                    <span className="text-[10px] text-[#64746B] font-mono">
                      {defaultDimensions.lengthCm}×{defaultDimensions.widthCm}×{defaultDimensions.heightCm} cm
                    </span>
                  </div>

                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectDimensionPreset(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] font-medium text-[#134E4A] focus:outline-none focus:border-[#134E4A]"
                  >
                    {DIMENSION_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>

                  {/* Custom Dimensions inputs if chosen */}
                  {selectedPresetId === 'custom' && (
                    <div className="grid grid-cols-3 gap-1 mt-1.5">
                      <div>
                        <span className="text-[9px] text-[#64746B] block">Llarg (cm)</span>
                        <input
                          type="number"
                          value={defaultDimensions.lengthCm}
                          onChange={(e) =>
                            setDefaultDimensions((prev) => ({ ...prev, lengthCm: Number(e.target.value) || 0 }))
                          }
                          className="w-full px-1.5 py-1 text-[11px] border border-[#D1D1C7] rounded bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#64746B] block">Ample (cm)</span>
                        <input
                          type="number"
                          value={defaultDimensions.widthCm}
                          onChange={(e) =>
                            setDefaultDimensions((prev) => ({ ...prev, widthCm: Number(e.target.value) || 0 }))
                          }
                          className="w-full px-1.5 py-1 text-[11px] border border-[#D1D1C7] rounded bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#64746B] block">Alt (cm)</span>
                        <input
                          type="number"
                          value={defaultDimensions.heightCm}
                          onChange={(e) =>
                            setDefaultDimensions((prev) => ({ ...prev, heightCm: Number(e.target.value) || 0 }))
                          }
                          className="w-full px-1.5 py-1 text-[11px] border border-[#D1D1C7] rounded bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleApplyDimensionsToAll}
                  title="Aplica aquestes mides a tots els morts del lot"
                  className="w-full py-1 text-[11px] font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                >
                  Aplicar Mida a Tots
                </button>
              </div>
            </div>

            {/* 5. Critèri de l'Avaluador en Bloc (Quadrats clicables) */}
            <div className="bg-white border-2 border-emerald-800/30 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5DC] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#134E4A] text-white flex items-center justify-center shadow-xs">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#134E4A] flex items-center gap-1.5">
                      Critèri de l'Avaluador en Bloc
                      {getActiveEvaluatorCriteriaLabels(defaultEvaluatorCriteria).length > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                          {getActiveEvaluatorCriteriaLabels(defaultEvaluatorCriteria).length} actiu
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-[#64746B] block">
                      Selecciona els criteris d'avaluador per aplicar a tots els morts del lot.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleClearDefaultEvaluatorCriteria}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                  >
                    Netejar Criteri
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyEvaluatorCriteriaToAll}
                    className="px-3 py-1 text-[11px] font-bold bg-[#134E4A] hover:bg-[#1A6460] text-white rounded-lg shadow-xs transition flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-[#86EFAC]" />
                    Aplicar Criteri a Tots
                  </button>
                </div>
              </div>

              {/* Grid of clickable criteria squares */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {/* 1. Absència de posidònia/hàbitats protegits */}
                <div
                  onClick={() => toggleDefaultEvaluatorCriteria('absencePosidoniaOrHabitats')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                    defaultEvaluatorCriteria.absencePosidoniaOrHabitats
                      ? 'bg-emerald-50 border-emerald-600 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#D1D1C7] hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    defaultEvaluatorCriteria.absencePosidoniaOrHabitats
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : 'bg-white border-[#A8A29E]'
                  }`}>
                    {defaultEvaluatorCriteria.absencePosidoniaOrHabitats ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-[#134E4A]">
                    Absència de posidònia/hàbitats protegits
                  </div>
                </div>

                {/* 2. Retirar mort de forma immediata */}
                <div
                  onClick={() => toggleDefaultEvaluatorCriteria('immediateRemoval')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                    defaultEvaluatorCriteria.immediateRemoval
                      ? 'bg-rose-50 border-rose-600 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#D1D1C7] hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    defaultEvaluatorCriteria.immediateRemoval
                      ? 'bg-rose-600 border-rose-700 text-white'
                      : 'bg-white border-[#A8A29E]'
                  }`}>
                    {defaultEvaluatorCriteria.immediateRemoval ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-rose-950">
                    Retirar mort de forma immediata, a criteri de l'avaluador
                  </div>
                </div>

                {/* 3. Retirar mort de forma programada */}
                <div
                  onClick={() => toggleDefaultEvaluatorCriteria('scheduledRemoval')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                    defaultEvaluatorCriteria.scheduledRemoval
                      ? 'bg-amber-50 border-amber-600 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#D1D1C7] hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    defaultEvaluatorCriteria.scheduledRemoval
                      ? 'bg-amber-600 border-amber-700 text-white'
                      : 'bg-white border-[#A8A29E]'
                  }`}>
                    {defaultEvaluatorCriteria.scheduledRemoval ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-amber-950">
                    Retirar mort de forma programada, a criteri de l'avaluador
                  </div>
                </div>

                {/* 4. Neutralitzar mort i mantenir */}
                <div
                  onClick={() => toggleDefaultEvaluatorCriteria('neutralizeAndMaintain')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                    defaultEvaluatorCriteria.neutralizeAndMaintain
                      ? 'bg-sky-50 border-sky-600 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#D1D1C7] hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    defaultEvaluatorCriteria.neutralizeAndMaintain
                      ? 'bg-sky-600 border-sky-700 text-white'
                      : 'bg-white border-[#A8A29E]'
                  }`}>
                    {defaultEvaluatorCriteria.neutralizeAndMaintain ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-sky-950">
                    Neutralitzar mort i mantenir, a criteri de l'avaluador
                  </div>
                </div>

                {/* 5. No retirar mort */}
                <div
                  onClick={() => toggleDefaultEvaluatorCriteria('noRemoval')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none sm:col-span-2 ${
                    defaultEvaluatorCriteria.noRemoval
                      ? 'bg-teal-50 border-teal-600 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#D1D1C7] hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    defaultEvaluatorCriteria.noRemoval
                      ? 'bg-teal-600 border-teal-700 text-white'
                      : 'bg-white border-[#A8A29E]'
                  }`}>
                    {defaultEvaluatorCriteria.noRemoval ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-teal-950">
                    No retirar mort a criteri de l'avaluador
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Comentari / Notes en Bloc + Botó d'aplicació total */}
            <div className="bg-white border border-[#D1D1C7] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#134E4A] shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#134E4A]" />
                  <span>Comentari en Bloc:</span>
                </div>
                <input
                  type="text"
                  value={defaultComment}
                  onChange={(e) => setDefaultComment(e.target.value)}
                  placeholder="Escriu un comentari o observació per assignar al lot..."
                  className="flex-1 px-3 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] text-[#134E4A] focus:outline-none focus:border-[#134E4A]"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleApplyCommentToAll('replace')}
                    title="Substitueix les notes actuals per aquest comentari"
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                  >
                    Assignar Comentari
                  </button>
                  <button
                    onClick={() => handleApplyCommentToAll('append')}
                    title="Afegeix aquest comentari al final de les notes existents de cada mort"
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                  >
                    Afegir a Notes
                  </button>
                </div>
              </div>

              <div className="shrink-0 border-t md:border-t-0 md:border-l border-[#E5E5DC] pt-2 md:pt-0 md:pl-3">
                <button
                  onClick={handleApplyAllDefaultsToAll}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#134E4A] hover:bg-[#1A6460] text-white rounded-lg shadow-xs transition"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#86EFAC]" />
                  Aplicar Tot el Conjunt al Lot
                </button>
              </div>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[#E9E9E0] p-1 rounded-lg border border-[#D1D1C7]">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    filterStatus === 'all' ? 'bg-[#134E4A] text-white' : 'text-[#4A5D52] hover:bg-[#DCDCD2]'
                  }`}
                >
                  Tots ({mortGroups.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    filterStatus === 'pending' ? 'bg-[#134E4A] text-white' : 'text-[#4A5D52] hover:bg-[#DCDCD2]'
                  }`}
                >
                  Pendents ({mortGroups.length - stats.validatedCount})
                </button>
                <button
                  onClick={() => setFilterStatus('validated')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    filterStatus === 'validated' ? 'bg-[#134E4A] text-white' : 'text-[#4A5D52] hover:bg-[#DCDCD2]'
                  }`}
                >
                  Validats ({stats.validatedCount})
                </button>
              </div>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-[#FAF9F6] text-[#134E4A] font-semibold"
              >
                <option value="all">Totes les Accions</option>
                <option value="RETIRADA IMMEDIATA">Retirada Immediata</option>
                <option value="RETIRADA PROGRAMADA">Retirada Programada</option>
                <option value="PRIORITAT BAIXA / MITIGACIÓ">Prioritat Baixa / Mitigació</option>
                <option value="CONSERVAR">Conservar</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cercar per codi, casuística, espècie..."
                className="px-3 py-1.5 text-xs border border-[#D1D1C7] rounded-lg bg-white text-[#134E4A] w-full sm:w-64 focus:outline-none focus:border-[#134E4A]"
              />

              <div className="flex items-center bg-[#E9E9E0] p-1 rounded-lg border border-[#D1D1C7]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    viewMode === 'cards' ? 'bg-[#134E4A] text-white' : 'text-[#4A5D52]'
                  }`}
                >
                  Targetes
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    viewMode === 'table' ? 'bg-[#134E4A] text-white' : 'text-[#4A5D52]'
                  }`}
                >
                  Taula
                </button>
              </div>
            </div>
          </div>

          {/* Mort Cards Grid View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGroups.map((mort) => {
                const action = mort.result.recommendedAction;
                const isImmediate = action === 'RETIRADA IMMEDIATA';
                const isProgrammed = action === 'RETIRADA PROGRAMADA';
                const isKeep = action === 'CONSERVAR';
                const isLow = action === 'PRIORITAT BAIXA / MITIGACIÓ' || action === 'AVALUACIÓ ESPECÍFICA';

                const actionBg = isImmediate
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                  : isProgrammed
                  ? 'bg-[#FFF7ED] border-[#FFEDD5] text-[#EA580C]'
                  : isKeep
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                  : 'bg-[#FEFCE8] border-[#FEF08A] text-[#CA8A04]';

                return (
                  <div
                    key={mort.id}
                    className={`bg-[#FAF9F6] border ${
                      mort.isValidated ? 'border-[#86EFAC] ring-1 ring-[#86EFAC]' : 'border-[#D1D1C7]'
                    } rounded-2xl p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between`}
                  >
                    <div>
                      {/* Top Row: Mort Code, Validation, Action Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold font-mono text-[#134E4A]">{mort.mortCode}</h3>
                            {mort.isValidated ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 rounded-full border border-[#C8E6C9]">
                                <Check className="w-3 h-3 text-[#2E7D32]" />
                                Validat
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold bg-[#F5F5F0] text-[#64746B] px-2 py-0.5 rounded-full border border-[#D1D1C7]">
                                Pendent
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64746B] mt-0.5">
                            {mort.locationName} • {mort.photos.length} fotos ({mort.folderOrPrefix})
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${actionBg}`}
                          >
                            {action}
                          </span>
                          <div className="text-[11px] font-mono text-[#4A5D52] font-semibold mt-1">
                            Puntuació: <span className="font-bold">{mort.result.totalScore} pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Photo Thumbnails Carousel */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {mort.photos.map((photo, pIdx) => (
                          <div
                            key={photo.id}
                            onClick={() =>
                              setPreviewPhoto({
                                url: photo.url,
                                title: photo.name,
                                index: pIdx + 1,
                                total: mort.photos.length,
                                mortCode: mort.mortCode,
                              })
                            }
                            className="relative shrink-0 w-24 h-20 rounded-xl overflow-hidden border border-[#D1D1C7] cursor-pointer group hover:border-[#134E4A] bg-[#111]"
                          >
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                              #{photo.photoIndex || pIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 128 Casuística & AI Confidence / Option Badges */}
                      <div className="flex items-center gap-2 flex-wrap my-2.5">
                        <span className="inline-flex items-center gap-1 bg-[#134E4A] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                          Casuística #{mort.matrix128?.id || '—'} / 128
                        </span>

                        {mort.confidenceScore !== undefined ? (
                          <div className="inline-flex items-center gap-1.5 bg-[#E0F2FE] text-[#0369A1] text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#BAE6FD]">
                            <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{mort.confidenceScore}% Confiança IA ({mort.aiSource === 'gemini_vision' ? 'Gemini' : 'Òptica'})</span>
                            <button
                              type="button"
                              onClick={() => handleAnalyzeSingleMortWithAI(mort.id)}
                              disabled={analyzingMortIds.has(mort.id)}
                              className="ml-1 px-1.5 py-0.5 bg-white hover:bg-sky-50 text-[#0369A1] rounded text-[10px] font-bold border border-[#BAE6FD] transition"
                              title="Tornar a analitzar aquest mort amb IA"
                            >
                              {analyzingMortIds.has(mort.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin inline" />
                              ) : (
                                'Reanalitzar'
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAnalyzeSingleMortWithAI(mort.id)}
                            disabled={analyzingMortIds.has(mort.id)}
                            className="inline-flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold px-3 py-1 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
                            title="Executar diagnòstic IA per a aquest mort"
                          >
                            {analyzingMortIds.has(mort.id) ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Analitzant IA...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Analitzar amb IA</span>
                              </>
                            )}
                          </button>
                        )}

                        <span className="text-[11px] text-[#4A5D52] font-mono bg-[#E9E9E0] px-2 py-1 rounded-lg border border-[#D1D1C7]">
                          {mort.numberOfBlocks || 1} {mort.numberOfBlocks === 1 ? 'bloc' : 'blocs'} (
                          {mort.dimensions?.lengthCm || 80}×{mort.dimensions?.widthCm || 80}×{mort.dimensions?.heightCm || 40} cm)
                        </span>
                      </div>

                      {/* Evaluator Criteria Diagnostic Badge (if any active) */}
                      {mort.evaluatorCriteria && getActiveEvaluatorCriteriaLabels(mort.evaluatorCriteria).length > 0 && (
                        <div className="mb-2.5 bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 flex items-start gap-2 shadow-xs">
                          <UserCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-emerald-950 block">Diagnòstic Criteri Avaluador:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getActiveEvaluatorCriteriaLabels(mort.evaluatorCriteria).map((lbl, lIdx) => (
                                <span
                                  key={lIdx}
                                  className="inline-block bg-white text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold"
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Physical & Location Metadata (Cala, Fondària, Blocs, Tamany) */}
                      <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-2.5 text-xs text-[#4A5D52] space-y-2 mb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#134E4A]" />
                              Cala / Ubicació
                            </label>
                            <input
                              type="text"
                              value={mort.locationName}
                              onChange={(e) => updateMortCriteria(mort.id, 'locationName', e.target.value)}
                              placeholder="Nom de la cala..."
                              className="w-full mt-0.5 text-xs px-2 py-1 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-medium focus:outline-none focus:border-[#134E4A]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1">
                                <Layers className="w-3 h-3 text-[#134E4A]" />
                                Fondària (m)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={mort.validatedDepthM}
                                onChange={(e) =>
                                  updateMortCriteria(mort.id, 'validatedDepthM', Math.max(1, Number(e.target.value) || 1))
                                }
                                className="w-full mt-0.5 text-xs px-2 py-1 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-mono font-medium focus:outline-none focus:border-[#134E4A]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1">
                                <Box className="w-3 h-3 text-[#134E4A]" />
                                Nº Blocs
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={mort.numberOfBlocks || 1}
                                onChange={(e) => {
                                  const nb = Math.max(1, Number(e.target.value) || 1);
                                  updateMortCriteria(mort.id, 'numberOfBlocks', nb);
                                  updateMortCriteria(mort.id, 'connectionMode', nb > 1 ? 'chained' : 'isolated');
                                }}
                                className="w-full mt-0.5 text-xs px-2 py-1 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-mono font-medium focus:outline-none focus:border-[#134E4A]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Block Dimensions L x W x H cm */}
                        <div>
                          <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center justify-between mb-0.5">
                            <span className="flex items-center gap-1">
                              <Scale className="w-3 h-3 text-[#134E4A]" />
                              Mida del bloc (Llarg × Ample × Alt en cm)
                            </span>
                            <span className="text-[9px] font-normal text-[#64746B]">
                              Vol: {(((mort.dimensions?.lengthCm || 80) * (mort.dimensions?.widthCm || 80) * (mort.dimensions?.heightCm || 40)) / 1000000).toFixed(3)} m³
                            </span>
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="flex items-center gap-1 bg-white border border-[#D1D1C7] rounded-lg px-2 py-0.5">
                              <span className="text-[10px] text-[#64746B]">L:</span>
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={mort.dimensions?.lengthCm || 80}
                                onChange={(e) =>
                                  updateMortCriteria(mort.id, 'dimensions', {
                                    ...(mort.dimensions || defaultDimensions),
                                    lengthCm: Number(e.target.value) || 80,
                                  })
                                }
                                className="w-full text-xs text-[#134E4A] font-mono focus:outline-none"
                              />
                              <span className="text-[10px] text-[#64746B]">cm</span>
                            </div>

                            <div className="flex items-center gap-1 bg-white border border-[#D1D1C7] rounded-lg px-2 py-0.5">
                              <span className="text-[10px] text-[#64746B]">W:</span>
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={mort.dimensions?.widthCm || 80}
                                onChange={(e) =>
                                  updateMortCriteria(mort.id, 'dimensions', {
                                    ...(mort.dimensions || defaultDimensions),
                                    widthCm: Number(e.target.value) || 80,
                                  })
                                }
                                className="w-full text-xs text-[#134E4A] font-mono focus:outline-none"
                              />
                              <span className="text-[10px] text-[#64746B]">cm</span>
                            </div>

                            <div className="flex items-center gap-1 bg-white border border-[#D1D1C7] rounded-lg px-2 py-0.5">
                              <span className="text-[10px] text-[#64746B]">H:</span>
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={mort.dimensions?.heightCm || 40}
                                onChange={(e) =>
                                  updateMortCriteria(mort.id, 'dimensions', {
                                    ...(mort.dimensions || defaultDimensions),
                                    heightCm: Number(e.target.value) || 40,
                                  })
                                }
                                className="w-full text-xs text-[#134E4A] font-mono focus:outline-none"
                              />
                              <span className="text-[10px] text-[#64746B]">cm</span>
                            </div>
                          </div>
                        </div>

                        {/* Editable Comment / Note */}
                        <div>
                          <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1 mb-0.5">
                            <MessageSquare className="w-3 h-3 text-[#134E4A]" />
                            Comentari / Observacions
                          </label>
                          <textarea
                            rows={2}
                            value={mort.notes}
                            onChange={(e) => updateMortCriteria(mort.id, 'notes', e.target.value)}
                            placeholder="Afegeix comentaris o observacions del mort..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] focus:outline-none focus:border-[#134E4A] resize-none"
                          />
                        </div>
                      </div>

                      {/* Detected Biological Features */}
                      <div className="bg-[#E9E9E0]/50 border border-[#E5E5DC] rounded-xl p-2.5 text-xs text-[#4A5D52] space-y-1 mb-3">
                        <div className="font-semibold text-[#134E4A] text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#134E4A]" />
                          Trets ecològics detectats:
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {mort.detectedFeatures.map((f, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[11px] bg-white text-[#134E4A] border border-[#D1D1C7] px-2 py-0.5 rounded-md font-medium"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Criteria Adjusters (C1..C4) */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-semibold text-[#64746B] uppercase block">C1 (Espècies)</label>
                          <select
                            value={mort.validatedC1}
                            onChange={(e) => updateMortCriteria(mort.id, 'validatedC1', e.target.value as any)}
                            className="w-full mt-0.5 text-xs p-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-medium"
                          >
                            <option value="high_coverage_or_protected">Protegides &gt;10% (-12)</option>
                            <option value="low_coverage">Amenaçades &lt;10% (-8)</option>
                            <option value="renaturalized_algal">Algal / Escull (-4)</option>
                            <option value="none">Sense espècies (0)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#64746B] uppercase block">C2 (Impacte / Cadena)</label>
                          <select
                            value={mort.validatedC2}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateMortCriteria(mort.id, 'validatedC2', val as any);
                              updateMortCriteria(mort.id, 'validatedHasMobileElements', val === 'active_erosion_halo');
                            }}
                            className="w-full mt-0.5 text-xs p-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-medium"
                          >
                            <option value="active_erosion_halo">Halo actiu / Cadena (+6)</option>
                            <option value="none">Sense abrasió (0)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#64746B] uppercase block">C3 (Risc Dinàmic)</label>
                          <select
                            value={mort.validatedC3}
                            onChange={(e) => updateMortCriteria(mort.id, 'validatedC3', e.target.value as any)}
                            className="w-full mt-0.5 text-xs p-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-medium"
                          >
                            <option value="high_risk">Risc Alt &lt;6m (+4)</option>
                            <option value="moderate_risk">Risc Mitjà (+2)</option>
                            <option value="low_risk">Risc Baix (+1)</option>
                            <option value="no_risk">Nul &gt;15m (0)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#64746B] uppercase block">C4 (Estabilitat)</label>
                          <select
                            value={mort.validatedC4}
                            onChange={(e) => updateMortCriteria(mort.id, 'validatedC4', e.target.value as any)}
                            className="w-full mt-0.5 text-xs p-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-medium"
                          >
                            <option value="not_buried_no_void">Lliure sorra/roca (+8)</option>
                            <option value="partial_burial_no_posidonia">Enfonsat parcial (+4)</option>
                            <option value="not_buried_generates_void">Genera buit (-6)</option>
                            <option value="fixed_by_roots_or_sediment">Arrelat Posidònia (-12)</option>
                          </select>
                        </div>
                      </div>

                      {/* Critèri de l'Avaluador for this Mort */}
                      <div className="mt-3 bg-emerald-50/40 border border-emerald-800/20 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#134E4A] flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#134E4A]" />
                            Critèri de l'Avaluador
                          </span>
                          {mort.evaluatorCriteria && getActiveEvaluatorCriteriaLabels(mort.evaluatorCriteria).length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateMortCriteria(mort.id, 'evaluatorCriteria' as any, {
                                  absencePosidoniaOrHabitats: false,
                                  immediateRemoval: false,
                                  scheduledRemoval: false,
                                  neutralizeAndMaintain: false,
                                  noRemoval: false,
                                })
                              }
                              className="text-[10px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                            >
                              Netejar
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          {/* 1. Absència de posidònia */}
                          <div
                            onClick={() => toggleMortEvaluatorCriteria(mort.id, 'absencePosidoniaOrHabitats')}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                              mort.evaluatorCriteria?.absencePosidoniaOrHabitats
                                ? 'bg-emerald-100/70 border-emerald-500'
                                : 'bg-white border-[#D1D1C7] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              mort.evaluatorCriteria?.absencePosidoniaOrHabitats
                                ? 'bg-emerald-600 border-emerald-700 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}>
                              {mort.evaluatorCriteria?.absencePosidoniaOrHabitats ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : (
                                <Square className="w-3 h-3 text-transparent" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-[#134E4A]">
                              Absència de posidònia/hàbitats protegits
                            </span>
                          </div>

                          {/* 2. Retirar immediat */}
                          <div
                            onClick={() => toggleMortEvaluatorCriteria(mort.id, 'immediateRemoval')}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                              mort.evaluatorCriteria?.immediateRemoval
                                ? 'bg-rose-100/70 border-rose-500'
                                : 'bg-white border-[#D1D1C7] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              mort.evaluatorCriteria?.immediateRemoval
                                ? 'bg-rose-600 border-rose-700 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}>
                              {mort.evaluatorCriteria?.immediateRemoval ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : (
                                <Square className="w-3 h-3 text-transparent" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-rose-950">
                              Retirar mort de forma immediata, a criteri de l'avaluador
                            </span>
                          </div>

                          {/* 3. Retirar programat */}
                          <div
                            onClick={() => toggleMortEvaluatorCriteria(mort.id, 'scheduledRemoval')}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                              mort.evaluatorCriteria?.scheduledRemoval
                                ? 'bg-amber-100/70 border-amber-500'
                                : 'bg-white border-[#D1D1C7] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              mort.evaluatorCriteria?.scheduledRemoval
                                ? 'bg-amber-600 border-amber-700 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}>
                              {mort.evaluatorCriteria?.scheduledRemoval ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : (
                                <Square className="w-3 h-3 text-transparent" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-amber-950">
                              Retirar mort de forma programada, a criteri de l'avaluador
                            </span>
                          </div>

                          {/* 4. Neutralitzar */}
                          <div
                            onClick={() => toggleMortEvaluatorCriteria(mort.id, 'neutralizeAndMaintain')}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                              mort.evaluatorCriteria?.neutralizeAndMaintain
                                ? 'bg-sky-100/70 border-sky-500'
                                : 'bg-white border-[#D1D1C7] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              mort.evaluatorCriteria?.neutralizeAndMaintain
                                ? 'bg-sky-600 border-sky-700 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}>
                              {mort.evaluatorCriteria?.neutralizeAndMaintain ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : (
                                <Square className="w-3 h-3 text-transparent" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-sky-950">
                              Neutralitzar mort i mantenir, a criteri de l'avaluador
                            </span>
                          </div>

                          {/* 5. No retirar */}
                          <div
                            onClick={() => toggleMortEvaluatorCriteria(mort.id, 'noRemoval')}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                              mort.evaluatorCriteria?.noRemoval
                                ? 'bg-teal-100/70 border-teal-500'
                                : 'bg-white border-[#D1D1C7] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              mort.evaluatorCriteria?.noRemoval
                                ? 'bg-teal-600 border-teal-700 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}>
                              {mort.evaluatorCriteria?.noRemoval ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : (
                                <Square className="w-3 h-3 text-transparent" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-teal-950">
                              No retirar mort a criteri de l'avaluador
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: Validation Button, Delete Button and Details link */}
                    <div className="mt-4 pt-3 border-t border-[#E5E5DC] flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedMortId(mort.id)}
                        className="text-xs font-semibold text-[#134E4A] hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detalls Tècnics
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteMort(mort.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition active:scale-95"
                          title={`Eliminar el mort ${mort.mortCode} del lot`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Eliminar</span>
                        </button>

                        <button
                          onClick={() => toggleValidateMort(mort.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            mort.isValidated
                              ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] hover:bg-[#C8E6C9]'
                              : 'bg-[#134E4A] text-white hover:bg-[#1A6460]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {mort.isValidated ? 'Validat' : 'Marcar Validat'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#E9E9E0] text-[#134E4A] border-b border-[#D1D1C7] font-serif font-bold">
                      <th className="py-3 px-3">Codi</th>
                      <th className="py-3 px-3">Fotos</th>
                      <th className="py-3 px-3">Cala / Ubicació</th>
                      <th className="py-3 px-3">Fondària</th>
                      <th className="py-3 px-3">Blocs & Tamany</th>
                      <th className="py-3 px-3">Casuística 128</th>
                      <th className="py-3 px-3">Anàlisi IA</th>
                      <th className="py-3 px-3">C1 (Esp.)</th>
                      <th className="py-3 px-3">C2 (Imp.)</th>
                      <th className="py-3 px-3">C3 (Din.)</th>
                      <th className="py-3 px-3">C4 (Est.)</th>
                      <th className="py-3 px-3">Punts</th>
                      <th className="py-3 px-3">Acció Recomanada</th>
                      <th className="py-3 px-3">Criteri Avaluador</th>
                      <th className="py-3 px-3">Comentari</th>
                      <th className="py-3 px-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5DC]">
                    {filteredGroups.map((mort) => {
                      const criteriaLabels = mort.evaluatorCriteria
                        ? getActiveEvaluatorCriteriaLabels(mort.evaluatorCriteria)
                        : [];
                      return (
                        <tr key={mort.id} className="hover:bg-[#F3F4EE] transition">
                          <td className="py-3 px-3 font-mono font-bold text-[#134E4A]">{mort.mortCode}</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() =>
                                mort.photos[0] &&
                                setPreviewPhoto({
                                  url: mort.photos[0].url,
                                  title: mort.photos[0].name,
                                  index: 1,
                                  total: mort.photos.length,
                                  mortCode: mort.mortCode,
                                })
                              }
                              className="font-mono text-[#0369A1] hover:underline flex items-center gap-1"
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              {mort.photos.length}
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={mort.locationName}
                              onChange={(e) => updateMortCriteria(mort.id, 'locationName', e.target.value)}
                              className="w-28 px-1.5 py-0.5 text-[11px] border border-[#D1D1C7] rounded bg-white text-[#134E4A]"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={mort.validatedDepthM}
                                onChange={(e) =>
                                  updateMortCriteria(mort.id, 'validatedDepthM', Math.max(1, Number(e.target.value) || 1))
                                }
                                className="w-12 px-1 py-0.5 text-[11px] border border-[#D1D1C7] rounded bg-white text-[#134E4A] font-mono"
                              />
                              <span className="text-[10px] text-[#64746B]">m</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px]">
                            <span className="font-semibold text-[#134E4A]">
                              {mort.numberOfBlocks || 1} bl.
                            </span>{' '}
                            <span className="text-[10px] font-mono text-[#64746B]">
                              ({mort.dimensions?.lengthCm || 80}×{mort.dimensions?.widthCm || 80}×{mort.dimensions?.heightCm || 40})
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#134E4A]">#{mort.matrix128?.id || '—'}</td>
                          <td className="py-2 px-3">
                            {mort.confidenceScore !== undefined ? (
                              <button
                                type="button"
                                onClick={() => handleAnalyzeSingleMortWithAI(mort.id)}
                                disabled={analyzingMortIds.has(mort.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] rounded hover:bg-[#BAE6FD] transition"
                                title="Reanalitzar amb IA"
                              >
                                {analyzingMortIds.has(mort.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-[#0284C7]" />
                                )}
                                <span>{mort.confidenceScore}%</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAnalyzeSingleMortWithAI(mort.id)}
                                disabled={analyzingMortIds.has(mort.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#0D9488] text-white rounded hover:bg-[#0F766E] transition disabled:opacity-50"
                                title="Executar anàlisi IA"
                              >
                                {analyzingMortIds.has(mort.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                )}
                                <span>IA</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px]">{mort.validatedC1}</td>
                          <td className="py-3 px-3 text-[11px]">{mort.validatedC2}</td>
                          <td className="py-3 px-3 text-[11px]">{mort.validatedC3}</td>
                          <td className="py-3 px-3 text-[11px]">{mort.validatedC4}</td>
                          <td className="py-3 px-3 font-mono font-bold">{mort.result.totalScore}</td>
                          <td className="py-3 px-3 font-bold text-[11px]">{mort.result.recommendedAction}</td>
                          <td className="py-2 px-3 text-[11px]">
                            {criteriaLabels.length > 0 ? (
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                {criteriaLabels.map((l, i) => (
                                  <span
                                    key={i}
                                    className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight"
                                  >
                                    {l}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#A8A29E] italic text-[10px]">Sense criteri</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={mort.notes || ''}
                              onChange={(e) => updateMortCriteria(mort.id, 'notes', e.target.value)}
                              placeholder="Comentari..."
                              className="w-32 px-1.5 py-0.5 text-[11px] border border-[#D1D1C7] rounded bg-white text-[#134E4A]"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteMort(mort.id)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition"
                                title="Eliminar aquest mort"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleValidateMort(mort.id)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                                  mort.isValidated
                                    ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]'
                                    : 'bg-[#134E4A] text-white'
                                }`}
                              >
                                {mort.isValidated ? 'Validat' : 'Validar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no photos or demo lot loaded */}
      {mortGroups.length === 0 && !isProcessing && (
        <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-[#E9E9E0] text-[#134E4A] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <FileImage className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#134E4A]">Cap Lot d'Imatges Carregat</h3>
            <p className="text-xs text-[#64746B] max-w-md mx-auto mt-1">
              Arrossegueu una carpeta de fotos submarines, seleccioneu fitxers des del vostre equip o proveu directament
              amb els lots de mostra precarregats per veure el diagnòstic automatitzat.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => handleLoadDemoLot('lot_montgo_6')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#134E4A] hover:bg-[#1A6460] text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Zap className="w-4 h-4 text-[#86EFAC]" />
              Provar Lot Cala Montgó (6 Morts)
            </button>
            <button
              onClick={() => handleLoadDemoLot('lot_giverola_4')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] text-xs font-bold rounded-xl border border-[#D1D1C7] transition"
            >
              <Zap className="w-4 h-4 text-[#134E4A]" />
              Provar Lot Cala Giverola (4 Morts)
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-2xl max-w-3xl w-full overflow-hidden border border-[#D1D1C7] shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#134E4A] text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{previewPhoto.mortCode}</h4>
                <span className="text-xs text-[#A7F3D0] font-mono">
                  Foto {previewPhoto.index} de {previewPhoto.total} • {previewPhoto.title}
                </span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition"
              >
                Tancar
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[68vh] max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Technical Sheet Drawer / Modal */}
      {selectedMort && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-2xl max-w-2xl w-full border border-[#D1D1C7] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1D1C7]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-mono text-[#134E4A]">{selectedMort.mortCode}</h3>
                  <span className="bg-[#134E4A] text-white text-xs font-mono font-bold px-2 py-0.5 rounded">
                    Casuística #{selectedMort.matrix128?.id} / 128
                  </span>
                </div>
                <p className="text-xs text-[#64746B] mt-0.5">{selectedMort.locationName}</p>
              </div>
              <button
                onClick={() => setSelectedMortId(null)}
                className="px-3 py-1 bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg text-xs font-bold"
              >
                Tancar
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#4A5D52]">
              <div className="bg-[#E9E9E0]/50 p-3 rounded-xl border border-[#DCDCD2]">
                <span className="font-bold text-[#134E4A] block mb-1">Acció Oficial Recomanada:</span>
                <span className="font-bold text-sm text-[#134E4A]">{selectedMort.result.recommendedAction}</span>
                <p className="text-[11px] text-[#4A5D52] mt-1">{selectedMort.matrix128?.justificacio}</p>
              </div>

              <div>
                <span className="font-bold text-[#134E4A] block mb-1">Observacions Visuals i d'IA:</span>
                <p className="text-xs text-[#4A5D52] bg-white p-3 rounded-xl border border-[#D1D1C7]">
                  {selectedMort.visualObservations}
                </p>
              </div>

              {/* Evaluator Criteria in Details Modal */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#134E4A] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#134E4A]" />
                    Critèri de l'Avaluador (Complement al Diagnòstic)
                  </span>
                  {selectedMort.evaluatorCriteria &&
                    getActiveEvaluatorCriteriaLabels(selectedMort.evaluatorCriteria).length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMortCriteria(selectedMort.id, 'evaluatorCriteria' as any, {
                            absencePosidoniaOrHabitats: false,
                            immediateRemoval: false,
                            scheduledRemoval: false,
                            neutralizeAndMaintain: false,
                            noRemoval: false,
                          })
                        }
                        className="text-[11px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                      >
                        Netejar
                      </button>
                    )}
                </div>

                <div className="space-y-1.5">
                  <div
                    onClick={() => toggleMortEvaluatorCriteria(selectedMort.id, 'absencePosidoniaOrHabitats')}
                    className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                      selectedMort.evaluatorCriteria?.absencePosidoniaOrHabitats
                        ? 'bg-emerald-100 border-emerald-600 text-[#134E4A]'
                        : 'bg-white border-[#D1D1C7]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMort.evaluatorCriteria?.absencePosidoniaOrHabitats
                        ? 'bg-emerald-600 border-emerald-700 text-white'
                        : 'bg-white border-[#A8A29E]'
                    }`}>
                      {selectedMort.evaluatorCriteria?.absencePosidoniaOrHabitats ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-transparent" />
                      )}
                    </div>
                    <span className="text-xs font-semibold">Absència de posidònia/hàbitats protegits</span>
                  </div>

                  <div
                    onClick={() => toggleMortEvaluatorCriteria(selectedMort.id, 'immediateRemoval')}
                    className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                      selectedMort.evaluatorCriteria?.immediateRemoval
                        ? 'bg-rose-100 border-rose-600 text-rose-950'
                        : 'bg-white border-[#D1D1C7]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMort.evaluatorCriteria?.immediateRemoval
                        ? 'bg-rose-600 border-rose-700 text-white'
                        : 'bg-white border-[#A8A29E]'
                    }`}>
                      {selectedMort.evaluatorCriteria?.immediateRemoval ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-transparent" />
                      )}
                    </div>
                    <span className="text-xs font-semibold">
                      Retirar mort de forma immediata, a criteri de l'avaluador
                    </span>
                  </div>

                  <div
                    onClick={() => toggleMortEvaluatorCriteria(selectedMort.id, 'scheduledRemoval')}
                    className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                      selectedMort.evaluatorCriteria?.scheduledRemoval
                        ? 'bg-amber-100 border-amber-600 text-amber-950'
                        : 'bg-white border-[#D1D1C7]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMort.evaluatorCriteria?.scheduledRemoval
                        ? 'bg-amber-600 border-amber-700 text-white'
                        : 'bg-white border-[#A8A29E]'
                    }`}>
                      {selectedMort.evaluatorCriteria?.scheduledRemoval ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-transparent" />
                      )}
                    </div>
                    <span className="text-xs font-semibold">
                      Retirar mort de forma programada, a criteri de l'avaluador
                    </span>
                  </div>

                  <div
                    onClick={() => toggleMortEvaluatorCriteria(selectedMort.id, 'neutralizeAndMaintain')}
                    className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                      selectedMort.evaluatorCriteria?.neutralizeAndMaintain
                        ? 'bg-sky-100 border-sky-600 text-sky-950'
                        : 'bg-white border-[#D1D1C7]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMort.evaluatorCriteria?.neutralizeAndMaintain
                        ? 'bg-sky-600 border-sky-700 text-white'
                        : 'bg-white border-[#A8A29E]'
                    }`}>
                      {selectedMort.evaluatorCriteria?.neutralizeAndMaintain ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-transparent" />
                      )}
                    </div>
                    <span className="text-xs font-semibold">
                      Neutralitzar mort i mantenir, a criteri de l'avaluador
                    </span>
                  </div>

                  <div
                    onClick={() => toggleMortEvaluatorCriteria(selectedMort.id, 'noRemoval')}
                    className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                      selectedMort.evaluatorCriteria?.noRemoval
                        ? 'bg-teal-100 border-teal-600 text-teal-950'
                        : 'bg-white border-[#D1D1C7]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMort.evaluatorCriteria?.noRemoval
                        ? 'bg-teal-600 border-teal-700 text-white'
                        : 'bg-white border-[#A8A29E]'
                    }`}>
                      {selectedMort.evaluatorCriteria?.noRemoval ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-transparent" />
                      )}
                    </div>
                    <span className="text-xs font-semibold">
                      No retirar mort a criteri de l'avaluador
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#134E4A] block mb-1">Trets Ecològics Identificats:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMort.detectedFeatures.map((f, i) => (
                    <span key={i} className="bg-white border border-[#D1D1C7] px-2 py-0.5 rounded text-[11px]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D1D1C7] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAnalyzeSingleMortWithAI(selectedMort.id)}
                  disabled={analyzingMortIds.has(selectedMort.id)}
                  className="px-3 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {analyzingMortIds.has(selectedMort.id) ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analitzant amb IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{selectedMort.confidenceScore !== undefined ? 'Reanalitzar amb IA' : 'Analitzar amb IA'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDeleteMort(selectedMort.id);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar del Lot</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMortId(null)}
                  className="px-3 py-2 bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#4A5D52] text-xs font-semibold rounded-xl transition"
                >
                  Tancar
                </button>
                <button
                  onClick={() => {
                    toggleValidateMort(selectedMort.id);
                    setSelectedMortId(null);
                  }}
                  className="px-4 py-2 bg-[#134E4A] hover:bg-[#1A6460] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {selectedMort.isValidated ? 'Desmarcar i Tancar' : 'Validar i Tancar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
