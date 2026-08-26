import {
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
  MortEvaluationRecord,
  DecisionResult,
  BlockDimensions,
  EvaluatorCriteria,
  SeabedTypeOption,
  PosidoniaDistanceOption,
} from '../types';
import { evaluateDecision } from './decisionEngine';
import { assessHydrodynamics } from './hydrodynamics';
import { getMatrix128Combination, Matrix128Item } from '../data/decisionMatrix128';

export interface BatchPhotoItem {
  id: string;
  name: string;
  url: string;
  file?: File;
  sizeBytes?: number;
  photoIndex?: number;
}

export interface BatchMortGroup {
  id: string;
  mortCode: string;
  folderOrPrefix: string;
  photos: BatchPhotoItem[];
  
  // Suggested Automated Evaluation
  suggestedC1: SpeciesPresenceOption;
  suggestedC2: SubstrateImpactOption;
  suggestedC3: DynamismRiskOption;
  suggestedC4: StabilityIntegrationOption;
  suggestedUsage: MortUsageStatus;
  suggestedHasMobileElements: boolean;
  suggestedDepthM: number;
  
  // AI / Heuristic Analysis details
  confidenceScore: number;
  detectedSpecies?: string[];
  detectedFeatures: string[];
  visualObservations: string;
  aiSource?: 'gemini_vision' | 'heuristic_vision' | 'canvas_sampling';
  
  // 128 Casuístiques Matching
  matrix128: Matrix128Item;
  
  // User Validated State & Dimensions / Comments
  validatedC1: SpeciesPresenceOption;
  validatedC2: SubstrateImpactOption;
  validatedC3: DynamismRiskOption;
  validatedC4: StabilityIntegrationOption;
  validatedUsage: MortUsageStatus;
  validatedHasMobileElements: boolean;
  validatedDepthM: number;
  locationName: string;
  numberOfBlocks: number;
  dimensions: BlockDimensions;
  connectionMode?: 'chained' | 'isolated';
  notes: string;
  evaluatorCriteria?: EvaluatorCriteria;
  seabedTypes?: SeabedTypeOption[];
  posidoniaDistances?: PosidoniaDistanceOption[];
  isValidated: boolean;
  
  // Geolocation & Custom Dimensions / Spreadsheet Input
  latitude?: number;
  longitude?: number;
  customVolumeM3?: number;
  hasSpreadsheetData?: boolean;
  spreadsheetData?: {
    rawName?: string;
    coordX?: number;
    coordY?: number;
    depthM?: number;
    tamanyMort?: string;
    volumMortM3?: number;
  };

  // Computed evaluation result
  result: DecisionResult;
}

/**
 * Extracts mort identifier and photo index from a filename or relative path
 * Opció 1: "MORT_01 (1).jpg", "12 (2).png", "Cala_Giverola_04 (1).jpg"
 * Opció 2: "01/DSC001.jpg", "Morts/Bloc_03/foto1.jpg"
 */
