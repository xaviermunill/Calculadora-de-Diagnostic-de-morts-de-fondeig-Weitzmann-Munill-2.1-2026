import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
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
  ArrowRightLeft,
  FileSpreadsheet,
  HelpCircle,
  Table,
  TreeDeciduous,
} from 'lucide-react';
import {
  BatchMortGroup,
  BatchPhotoItem,
  extractMortIdFromPath,
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
  SeabedTypeOption,
  PosidoniaDistanceOption,
  SEABED_TYPE_OPTIONS,
  POSIDONIA_DISTANCE_OPTIONS,
} from '../types';
import { evaluateDecision } from '../utils/decisionEngine';
import { getMatrix128Combination } from '../data/decisionMatrix128';
import { exportInventoryToExcel } from '../utils/excelExport';
import {
  parseBatchSpreadsheet,
  applySpreadsheetDataToMortGroups,
  downloadBatchTemplateExcel,
  downloadBatchTemplateCSV,
  BatchSpreadsheetRow,
} from '../utils/batchSpreadsheetParser';

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

  // Photo Transfer Modal State
  const [transferModal, setTransferModal] = useState<{
    sourceMortId: string;
    sourceMortCode: string;
    photo: BatchPhotoItem;
  } | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [newTargetMortCode, setNewTargetMortCode] = useState<string>('');

  // Google Drive folder URL / ID input
  const [driveFolderInput, setDriveFolderInput] = useState<string>(
    'https://drive.google.com/drive/folders/1oJJ0DZ2UPDi9l32APhSz1cwyKAUcG6Oq'
  );
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // File input refs for local files / folder / spreadsheet
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  // Spreadsheet Data State
  const [spreadsheetRows, setSpreadsheetRows] = useState<BatchSpreadsheetRow[]>([]);
  const [spreadsheetFileName, setSpreadsheetFileName] = useState<string | null>(null);
  const [spreadsheetInfoModalOpen, setSpreadsheetInfoModalOpen] = useState<boolean>(false);
  const [spreadsheetResultModal, setSpreadsheetResultModal] = useState<{
    open: boolean;
    totalRows: number;
    matchedCount: number;
    warnings: string[];
    error?: string;
    unmatchedRows: string[];
    unmatchedGroups: string[];
  } | null>(null);

  // Photo viewer lightbox modal
  const [previewPhoto, setPreviewPhoto] = useState<{
    mortId: string;
    photoId: string;
    url: string;
    title: string;
    index: number;
    total: number;
    mortCode: string;
  } | null>(null);

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
   * Handle uploading and parsing a spreadsheet file (Excel/CSV)
   * Fields: Name, CoordX, CoordY, Fondària, tamany mort, Volum Mort
   */
  const handleSpreadsheetUpload = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setSpreadsheetFileName(file.name);
    setProcessingProgress({ current: 0, total: 1, currentName: `Llegint i processant full de càlcul (${file.name})...` });

    try {
      const parseRes = await parseBatchSpreadsheet(file);
      if (!parseRes.success || parseRes.validRows.length === 0) {
        setSpreadsheetResultModal({
          open: true,
          totalRows: 0,
          matchedCount: 0,
          warnings: parseRes.warnings,
          error: parseRes.error || "No s'han trobat files de dades vàlides al full de càlcul.",
          unmatchedRows: [],
          unmatchedGroups: [],
        });
        setIsProcessing(false);
        return;
      }

      setSpreadsheetRows(parseRes.validRows);

      if (mortGroups.length > 0) {
        const { updatedGroups, matchedCount, unmatchedGroupCodes, unmatchedRowNames } =
          applySpreadsheetDataToMortGroups(mortGroups, parseRes.validRows);

        setMortGroups(updatedGroups);

        setSpreadsheetResultModal({
          open: true,
          totalRows: parseRes.validRows.length,
          matchedCount,
          warnings: parseRes.warnings,
          unmatchedRows: unmatchedRowNames,
          unmatchedGroups: unmatchedGroupCodes,
        });

        showBatchToast(
          `S'han assignat automàticament les dades de la taula a ${matchedCount} de ${mortGroups.length} fitxes de morts.`
        );
      } else {
        setSpreadsheetResultModal({
          open: true,
          totalRows: parseRes.validRows.length,
          matchedCount: 0,
          warnings: [
            ...parseRes.warnings,
            "S'ha carregat el full de càlcul amb èxit. Quan carregueu o arrossegueu les fotos, les dades s'assignaran automàticament per coincidència de Nom/Codi.",
          ],
          unmatchedRows: parseRes.validRows.map((r) => r.name),
          unmatchedGroups: [],
        });
        showBatchToast(`S'han carregat ${parseRes.validRows.length} registres del full de càlcul '${file.name}'.`);
      }
    } catch (err: any) {
      setSpreadsheetResultModal({
        open: true,
        totalRows: 0,
        matchedCount: 0,
        warnings: [],
        error: `Error al processar el full de càlcul: ${err?.message || 'Error desconegut'}`,
        unmatchedRows: [],
        unmatchedGroups: [],
      });
    } finally {
      setIsProcessing(false);
    }
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
    let groupsArray: BatchMortGroup[] = [];

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

    // If a spreadsheet was previously uploaded, auto-apply matching data!
    if (spreadsheetRows.length > 0) {
      const { updatedGroups, matchedCount } = applySpreadsheetDataToMortGroups(groupsArray, spreadsheetRows);
      groupsArray = updatedGroups;
      if (matchedCount > 0) {
        showBatchToast(`S'han vinculat automàticament ${matchedCount} fitxes amb el full de càlcul prèviament carregat.`);
      }
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
   * Delete a specific photo from a mort card
   */
  const handleDeletePhoto = (mortId: string, photoId: string) => {
    const targetMort = mortGroups.find((m) => m.id === mortId);
    if (!targetMort) return;
    const photoToDelete = targetMort.photos.find((p) => p.id === photoId);
    const photoName = photoToDelete?.name || 'Foto';

    setMortGroups((prev) =>
      prev.map((m) => {
        if (m.id !== mortId) return m;
        return {
          ...m,
          photos: m.photos.filter((p) => p.id !== photoId),
        };
      })
    );

    if (previewPhoto && previewPhoto.photoId === photoId) {
      setPreviewPhoto(null);
    }

    showBatchToast(`S'ha eliminat la foto "${photoName}" de la targeta ${targetMort.mortCode}.`);
  };

  /**
   * Open transfer modal for a photo
   */
  const handleOpenTransferModal = (sourceMortId: string, photo: BatchPhotoItem) => {
    const sourceMort = mortGroups.find((m) => m.id === sourceMortId);
    if (!sourceMort) return;
    const otherMorts = mortGroups.filter((m) => m.id !== sourceMortId);
    setTransferModal({
      sourceMortId,
      sourceMortCode: sourceMort.mortCode,
      photo,
    });
    setTransferTargetId(otherMorts.length > 0 ? otherMorts[0].id : '__new__');
    setNewTargetMortCode('');
  };

  /**
   * Confirm photo transfer to another mort or new mort
   */
  const handleConfirmTransferPhoto = () => {
    if (!transferModal) return;
    const { sourceMortId, sourceMortCode, photo } = transferModal;

    if (transferTargetId === '__new__') {
      const code = newTargetMortCode.trim() || `MORT_${mortGroups.length + 1}`;
      
      const { result, matrix128 } = recalculateGroup(
        'none',
        'none',
        'no_risk',
        'not_buried_no_void',
        'abandoned',
        false
      );

      const newGroup: BatchMortGroup = {
        id: `mort_${Date.now()}_${code.replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 6)}`,
        mortCode: code,
        folderOrPrefix: `Nova targeta transferida`,
        photos: [photo],
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
        notes: `Foto transferida des de ${sourceMortCode}`,
        isValidated: false,
        evaluatorCriteria: { ...defaultEvaluatorCriteria },
        result,
      };

      setMortGroups((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== sourceMortId) return m;
          return { ...m, photos: m.photos.filter((p) => p.id !== photo.id) };
        });
        return [...updated, newGroup];
      });

      showBatchToast(`S'ha transferit la foto "${photo.name}" a la nova targeta ${code}.`);
    } else {
      const targetMort = mortGroups.find((m) => m.id === transferTargetId);
      const targetCode = targetMort?.mortCode || 'destí';

      setMortGroups((prev) =>
        prev.map((m) => {
          if (m.id === sourceMortId) {
            return { ...m, photos: m.photos.filter((p) => p.id !== photo.id) };
          }
          if (m.id === transferTargetId) {
            return { ...m, photos: [...m.photos, photo] };
          }
          return m;
        })
      );

      showBatchToast(`S'ha transferit la foto "${photo.name}" a la targeta ${targetCode}.`);
    }

    if (previewPhoto && previewPhoto.photoId === photo.id) {
      setPreviewPhoto(null);
    }
    setTransferModal(null);
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
   * Toggle seabed types for individual mort
   */
  const toggleMortSeabedType = (mortId: string, type: SeabedTypeOption) => {
    setMortGroups((prev) =>
      prev.map((item) => {
        if (item.id !== mortId) return item;
        const current = item.seabedTypes || [];
        const next = current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type];
        return { ...item, seabedTypes: next };
      })
    );
  };

  /**
   * Toggle posidonia distance for individual mort
   */
  const toggleMortPosidoniaDistance = (mortId: string, distance: PosidoniaDistanceOption) => {
    setMortGroups((prev) =>
      prev.map((item) => {
        if (item.id !== mortId) return item;
        const current = item.posidoniaDistances || [];
        const next = current.includes(distance)
          ? current.filter((d) => d !== distance)
          : [...current, distance];
        return { ...item, posidoniaDistances: next };
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
                  Pre-Anàlisi i Agrupació d'Imatges en Lot (Batch)
                </h2>
                <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#1B5E20] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#C8E6C9]">
                  <Layers className="w-3.5 h-3.5" />
                  Agrupació per Mort i 128 Casuístiques
                </span>
              </div>
              <p className="text-sm text-[#4A5D52] mt-1 max-w-3xl leading-relaxed">
                Carregueu carpetes o lots de fotografies submarines. El sistema agrupa automàticament les imatges per
                bloc o mort de fondeig, permet gestionar i transferir fotografies entre targetes, assignar la casuística
                oficial (1 a 128) i validar o exportar els registres en bloc.
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
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-[#E5E5DC]">
          {/* Upload by Folder */}
          <div
            id="dropzone-folder"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => folderInputRef.current?.click()}
            className="group relative cursor-pointer border-2 border-dashed border-[#134E4A]/30 hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F3F4EE] rounded-xl p-3.5 transition text-center flex flex-col items-center justify-center min-h-[110px]"
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
            <span className="text-xs font-bold text-[#134E4A]">Carregar Carpeta</span>
            <span className="text-[11px] text-[#64746B] mt-0.5">Agrupa per subcarpetes o noms</span>
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
            className="group relative cursor-pointer border-2 border-dashed border-[#134E4A]/30 hover:border-[#134E4A] bg-[#FAF9F6] hover:bg-[#F3F4EE] rounded-xl p-3.5 transition text-center flex flex-col items-center justify-center min-h-[110px]"
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
            <span className="text-xs font-bold text-[#134E4A]">Seleccionar Imatges</span>
            <span className="text-[11px] text-[#64746B] mt-0.5">Ex: "MORT_01 (1).jpg", "12 (2).png"</span>
          </div>

          {/* Upload Spreadsheet (Excel / CSV) */}
          <div
            id="dropzone-spreadsheet"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []) as File[];
              const sheetFile = files.find(f => /\.(xlsx|xls|csv)$/i.test(f.name));
              if (sheetFile) handleSpreadsheetUpload(sheetFile);
            }}
            onClick={() => spreadsheetInputRef.current?.click()}
            className={`group relative cursor-pointer border-2 border-dashed ${
              spreadsheetRows.length > 0
                ? 'border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50'
                : 'border-emerald-600/35 hover:border-emerald-700 bg-[#FAF9F6] hover:bg-[#F3F4EE]'
            } rounded-xl p-3.5 transition text-center flex flex-col items-center justify-center min-h-[110px]`}
          >
            <input
              type="file"
              ref={spreadsheetInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleSpreadsheetUpload(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileSpreadsheet className={`w-6 h-6 ${spreadsheetRows.length > 0 ? 'text-emerald-700' : 'text-emerald-800'} group-hover:scale-110 transition-transform`} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpreadsheetInfoModalOpen(true);
                }}
                className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-200/50 rounded-full transition"
                title="Informació d'estructura de la taula"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-bold text-emerald-950">
              {spreadsheetRows.length > 0 ? 'Full de Càlcul Carregat' : 'Carregar Full de Càlcul'}
            </span>
            <span className="text-[11px] text-emerald-800 mt-0.5 font-medium">
              {spreadsheetRows.length > 0
                ? `${spreadsheetRows.length} registres (${spreadsheetFileName || 'taula'})`
                : 'Excel / CSV (Coord, Fondària, Tamany)'}
            </span>
          </div>

          {/* Grouping Rule & Spreadsheet Matching Information */}
          <div className="bg-[#E9E9E0]/70 border border-[#DCDCD2] rounded-xl p-3 flex flex-col justify-between text-xs text-[#4A5D52]">
            <div>
              <div className="flex items-center justify-between font-bold text-[#134E4A] mb-1">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#134E4A]" />
                  Correspondència Automàtica:
                </span>
                <button
                  type="button"
                  onClick={() => setSpreadsheetInfoModalOpen(true)}
                  className="text-[10px] text-emerald-900 hover:underline font-bold"
                >
                  Veure Estructura
                </button>
              </div>
              <p className="text-[11px] text-[#556B5D] leading-tight">
                La columna <strong>Name</strong> del full de càlcul s'assigna al <strong>Codi del Bloc / Mort</strong> de les fitxes.
              </p>
            </div>
            <div className="pt-1.5 mt-1 border-t border-[#DCDCD2]/60 flex items-center justify-between text-[10px] text-[#64746B]">
              <span>Camps: Name, CoordX, CoordY...</span>
              <button
                type="button"
                onClick={() => setSpreadsheetInfoModalOpen(true)}
                className="text-[#134E4A] hover:underline font-semibold"
              >
                + Info
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Processing Banner */}
      {isProcessing && (
        <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl p-5 shadow-xs animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#0369A1] font-bold text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
              <span>{processingProgress.currentName || 'Processant i agrupant fotografies...'}</span>
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
                  type="button"
                  onClick={() => spreadsheetInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300 transition"
                  title="Carregar full de càlcul Excel/CSV per assignar valors automàticament"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  Carregar Taula (Excel/CSV)
                </button>

                <button
                  type="button"
                  onClick={() => setSpreadsheetInfoModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#134E4A] rounded-lg border border-[#D1D1C7] transition"
                  title="Veure estructura requerida de la taula (Name, CoordX, CoordY, Fondària...)"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#134E4A]" />
                  Estructura Taula
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
                          <div className="flex items-center gap-2 flex-wrap">
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
                            {mort.hasSpreadsheetData && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300" title="Dades assignades automàticament des del full de càlcul">
                                <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                                Taula Vinculada
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

                      {/* Photo Thumbnails Carousel & Management */}
                      {mort.photos.length === 0 ? (
                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2 my-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            Targeta sense fotos (pots transferir-hi fotos des d'altres targetes)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMort(mort.id)}
                            className="text-xs text-red-600 hover:text-red-800 hover:underline font-bold shrink-0"
                          >
                            Eliminar targeta
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                          {mort.photos.map((photo, pIdx) => (
                            <div
                              key={photo.id}
                              className="relative shrink-0 w-28 h-22 rounded-xl overflow-hidden border border-[#D1D1C7] group hover:border-[#134E4A] bg-[#111] shadow-xs"
                            >
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                onClick={() =>
                                  setPreviewPhoto({
                                    mortId: mort.id,
                                    photoId: photo.id,
                                    url: photo.url,
                                    title: photo.name,
                                    index: pIdx + 1,
                                    total: mort.photos.length,
                                    mortCode: mort.mortCode,
                                  })
                                }
                                referrerPolicy="no-referrer"
                              />

                              {/* Photo Index Badge */}
                              <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
                                #{photo.photoIndex || pIdx + 1}
                              </span>

                              {/* Actions Toolbar on Hover / Mobile */}
                              <div className="absolute top-1 right-1 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTransferModal(mort.id, photo);
                                  }}
                                  className="p-1 bg-white/95 hover:bg-[#134E4A] text-[#134E4A] hover:text-white rounded-md shadow-xs transition"
                                  title="Transferir aquesta foto a un altre mort"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(mort.id, photo.id);
                                  }}
                                  className="p-1 bg-white/95 hover:bg-red-600 text-red-600 hover:text-white rounded-md shadow-xs transition"
                                  title="Eliminar aquesta foto d'aquesta targeta"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 128 Casuística & Physical Characteristics Badges */}
                      <div className="flex items-center gap-2 flex-wrap my-2.5">
                        <span className="inline-flex items-center gap-1 bg-[#134E4A] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                          Casuística #{mort.matrix128?.id || '—'} / 128
                        </span>

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

                        {/* Block Dimensions & Volume */}
                        <div>
                          <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center justify-between mb-0.5">
                            <span className="flex items-center gap-1">
                              <Scale className="w-3 h-3 text-[#134E4A]" />
                              Mida del bloc (Llarg × Ample × Alt en cm)
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-[#134E4A]">
                              Volum: {mort.customVolumeM3 !== undefined
                                ? `${mort.customVolumeM3.toFixed(3)} m³ (Taula)`
                                : `${(((mort.dimensions?.lengthCm || 80) * (mort.dimensions?.widthCm || 80) * (mort.dimensions?.heightCm || 40)) / 1000000).toFixed(3)} m³`}
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

                        {/* Coordenades Geogràfiques (CoordX / CoordY / GPS) */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E5DC]">
                          <div>
                            <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#134E4A]" />
                              Coord X (Long / Est)
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={mort.longitude ?? ''}
                              onChange={(e) =>
                                updateMortCriteria(mort.id, 'longitude' as any, e.target.value ? Number(e.target.value) : undefined)
                              }
                              placeholder="Ex: 3.16245"
                              className="w-full mt-0.5 text-xs px-2 py-1 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-mono font-medium focus:outline-none focus:border-[#134E4A]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#134E4A] uppercase flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#134E4A]" />
                              Coord Y (Lat / Nord)
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={mort.latitude ?? ''}
                              onChange={(e) =>
                                updateMortCriteria(mort.id, 'latitude' as any, e.target.value ? Number(e.target.value) : undefined)
                              }
                              placeholder="Ex: 41.72314"
                              className="w-full mt-0.5 text-xs px-2 py-1 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-mono font-medium focus:outline-none focus:border-[#134E4A]"
                            />
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

                      {/* Tipus de Fons i Distància a Posidònia for this Mort */}
                      <div className="mt-3 bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-2.5 space-y-2.5">
                        {/* Tipus de Fons */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-[#134E4A] flex items-center gap-1">
                              <TreeDeciduous className="w-3 h-3 text-[#134E4A]" />
                              Tipus de Fons:
                            </span>
                            {mort.seabedTypes && mort.seabedTypes.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMortGroups((prev) =>
                                    prev.map((item) => (item.id === mort.id ? { ...item, seabedTypes: [] } : item))
                                  )
                                }
                                className="text-[10px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                              >
                                Desmarcar
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {SEABED_TYPE_OPTIONS.map((opt) => {
                              const isChecked = !!mort.seabedTypes?.includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => toggleMortSeabedType(mort.id, opt.id)}
                                  className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-1.5 select-none ${
                                    isChecked
                                      ? 'bg-emerald-100/80 border-emerald-600 font-semibold'
                                      : 'bg-white border-[#D1D1C7] hover:bg-[#F3F4EE]'
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? 'bg-emerald-700 border-emerald-800 text-white'
                                        : 'bg-white border-[#A8A29E]'
                                    }`}
                                  >
                                    {isChecked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-transparent" />}
                                  </div>
                                  <span className="text-[11px] text-[#134E4A] leading-tight">{opt.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Distància a Posidònia */}
                        <div className="pt-2 border-t border-[#E5E5DF]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-[#134E4A] flex items-center gap-1">
                              Distància a Posidònia:
                            </span>
                            {mort.posidoniaDistances && mort.posidoniaDistances.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMortGroups((prev) =>
                                    prev.map((item) => (item.id === mort.id ? { ...item, posidoniaDistances: [] } : item))
                                  )
                                }
                                className="text-[10px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                              >
                                Desmarcar
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {POSIDONIA_DISTANCE_OPTIONS.map((opt) => {
                              const isChecked = !!mort.posidoniaDistances?.includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => toggleMortPosidoniaDistance(mort.id, opt.id)}
                                  className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center gap-1.5 select-none ${
                                    isChecked
                                      ? 'bg-teal-100/80 border-teal-600 font-semibold'
                                      : 'bg-white border-[#D1D1C7] hover:bg-[#F3F4EE]'
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? 'bg-teal-700 border-teal-800 text-white'
                                        : 'bg-white border-[#A8A29E]'
                                    }`}
                                  >
                                    {isChecked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-transparent" />}
                                  </div>
                                  <span className="text-[11px] text-[#134E4A] leading-tight">{opt.label}</span>
                                </div>
                              );
                            })}
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
                      <th className="py-3 px-3">Coord. (X / Y)</th>
                      <th className="py-3 px-3">Fondària</th>
                      <th className="py-3 px-3">Blocs & Tamany</th>
                      <th className="py-3 px-3">Volum</th>
                      <th className="py-3 px-3">Casuística 128</th>
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
                      const volumeM3 = mort.customVolumeM3 !== undefined
                        ? mort.customVolumeM3
                        : ((mort.dimensions?.lengthCm || 80) * (mort.dimensions?.widthCm || 80) * (mort.dimensions?.heightCm || 40)) / 1000000;
                      return (
                        <tr key={mort.id} className="hover:bg-[#F3F4EE] transition">
                          <td className="py-3 px-3 font-mono font-bold text-[#134E4A]">
                            <div className="flex items-center gap-1.5">
                              <span>{mort.mortCode}</span>
                              {mort.hasSpreadsheetData && (
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Dades de la taula vinculades" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() =>
                                mort.photos[0] &&
                                setPreviewPhoto({
                                  mortId: mort.id,
                                  photoId: mort.photos[0].id,
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
                          <td className="py-2 px-3 font-mono text-[10px] text-[#4A5D52]">
                            {mort.longitude !== undefined || mort.latitude !== undefined ? (
                              <div className="leading-tight">
                                <div>X: <span className="font-semibold text-[#134E4A]">{mort.longitude ?? '—'}</span></div>
                                <div>Y: <span className="font-semibold text-[#134E4A]">{mort.latitude ?? '—'}</span></div>
                              </div>
                            ) : (
                              <span className="text-[#A8A29E] italic">—</span>
                            )}
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
                          <td className="py-3 px-3 font-mono font-semibold text-[11px] text-[#134E4A]">
                            {volumeM3.toFixed(3)} m³
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#134E4A]">#{mort.matrix128?.id || '—'}</td>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetMort = mortGroups.find((m) => m.id === previewPhoto.mortId);
                    const photoObj = targetMort?.photos.find((p) => p.id === previewPhoto.photoId);
                    if (targetMort && photoObj) {
                      handleOpenTransferModal(targetMort.id, photoObj);
                    }
                  }}
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Transferir foto a un altre mort"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transferir</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDeletePhoto(previewPhoto.mortId, previewPhoto.photoId);
                  }}
                  className="px-2.5 py-1 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Eliminar aquesta foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition ml-2"
                >
                  Tancar
                </button>
              </div>
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

      {/* Transfer Photo Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-2xl max-w-md w-full border border-[#D1D1C7] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1D1C7]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#134E4A]/10 text-[#134E4A] rounded-lg">
                  <ArrowRightLeft className="w-5 h-5 text-[#134E4A]" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#134E4A]">Transferir Fotografia</h3>
                  <p className="text-xs text-[#64746B]">Origen: Targeta {transferModal.sourceMortCode}</p>
                </div>
              </div>
              <button
                onClick={() => setTransferModal(null)}
                className="text-[#64746B] hover:text-[#134E4A] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Photo Info & Preview */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#D1D1C7]">
              <img
                src={transferModal.photo.url}
                alt={transferModal.photo.name}
                className="w-16 h-14 object-cover rounded-lg border border-[#E5E5DC] shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-[#134E4A] truncate">{transferModal.photo.name}</div>
                <div className="text-[11px] text-[#64746B] mt-0.5">
                  Mida: {Math.round(transferModal.photo.sizeBytes / 1024)} KB
                </div>
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#134E4A]">
                Seleccioneu el destí de la transferència:
              </label>

              <div className="space-y-2">
                {mortGroups.filter((m) => m.id !== transferModal.sourceMortId).length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#4A5D52] block mb-1">
                      Moure a una targeta existent del lot:
                    </label>
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#D1D1C7] bg-white text-[#134E4A] font-medium"
                    >
                      {mortGroups
                        .filter((m) => m.id !== transferModal.sourceMortId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.mortCode} ({m.photos.length} fotos) — {m.locationName}
                          </option>
                        ))}
                      <option value="__new__">➕ Crear nova targeta de mort...</option>
                    </select>
                  </div>
                )}

                {(transferTargetId === '__new__' ||
                  mortGroups.filter((m) => m.id !== transferModal.sourceMortId).length === 0) && (
                  <div className="p-3 bg-[#E9E9E0]/60 rounded-xl border border-[#DCDCD2] space-y-2">
                    <label className="text-[11px] font-bold text-[#134E4A] block">
                      Codi de la nova targeta:
                    </label>
                    <input
                      type="text"
                      placeholder={`Ex: MORT_${mortGroups.length + 1}`}
                      value={newTargetMortCode}
                      onChange={(e) => setNewTargetMortCode(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A] font-mono"
                    />
                    <p className="text-[10px] text-[#64746B]">
                      Es crearà una targeta nova amb aquesta fotografia com a primera imatge.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#D1D1C7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModal(null)}
                className="px-3 py-2 bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#4A5D52] text-xs font-semibold rounded-xl transition"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferPhoto}
                className="px-4 py-2 bg-[#134E4A] hover:bg-[#1A6460] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Confirmar Transferència
              </button>
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
                <span className="font-bold text-[#134E4A] block mb-1">Observacions Visuals i de Camp:</span>
                <p className="text-xs text-[#4A5D52] bg-white p-3 rounded-xl border border-[#D1D1C7]">
                  {selectedMort.visualObservations || 'Sense observacions adicionals registrades.'}
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
                  {selectedMort.detectedFeatures && selectedMort.detectedFeatures.length > 0 ? (
                    selectedMort.detectedFeatures.map((f, i) => (
                      <span key={i} className="bg-white border border-[#D1D1C7] px-2 py-0.5 rounded text-[11px]">
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#64746B] italic">Cap tret ecològic marcat</span>
                  )}
                </div>
              </div>

              {/* Tipus de Fons i Distància a Posidònia */}
              <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-3 space-y-3">
                {/* Tipus de Fons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#134E4A] flex items-center gap-1">
                      <TreeDeciduous className="w-3.5 h-3.5 text-[#134E4A]" />
                      Tipus de Fons:
                    </span>
                    {selectedMort.seabedTypes && selectedMort.seabedTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMortGroups((prev) =>
                            prev.map((item) => (item.id === selectedMort.id ? { ...item, seabedTypes: [] } : item))
                          )
                        }
                        className="text-[11px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                      >
                        Desmarcar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SEABED_TYPE_OPTIONS.map((opt) => {
                      const isChecked = !!selectedMort.seabedTypes?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleMortSeabedType(selectedMort.id, opt.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                            isChecked
                              ? 'bg-emerald-100 border-emerald-600 font-semibold'
                              : 'bg-white border-[#D1D1C7] hover:bg-[#F3F4EE]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-emerald-700 border-emerald-800 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-transparent" />}
                          </div>
                          <span className="text-xs text-[#134E4A]">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Distància a Posidònia */}
                <div className="pt-2.5 border-t border-[#E5E5DF]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#134E4A]">
                      Distància a Posidònia:
                    </span>
                    {selectedMort.posidoniaDistances && selectedMort.posidoniaDistances.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMortGroups((prev) =>
                            prev.map((item) => (item.id === selectedMort.id ? { ...item, posidoniaDistances: [] } : item))
                          )
                        }
                        className="text-[11px] text-[#64746B] hover:text-[#134E4A] hover:underline"
                      >
                        Desmarcar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {POSIDONIA_DISTANCE_OPTIONS.map((opt) => {
                      const isChecked = !!selectedMort.posidoniaDistances?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleMortPosidoniaDistance(selectedMort.id, opt.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 select-none ${
                            isChecked
                              ? 'bg-teal-100 border-teal-600 font-semibold'
                              : 'bg-white border-[#D1D1C7] hover:bg-[#F3F4EE]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-teal-700 border-teal-800 text-white'
                                : 'bg-white border-[#A8A29E]'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-transparent" />}
                          </div>
                          <span className="text-xs text-[#134E4A]">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D1D1C7] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteMort(selectedMort.id);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar Targeta del Lot</span>
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

      {/* -------------------------------------------------------------------------- */}
      {/* SPREADSHEET STRUCTURE INFO MODAL (Recordatori d'Estructura de la Taula)    */}
      {/* -------------------------------------------------------------------------- */}
      {spreadsheetInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D1D1C7] shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-[#134E4A] text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#86EFAC]" />
                <div>
                  <h3 className="font-serif font-bold text-base">Estructura del Full de Càlcul (Batch)</h3>
                  <span className="text-xs text-[#A7F3D0]">Camps requerits per a l'assignació automàtica</span>
                </div>
              </div>
              <button
                onClick={() => setSpreadsheetInfoModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 text-[#134E4A]">
              {/* Primary Matching Key Notice */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <span className="font-bold block text-sm mb-0.5">Clau de Concordança: Columna "Name"</span>
                  El camp <strong>Name</strong> de la taula s'utilitza com a identificador principal i ha de correspondre
                  al <strong>Codi del Bloc / Mort</strong> de les fitxes (ex: <code>BLO-001</code>, <code>MORT_01</code>, <code>CM-01</code>). El sistema fa coincidència automàtica intel·ligent.
                </div>
              </div>

              {/* Required Columns Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A5D52] mb-2 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-[#134E4A]" />
                  Camps del Full de Càlcul (Excel .xlsx / CSV)
                </h4>
                <div className="overflow-hidden border border-[#D1D1C7] rounded-xl bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#E9E9E0] text-[#134E4A] font-bold border-b border-[#D1D1C7]">
                        <th className="py-2 px-3">Nom del Camp</th>
                        <th className="py-2 px-3">Descripció i Funció</th>
                        <th className="py-2 px-3">Format d'Exemple</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5DC] text-[11px]">
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">Name</td>
                        <td className="py-2.5 px-3">Codi del Bloc / Mort de la fitxa d'inspecció</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">BLO-001 / MORT_01</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">CoordX</td>
                        <td className="py-2.5 px-3">Coordenada X (Longitud o UTM Est)</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">3.14251 o 511820</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">CoordY</td>
                        <td className="py-2.5 px-3">Coordenada Y (Latitud o UTM Nord)</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">41.98234 o 4647890</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">Fondària</td>
                        <td className="py-2.5 px-3">Profunditat de fondeig del mort en metres</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">8.5 o 12.0</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">tamany mort</td>
                        <td className="py-2.5 px-3">Mides de cada bloc (Llarg × Ample × Alt)</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">80x80x40 o 1x1x0.8</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#134E4A]">Volum Mort</td>
                        <td className="py-2.5 px-3">Volum total del bloc en m³</td>
                        <td className="py-2.5 px-3 font-mono text-[#64746B]">0.256 o 0.800</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example Visual Table Preview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A5D52] mb-2">
                  Exemple de Taula de Dades:
                </h4>
                <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl p-3 font-mono text-[11px] overflow-x-auto text-[#134E4A]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#D1D1C7] text-[#4A5D52]">
                        <th className="pb-1 pr-3">Name</th>
                        <th className="pb-1 pr-3">CoordX</th>
                        <th className="pb-1 pr-3">CoordY</th>
                        <th className="pb-1 pr-3">Fondària</th>
                        <th className="pb-1 pr-3">tamany mort</th>
                        <th className="pb-1">Volum Mort</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E9E0]">
                      <tr>
                        <td className="py-1 pr-3 font-bold">BLO-001</td>
                        <td className="py-1 pr-3">3.14251</td>
                        <td className="py-1 pr-3">41.98234</td>
                        <td className="py-1 pr-3">8.5</td>
                        <td className="py-1 pr-3">80x80x40</td>
                        <td className="py-1">0.256</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 font-bold">BLO-002</td>
                        <td className="py-1 pr-3">3.14280</td>
                        <td className="py-1 pr-3">41.98250</td>
                        <td className="py-1 pr-3">9.2</td>
                        <td className="py-1 pr-3">100x100x80</td>
                        <td className="py-1">0.800</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 font-bold">BLO-003</td>
                        <td className="py-1 pr-3">3.14310</td>
                        <td className="py-1 pr-3">41.98210</td>
                        <td className="py-1 pr-3">7.0</td>
                        <td className="py-1 pr-3">80x80x40</td>
                        <td className="py-1">0.256</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Template Download & Upload Action */}
              <div className="bg-[#E9E9E0]/60 border border-[#D1D1C7] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold block text-[#134E4A]">Necessiteu una plantilla base?</span>
                  <span className="text-[11px] text-[#64746B]">
                    Descarregueu el fitxer plantilla llest per omplir amb les vostres dades.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadBatchTemplateExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    Plantilla Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={downloadBatchTemplateCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF9F6] text-[#134E4A] border border-[#D1D1C7] text-xs font-bold rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FAF9F6] border-t border-[#D1D1C7] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSpreadsheetInfoModalOpen(false);
                  spreadsheetInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Carregar el meu Full de Càlcul Ara
              </button>

              <button
                type="button"
                onClick={() => setSpreadsheetInfoModalOpen(false)}
                className="px-4 py-2 bg-[#E9E9E0] hover:bg-[#DCDCD2] text-[#4A5D52] text-xs font-semibold rounded-xl transition"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* SPREADSHEET IMPORT RESULT MODAL                                            */}
      {/* -------------------------------------------------------------------------- */}
      {spreadsheetResultModal && spreadsheetResultModal.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#D1D1C7] shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-[#134E4A] text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#86EFAC]" />
                <h3 className="font-serif font-bold text-base">Resultat de la Importació de Taula</h3>
              </div>
              <button
                onClick={() => setSpreadsheetResultModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-[#134E4A]">
              {spreadsheetResultModal.error ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Error en la importació:</span>
                    <p className="mt-0.5">{spreadsheetResultModal.error}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm">
                      {spreadsheetResultModal.matchedCount > 0
                        ? `Assignació correcta: ${spreadsheetResultModal.matchedCount} de ${mortGroups.length} fitxes vinculades`
                        : `${spreadsheetResultModal.totalRows} registres carregats correctament`}
                    </span>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      S'han extret {spreadsheetResultModal.totalRows} registres amb dades de coordenades, fondària, tamany i volum.
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings if any */}
              {spreadsheetResultModal.warnings && spreadsheetResultModal.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Avisos del full de càlcul:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {spreadsheetResultModal.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unmatched groups if any */}
              {spreadsheetResultModal.unmatchedGroups && spreadsheetResultModal.unmatchedGroups.length > 0 && (
                <div className="p-3 bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl text-[#4A5D52] space-y-1">
                  <span className="font-semibold text-[#134E4A] block text-[11px]">
                    Fitxes sense correspondència al full de càlcul ({spreadsheetResultModal.unmatchedGroups.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {spreadsheetResultModal.unmatchedGroups.map((code, i) => (
                      <span key={i} className="bg-white px-2 py-0.5 rounded border border-[#D1D1C7] font-mono text-[10px]">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FAF9F6] border-t border-[#D1D1C7] flex justify-end">
              <button
                type="button"
                onClick={() => setSpreadsheetResultModal(null)}
                className="px-4 py-2 bg-[#134E4A] hover:bg-[#1A6460] text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                D'acord
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