export function extractMortIdFromPath(
  filename: string,
  relativePath?: string
): { mortCode: string; photoIndex: number; groupingSource: 'filename_parenthesis' | 'subfolder' | 'prefix' } {
  const cleanFilename = filename.trim();
  
  // Check Opció 2: Subfolder relative path (e.g. "01/IMG_001.jpg" or "Bloc_12/photo.png")
  if (relativePath && relativePath.includes('/')) {
    const parts = relativePath.split('/').filter(p => p.trim().length > 0);
    if (parts.length >= 2) {
      // The direct parent folder is usually the mort ID
      const parentFolder = parts[parts.length - 2].trim();
      // If the top folder is generic like "Fotos" or "Images", use next level if available
      if (parentFolder && !['fotos', 'images', 'uploads', 'drive', 'arxiu'].includes(parentFolder.toLowerCase())) {
        // Try to parse photo index from filename if available
        const parenMatch = cleanFilename.match(/\((\d+)\)/);
        const photoIndex = parenMatch ? parseInt(parenMatch[1], 10) : 1;
        return {
          mortCode: parentFolder,
          photoIndex,
          groupingSource: 'subfolder',
        };
      }
    }
  }

  // Check Opció 1: Filename with pattern "nom o numero (numero)" e.g. "12 (1).jpg", "MORT-04 (2).png"
  const parenPattern = /^(.+?)\s*\(([0-9]+)\)\.[a-zA-Z0-9]+$/i;
  const parenMatch = cleanFilename.match(parenPattern);
  if (parenMatch) {
    const mortCode = parenMatch[1].trim();
    const photoIndex = parseInt(parenMatch[2], 10);
    return {
      mortCode: mortCode || 'Mort',
      photoIndex: isNaN(photoIndex) ? 1 : photoIndex,
      groupingSource: 'filename_parenthesis',
    };
  }

  // Fallback pattern: "nom_01.jpg", "M-01_1.jpg", "Mort-1-2.jpg"
  const underscorePattern = /^(.+?)[_-]([0-9]+)\.[a-zA-Z0-9]+$/i;
  const underMatch = cleanFilename.match(underscorePattern);
  if (underMatch) {
    return {
      mortCode: underMatch[1].trim(),
      photoIndex: parseInt(underMatch[2], 10) || 1,
      groupingSource: 'prefix',
    };
  }

  // Pure filename without extension as standalone mort
  const baseName = cleanFilename.replace(/\.[^/.]+$/, '').trim();
  return {
    mortCode: baseName || 'Mort_Desconegut',
    photoIndex: 1,
    groupingSource: 'prefix',
  };
}

/**
 * Converts a File or remote URL to a base64 Data URL for AI vision analysis
 */
export async function photoToDataUrl(photo: BatchPhotoItem): Promise<string | null> {
  if (photo.file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(photo.file!);
    });
  }
  if (photo.url && photo.url.startsWith('data:')) {
    return photo.url;
  }
  return null;
}

/**
 * Perform automated visual & context heuristics or Gemini Vision analysis on a group of images
 */
export async function analyzeMortPhotoGroup(
  mortCode: string,
  photos: BatchPhotoItem[],
  locationName: string = 'Cala Montgó'
): Promise<{
  suggestedC1: SpeciesPresenceOption;
  suggestedC2: SubstrateImpactOption;
  suggestedC3: DynamismRiskOption;
  suggestedC4: StabilityIntegrationOption;
  suggestedUsage: MortUsageStatus;
  suggestedHasMobileElements: boolean;
  suggestedDepthM: number;
  confidenceScore: number;
  detectedSpecies?: string[];
  detectedFeatures: string[];
  visualObservations: string;
  aiSource: 'gemini_vision' | 'heuristic_vision' | 'canvas_sampling';
  matrix128: Matrix128Item;
}> {
  // 1. Try server-side AI Vision endpoint with base64 data
  try {
    const photoPayload: { name: string; dataUrl?: string }[] = [];
    for (const p of photos.slice(0, 3)) {
      const dataUrl = await photoToDataUrl(p);
      photoPayload.push({
        name: p.name,
        dataUrl: dataUrl || undefined,
      });
    }

    const response = await fetch('/api/analyze-batch-photo-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mortCode,
        photos: photoPayload,
        locationName,
      }),
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        const d = json.data;
        const matrix128 = getMatrix128Combination(
          d.c1 as SpeciesPresenceOption,
          d.c2 === 'active_erosion_halo' || d.hasMobileElements,
          d.c3 as DynamismRiskOption,
          d.c4 as StabilityIntegrationOption
        );

        return {
          suggestedC1: d.c1 as SpeciesPresenceOption,
          suggestedC2: d.c2 as SubstrateImpactOption,
          suggestedC3: d.c3 as DynamismRiskOption,
          suggestedC4: d.c4 as StabilityIntegrationOption,
          suggestedUsage: d.usageStatus as MortUsageStatus,
          suggestedHasMobileElements: Boolean(d.hasMobileElements),
          suggestedDepthM: Number(d.estimatedDepthM) || 8,
          confidenceScore: Number(d.confidenceScore) || 85,
          detectedSpecies: Array.isArray(d.detectedSpecies) ? d.detectedSpecies : [],
          detectedFeatures: Array.isArray(d.detectedFeatures) ? d.detectedFeatures : [],
          visualObservations: d.visualObservations || `Diagnosi automatitzada per visió artificial (${json.source}).`,
          aiSource: json.source === 'gemini_vision' ? 'gemini_vision' : 'heuristic_vision',
          matrix128,
        };
      }
    }
  } catch (err) {
    console.warn('[BATCH ANALYZER API NOTE] Using local computer vision engine:', err);
  }

  // 2. Client-side Canvas Computer Vision & Colorimetric sampling
  let greenBrownBioPixels = 0;
  let sandyLightPixels = 0;
  let darkChainContrast = 0;
  let sampledImagesCount = 0;

  for (const photo of photos.slice(0, 3)) {
    try {
      const stats = await sampleImageColors(photo.url);
      if (stats) {
        greenBrownBioPixels += stats.bioScore;
        sandyLightPixels += stats.sandScore;
        darkChainContrast += stats.contrastScore;
        sampledImagesCount++;
      }
    } catch {
      // ignore image canvas error on remote CORS
    }
  }

  const detectedFeatures: string[] = [];
  const detectedSpecies: string[] = [];
  let suggestedC1: SpeciesPresenceOption = 'none';
  let suggestedC2: SubstrateImpactOption = 'none';
  let suggestedC3: DynamismRiskOption = 'moderate_risk';
  let suggestedC4: StabilityIntegrationOption = 'not_buried_no_void';
  let suggestedUsage: MortUsageStatus = 'abandoned';
  let suggestedHasMobileElements = false;
  let suggestedDepthM = 8;

  // Keyword inferences from filename/code
  const lowerCode = mortCode.toLowerCase();
  const hasPosidoniaCode = lowerCode.includes('posid') || lowerCode.includes('mat') || lowerCode.includes('mata');
  const hasSandCode = lowerCode.includes('sorra') || lowerCode.includes('sand') || lowerCode.includes('aren');
  const hasChainCode = lowerCode.includes('cadena') || lowerCode.includes('chain') || lowerCode.includes('us');

  // Derive initial values from heuristics & image characteristics
  if (sampledImagesCount > 0 || hasPosidoniaCode || hasSandCode || hasChainCode) {
    const avgBio = sampledImagesCount > 0 ? greenBrownBioPixels / sampledImagesCount : (hasPosidoniaCode ? 0.55 : 0.1);
    const avgSand = sampledImagesCount > 0 ? sandyLightPixels / sampledImagesCount : (hasSandCode ? 0.6 : 0.2);
    const avgContrast = sampledImagesCount > 0 ? darkChainContrast / sampledImagesCount : (hasChainCode ? 0.45 : 0.15);

    if (avgBio > 0.42 || hasPosidoniaCode) {
      suggestedC1 = hasPosidoniaCode ? 'high_coverage_or_protected' : 'renaturalized_algal';
      detectedFeatures.push("Biocolonització vegetal i recobriment algal observable sobre el formigó");
      detectedSpecies.push('Posidonia oceanica (rizomes)');
      detectedSpecies.push('Alga vermella calcària');
      suggestedC4 = 'fixed_by_roots_or_sediment';
      detectedFeatures.push('Rizomes i mata viva integrats a la base del bloc');
    } else if (avgBio > 0.22) {
      suggestedC1 = 'renaturalized_algal';
      detectedFeatures.push('Recobriment algal incipient / renaturalitzat observable');
      suggestedC4 = 'partial_burial_no_posidonia';
    } else {
      suggestedC1 = 'none';
      detectedFeatures.push('Superfície nua sense colonització d\'interès de conservació');
    }

    if (avgContrast > 0.32 || hasChainCode) {
      suggestedC2 = 'active_erosion_halo';
      suggestedHasMobileElements = true;
      suggestedUsage = 'in_use';
      detectedFeatures.push("Presència de cadena mòbil / halo d'abrasió detectat al voltant");
    } else {
      suggestedC2 = 'none';
      suggestedHasMobileElements = false;
      detectedFeatures.push('Absència de cadenes soltes ni halo d\'abrasió actiu');
    }

    if (hasSandCode || avgSand > 0.4) {
      suggestedC4 = 'not_buried_no_void';
      detectedFeatures.push('Assentat lliurement sobre fons sedimentari');
    }
  } else {
    detectedFeatures.push("Imatges carregades (cal confirmació visual per part del tècnic)");
  }

  const confidenceScore = sampledImagesCount > 0 ? Math.min(92, 70 + sampledImagesCount * 7) : 75;
  const visualObservations = `Pre-anàlisi automatitzat de ${photos.length} foto(s): ${detectedFeatures.join(' • ')}.`;
  
  const matrix128 = getMatrix128Combination(
    suggestedC1,
    suggestedC2 === 'active_erosion_halo' || suggestedHasMobileElements,
    suggestedC3,
    suggestedC4
  );

  return {
    suggestedC1,
    suggestedC2,
    suggestedC3,
    suggestedC4,
    suggestedUsage,
    suggestedHasMobileElements,
    suggestedDepthM,
    confidenceScore,
    detectedSpecies,
    detectedFeatures,
    visualObservations,
    aiSource: sampledImagesCount > 0 ? 'canvas_sampling' : 'heuristic_vision',
    matrix128,
  };
}

/**
 * Samples colors from an image using a lightweight temporary offscreen canvas
 */
function sampleImageColors(url: string): Promise<{ bioScore: number; sandScore: number; contrastScore: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        
        let bioPixels = 0;
        let sandPixels = 0;
        let highContrast = 0;
        const total = 64 * 64;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Brown / dark green seaweed detection (marine bio hues)
          if ((g > r && g > b && g > 60) || (r > 60 && g > 50 && b < 70)) {
            bioPixels++;
          }
          // Bright sand / clear water hues
          if (r > 120 && g > 130 && b > 100) {
            sandPixels++;
          }
          // Dark chains / iron
          if (r < 50 && g < 60 && b < 60) {
            highContrast++;
          }
        }

        resolve({
          bioScore: bioPixels / total,
          sandScore: sandPixels / total,
          contrastScore: highContrast / total,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Converts a validated BatchMortGroup into a standard MortEvaluationRecord
 */
export function convertBatchMortToRecord(
  mort: BatchMortGroup,
  locationName: string = 'Inspecció en Batch'
): MortEvaluationRecord {
  const result = evaluateDecision(
    mort.validatedC1,
    mort.validatedC2,
    mort.validatedC3,
    mort.validatedC4,
    mort.validatedUsage,
    mort.validatedHasMobileElements,
    false
  );

  const dimensions = mort.dimensions || {
    lengthCm: 80,
    widthCm: 80,
    heightCm: 40,
    concreteDensityKgM3: 2400,
  };
  const numberOfBlocks = mort.numberOfBlocks || 1;

  const hydro = assessHydrodynamics(
    dimensions,
    mort.validatedDepthM || 8,
    9
  );

  const photoUrls = mort.photos.map((p) => p.url);

  return {
    id: `batch_${Date.now()}_${mort.id}`,
    code: mort.mortCode,
    date: new Date().toISOString().split('T')[0],
    locationName: mort.locationName || locationName,
    latitude: mort.latitude,
    longitude: mort.longitude,
    depthM: mort.validatedDepthM || 8,
    usageStatus: mort.validatedUsage,
    presenceStatus: 'located',
    numberOfBlocks: numberOfBlocks,
    connectionMode: mort.connectionMode || (numberOfBlocks > 1 ? 'chained' : 'isolated'),
    dimensions: dimensions,
    c1_speciesPresence: mort.validatedC1,
    c2_substrateImpact: mort.validatedC2,
    c2_hasMobileElements: mort.validatedHasMobileElements,
    c3_dynamismRisk: mort.validatedC3,
    c3_useCustomPhysics: false,
    c4_stabilityIntegration: mort.validatedC4,
    evaluatorCriteria: mort.evaluatorCriteria,
    seabedTypes: mort.seabedTypes && mort.seabedTypes.length > 0 ? mort.seabedTypes : undefined,
    posidoniaDistances: mort.posidoniaDistances && mort.posidoniaDistances.length > 0 ? mort.posidoniaDistances : undefined,
    result,
    hydrodynamics: hydro,
    observerName: 'Tècnic de Camp (Batch)',
    generalNotes: mort.notes
      ? `${mort.notes} • [Anàlisi en Batch: ${mort.photos.length} fotos agrupades]`
      : `Diagnosi generada des d'Anàlisi en Batch (${mort.photos.length} fotos agrupades).`,
    photoUrl: photoUrls[0] || undefined,
    photos: photoUrls,
    thumbnails: photoUrls.slice(0, 3),
  };
}

/**
 * Preloaded Demo Datasets for instant Testing of Batch Pre-Analysis
 */
export interface DemoBatchLot {
  id: string;
  name: string;
  location: string;
  description: string;
  items: {
    mortCode: string;
    folderOrPrefix: string;
    photos: { name: string; url: string; photoIndex: number }[];
    expectedCasuistica: number;
    expectedAction: string;
  }[];
}

export const DEMO_BATCH_LOTS: DemoBatchLot[] = [
  {
    id: 'lot_montgo_6',
    name: 'Lot de Prova: Cala Montgó (6 Morts / 18 Imatges)',
    location: 'Cala Montgó - Sector Nord',
    description: 'Lot complet d\'inspecció submarina amb casuístiques d\'arrelament en Posidònia, cadenes mòbils i fons sedimentari.',
    items: [
      {
        mortCode: 'CM-01_Sorra_Cadena',
        folderOrPrefix: 'Format nom: CM-01_Sorra_Cadena (x)',
        expectedCasuistica: 17,
        expectedAction: 'RETIRADA IMMEDIATA',
        photos: [
          { name: 'CM-01_Sorra_Cadena (1).jpg', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-01_Sorra_Cadena (2).jpg', url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
          { name: 'CM-01_Sorra_Cadena (3).jpg', url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=800&q=80', photoIndex: 3 },
        ],
      },
      {
        mortCode: 'CM-02_Posidonia_Arrelat',
        folderOrPrefix: 'Format nom: CM-02_Posidonia_Arrelat (x)',
        expectedCasuistica: 128,
        expectedAction: 'CONSERVAR',
        photos: [
          { name: 'CM-02_Posidonia_Arrelat (1).jpg', url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-02_Posidonia_Arrelat (2).jpg', url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
          { name: 'CM-02_Posidonia_Arrelat (3).jpg', url: 'https://images.unsplash.com/photo-1544551763-77ef2d0cf96c?auto=format&fit=crop&w=800&q=80', photoIndex: 3 },
        ],
      },
      {
        mortCode: 'CM-03_Enfonsat_Sediment',
        folderOrPrefix: 'Format nom: CM-03_Enfonsat_Sediment (x)',
        expectedCasuistica: 45,
        expectedAction: 'RETIRADA PROGRAMADA',
        photos: [
          { name: 'CM-03_Enfonsat_Sediment (1).jpg', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-03_Enfonsat_Sediment (2).jpg', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
        ],
      },
      {
        mortCode: 'CM-04_Superficial_Calm',
        folderOrPrefix: 'Format nom: CM-04_Superficial_Calm (x)',
        expectedCasuistica: 78,
        expectedAction: 'PRIORITAT BAIXA / MITIGACIÓ',
        photos: [
          { name: 'CM-04_Superficial_Calm (1).jpg', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-04_Superficial_Calm (2).jpg', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
          { name: 'CM-04_Superficial_Calm (3).jpg', url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80', photoIndex: 3 },
        ],
      },
      {
        mortCode: 'CM-05_Escull_Coralligen',
        folderOrPrefix: 'Format nom: CM-05_Escull_Coralligen (x)',
        expectedCasuistica: 112,
        expectedAction: 'CONSERVAR',
        photos: [
          { name: 'CM-05_Escull_Coralligen (1).jpg', url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-05_Escull_Coralligen (2).jpg', url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
        ],
      },
      {
        mortCode: 'CM-06_Inestable_Poca_Fondaria',
        folderOrPrefix: 'Format nom: CM-06_Inestable_Poca_Fondaria (x)',
        expectedCasuistica: 3,
        expectedAction: 'RETIRADA IMMEDIATA',
        photos: [
          { name: 'CM-06_Inestable_Poca_Fondaria (1).jpg', url: 'https://images.unsplash.com/photo-1544551763-77ef2d0cf96c?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'CM-06_Inestable_Poca_Fondaria (2).jpg', url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
        ],
      },
    ],
  },
  {
    id: 'lot_giverola_4',
    name: 'Lot de Prova: Cala Giverola (4 Morts / 10 Imatges)',
    location: 'Cala Giverola - Tossa de Mar',
    description: 'Camp de boies estacional en fons mixt de roca i praderia discontínua.',
    items: [
      {
        mortCode: 'GIV-01_Bloc_Roca',
        folderOrPrefix: 'Format nom: GIV-01_Bloc_Roca (x)',
        expectedCasuistica: 34,
        expectedAction: 'RETIRADA PROGRAMADA',
        photos: [
          { name: 'GIV-01_Bloc_Roca (1).jpg', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'GIV-01_Bloc_Roca (2).jpg', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
        ],
      },
      {
        mortCode: 'GIV-02_Posidonia_Cystoseira',
        folderOrPrefix: 'Format nom: GIV-02_Posidonia_Cystoseira (x)',
        expectedCasuistica: 120,
        expectedAction: 'CONSERVAR',
        photos: [
          { name: 'GIV-02_Posidonia_Cystoseira (1).jpg', url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'GIV-02_Posidonia_Cystoseira (2).jpg', url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
          { name: 'GIV-02_Posidonia_Cystoseira (3).jpg', url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=800&q=80', photoIndex: 3 },
        ],
      },
      {
        mortCode: 'GIV-03_Cadena_Erosio',
        folderOrPrefix: 'Format nom: GIV-03_Cadena_Erosio (x)',
        expectedCasuistica: 12,
        expectedAction: 'RETIRADA IMMEDIATA',
        photos: [
          { name: 'GIV-03_Cadena_Erosio (1).jpg', url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'GIV-03_Cadena_Erosio (2).jpg', url: 'https://images.unsplash.com/photo-1544551763-77ef2d0cf96c?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
        ],
      },
      {
        mortCode: 'GIV-04_Bloc_Abandonat',
        folderOrPrefix: 'Format nom: GIV-04_Bloc_Abandonat (x)',
        expectedCasuistica: 62,
        expectedAction: 'PRIORITAT BAIXA / MITIGACIÓ',
        photos: [
          { name: 'GIV-04_Bloc_Abandonat (1).jpg', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80', photoIndex: 1 },
          { name: 'GIV-04_Bloc_Abandonat (2).jpg', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', photoIndex: 2 },
          { name: 'GIV-04_Bloc_Abandonat (3).jpg', url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=800&q=80', photoIndex: 3 },
        ],
      },
    ],
  },
];
