export type PresenceStatus = 'located' | 'not_found';

export type SeabedTypeOption = 'dur' | 'tou' | 'posidonia' | 'mata_morta';

export interface SeabedTypeDefinition {
  id: SeabedTypeOption;
  number: number;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const SEABED_TYPE_OPTIONS: SeabedTypeDefinition[] = [
  { id: 'dur', number: 1, label: '1.- Dur', shortLabel: 'Dur', badgeClass: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'tou', number: 2, label: '2.- Tou', shortLabel: 'Tou', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'posidonia', number: 3, label: '3.- Posidònia (o altres fanerogames)', shortLabel: 'Posidònia (o altres fanerogames)', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'mata_morta', number: 4, label: '4.- Mata morta', shortLabel: 'Mata morta', badgeClass: 'bg-orange-100 text-orange-900 border-orange-300' },
];

export type PosidoniaDistanceOption = 'less_than_depth' | 'less_than_5m';

export interface PosidoniaDistanceDefinition {
  id: PosidoniaDistanceOption;
  number: number;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const POSIDONIA_DISTANCE_OPTIONS: PosidoniaDistanceDefinition[] = [
  { id: 'less_than_depth', number: 1, label: '1.- <Profunditat', shortLabel: '< Profunditat', badgeClass: 'bg-teal-100 text-teal-900 border-teal-300' },
  { id: 'less_than_5m', number: 2, label: '2.- < 5m', shortLabel: '< 5m', badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
];

export function getSeabedTypeLabels(types?: SeabedTypeOption[]): string[] {
  if (!types || types.length === 0) return [];
  const map: Record<SeabedTypeOption, string> = {
    dur: '1.- Dur',
    tou: '2.- Tou',
    posidonia: '3.- Posidònia (o altres fanerogames)',
    mata_morta: '4.- Mata morta',
  };
  return types.map((t) => map[t] || t);
}

export function getPosidoniaDistanceLabels(distances?: PosidoniaDistanceOption[]): string[] {
  if (!distances || distances.length === 0) return [];
  const map: Record<PosidoniaDistanceOption, string> = {
    less_than_depth: '1.- <Profunditat',
    less_than_5m: '2.- < 5m',
  };
  return distances.map((d) => map[d] || d);
}

export type SpeciesPresenceOption = 
  | 'high_coverage_or_protected' // Cobertura >10% o exemplars reproductors d'espècies protegides (-10)
  | 'low_coverage'               // <10% espècies amenaçades/interès (-7)
  | 'renaturalized_algal'        // recobriment algal / renaturalitzat general (-5)
  | 'none';                      // absència d'espècies d'interès (0)

export type SubstrateImpactOption =
  | 'active_erosion_halo'        // En ús: Evidència directa d'erosió activa o rizomes trencats / En desús: Amb elements mòbils (+5)
  | 'none';                      // Absència d'abrasió o desplaçament / Sense elements mòbils (0)

export type MortUsageStatus = 'in_use' | 'abandoned';

export type DynamismRiskOption =
  | 'high_risk'                  // Categorització Blau (+3) - Risc alt / gran capacitat d'arrossegament
  | 'moderate_risk'              // Categorització Verd (+2) - Risc mitjà-alt
  | 'low_risk'                   // Categorització Taronja (+1) - Risc baix
  | 'no_risk';                   // Categorització Vermell (0) - Absència de risc

export type StabilityIntegrationOption =
  | 'not_buried_no_void'         // Bloc lliure, no toca posidònia, no genera espai buit (+8)
  | 'partial_burial_no_posidonia' // Enfonsament parcial, no toca posidònia, no genera espai buit (+4)
  | 'not_buried_generates_void'  // Bloc no enterrat, sí genera un espai buit nou (-6)
  | 'fixed_by_roots_or_sediment'; // Bloc fixat per les pròpies arrels de Posidònia (-12)

export type StructureType = 'concrete_block' | 'other_structure';

export interface OtherStructureDetails {
  customTypeDescription?: string; // Ex: "Àncora d'almirallat", "Pneumàtic amb formigó", "Estructura metàl·lica", "Pedra irregular"
  estimatedVolumeM3?: number; // Volum aproximat (m³)
  estimatedWeightAirKg?: number; // Pes estimat a l'aire (kg)
  estimatedSubmergedWeightKg?: number; // Pes estimat submergit (kg)
  structureNotes?: string; // Comentari sobre l'estructura
}

export interface BlockDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  concreteDensityKgM3: number; // default 2400 kg/m3 (mass) or 2500 (reinforced)
}

export interface BlockItem {
  id: string;
  blockNumber: number;
  label?: string; // Ex: "Mort 1", "Bloc 2", "Àncora 1"
  
  // Tipus d'estructura & Dimensions
  structureType?: StructureType; // 'concrete_block' | 'other_structure'
  dimensions: BlockDimensions;
  presetId?: string;
  otherStructure?: OtherStructureDetails;

  // 1 Protecció d'espècies amenaçades o hàbitats protegits
  c1_speciesPresence: SpeciesPresenceOption;
  c1_selectedSpecies?: string[];
  c1_speciesNotes?: string;

  // 2 Impacte sobre el substrat annex (elements mòbils / abrasió)
  c2_substrateImpact: SubstrateImpactOption;
  c2_hasMobileElements: boolean;
  c2_abrasionAreaM2?: number; // Superfície estimada d'abrasió (m²)
  c2_haloRadiusM?: number; // Manteniment per retrocompatibilitat
  c2_notes?: string;

  // 3 Dinamisme i risc (Tamany, pes i fondària)
  c3_dynamismRisk: DynamismRiskOption;
  c3_useCustomPhysics: boolean;

  // 4 Estabilitat i integració en l'hàbitat (enterrament i rizoma)
  c4_stabilityIntegration: StabilityIntegrationOption;
  c4_notes?: string;

  // 5 Observacions de camp / Notes per a l'acta d'aquest mort/bloc
  notes?: string;

  // 6 Criteri de l'Avaluador (Opcions manuals de camp)
  evaluatorCriteria?: EvaluatorCriteria;

  // 7 Caracterització del fons i distància a Posidònia
  seabedTypes?: SeabedTypeOption[];
  posidoniaDistances?: PosidoniaDistanceOption[];

  // Càlculs & Diagnosi individual
  hydrodynamics?: HydrodynamicAssessment;
  result?: DecisionResult;
}

export interface EvaluatorCriteria {
  absencePosidoniaOrHabitats?: boolean; // "Absència de posidònia/hàbitats protegits"
  immediateRemoval?: boolean;           // "Retirar mort de forma immediata, a criteri de l'avaluador"
  scheduledRemoval?: boolean;           // "Retirar mort de forma programada, a criteri de l'avaluador"
  neutralizeAndMaintain?: boolean;      // "Neutralitzar mort i mantenir, a criteri de l'avaluador"
  noRemoval?: boolean;                  // "No retirar mort a criteri de l'avaluador"
}

export interface EvaluatorOptionDefinition {
  key: keyof EvaluatorCriteria;
  label: string;
  shortLabel: string;
  type: 'condition' | 'action';
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  description: string;
}

export const EVALUATOR_CRITERIA_OPTIONS: EvaluatorOptionDefinition[] = [
  {
    key: 'absencePosidoniaOrHabitats',
    label: 'Absència de posidònia/hàbitats protegits',
    shortLabel: 'Absència Posidònia',
    type: 'condition',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-emerald-500',
    bgClass: 'bg-emerald-50/50',
    description: 'Constatació directa per part del tècnic de la manca de Posidonia oceanica o comunitats vulnerables.',
  },
  {
    key: 'immediateRemoval',
    label: "Retirar mort de forma immediata, a criteri de l'avaluador",
    shortLabel: 'Retirada Immediata (Avaluador)',
    type: 'action',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    borderClass: 'border-rose-500',
    bgClass: 'bg-rose-50/50',
    description: "Decisió tècnica d'extracció urgent per motius operatius, de seguretat o d'impacte greu in situ.",
  },
  {
    key: 'scheduledRemoval',
    label: "Retirar mort de forma programada, a criteri de l'avaluador",
    shortLabel: 'Retirada Programada (Avaluador)',
    type: 'action',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-50/50',
    description: "Decisió tècnica de retirada en campanya programada sense caràcter d'urgència immediata.",
  },
  {
    key: 'neutralizeAndMaintain',
    label: "Neutralitzar mort i mantenir, a criteri de l'avaluador",
    shortLabel: 'Neutralitzar i Mantenir (Avaluador)',
    type: 'action',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    borderClass: 'border-sky-500',
    bgClass: 'bg-sky-50/50',
    description: "Tallar cadenes/grillets actius in situ per suprimir l'abrasió, conservant el bloc com a refugi subaquàtic.",
  },
  {
    key: 'noRemoval',
    label: "No retirar mort a criteri de l'avaluador",
    shortLabel: 'No Retirar / Conservar (Avaluador)',
    type: 'action',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
    borderClass: 'border-teal-500',
    bgClass: 'bg-teal-50/50',
    description: "Dictamen de preservació total in situ com a escull de biodiversitat i biòtop consolidat.",
  },
];

export function getActiveEvaluatorCriteriaLabels(criteria?: EvaluatorCriteria): string[] {
  if (!criteria) return [];
  const labels: string[] = [];
  if (criteria.absencePosidoniaOrHabitats) labels.push('Absència de posidònia/hàbitats protegits');
  if (criteria.immediateRemoval) labels.push("Retirar mort de forma immediata, a criteri de l'avaluador");
  if (criteria.scheduledRemoval) labels.push("Retirar mort de forma programada, a criteri de l'avaluador");
  if (criteria.neutralizeAndMaintain) labels.push("Neutralitzar mort i mantenir, a criteri de l'avaluador");
  if (criteria.noRemoval) labels.push("No retirar mort a criteri de l'avaluador");
  return labels;
}

export function getEvaluatorActionLabel(criteria?: EvaluatorCriteria): string | null {
  if (!criteria) return null;
  if (criteria.immediateRemoval) return "Retirar mort de forma immediata, a criteri de l'avaluador";
  if (criteria.scheduledRemoval) return "Retirar mort de forma programada, a criteri de l'avaluador";
  if (criteria.neutralizeAndMaintain) return "Neutralitzar mort i mantenir, a criteri de l'avaluador";
  if (criteria.noRemoval) return "No retirar mort a criteri de l'avaluador";
  return null;
}

export interface HydrodynamicAssessment {
  volumeM3: number;
  weightAirKg: number;
  submergedWeightKg: number;
  depthM: number;
  criticalBottomVelocityUb: number; // m/s
  wavePeriodSeconds: number; // 8s - 10s
  criticalWaveHeightM: number | 'unlikely_breaking'; // H necessària
  breakingWaveHeightLimitM: number; // Hmax ≈ 0.78 * d
  willSlideInSevereStorm: boolean;
  slidingRiskScore: number; // 0, 1, 2, 3
  riskColor: 'blue' | 'green' | 'orange' | 'red';
}

export type ActionCategory = 
  | 'high_priority'      // ≥ +10 pts
  | 'medium_priority'    // +5 a +9 pts
  | 'low_priority'       // +1 a +4 pts
  | 'conservation'       // ≤ 0 pts
  | 'not_found';         // Mort no localitzat / desaparegut

export interface DecisionResult {
  totalScore: number;
  combinationId?: number;
  casuistica128Id?: number;
  category: ActionCategory;
  categoryTitle: string;
  decisionLabel?: string;
  finalDecision?: 'REMOVE' | 'LEAVE' | 'MITIGATE';
  recommendedAction: string;
  mitigationAction: string;
  matrixDiagnostic?: string;
  colorClass: string;
  badgeClass: string;
  ecologicalJustification: string;
  operationalRecommendation: string;
  scoresBreakdown: {
    c1_species: number;
    c2_substrate: number;
    c3_dynamism: number;
    c4_stability: number;
  };
}

export type BlockConnectionMode = 'chained' | 'isolated';

export interface MortEvaluationRecord {
  id: string;
  code: string; // Ex: "M-01-CalaMontgo"
  date: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  depthM: number;
  usageStatus: MortUsageStatus;
  
  // Estat de presència
  presenceStatus?: PresenceStatus; // 'located' | 'not_found'
  notFoundReason?: string; // Ex: "Soterrat pel sediment", "Arrossegat per temporal", etc.
  
  // Dimensions & Blocs
  numberOfBlocks?: number; // Nombre de blocs (per defecte: 1)
  connectionMode?: BlockConnectionMode; // 'chained' (concatenats amb cadena) | 'isolated' (aïllats / independents)
  structureType?: StructureType; // 'concrete_block' | 'other_structure'
  dimensions: BlockDimensions; // Dimensions principals o del bloc 1
  otherStructure?: OtherStructureDetails;
  blocks?: BlockItem[]; // Detall per a cadascun dels blocs quan n'hi ha més d'un

  // Criteria selections
  c1_speciesPresence: SpeciesPresenceOption;
  c1_speciesNotes?: string;
  
  c2_substrateImpact: SubstrateImpactOption;
  c2_hasMobileElements: boolean;
  c2_abrasionAreaM2?: number; // Superfície estimada d'abrasió (m²)
  c2_haloRadiusM?: number;
  c2_notes?: string;
  
  c3_dynamismRisk: DynamismRiskOption;
  c3_useCustomPhysics: boolean;
  
  c4_stabilityIntegration: StabilityIntegrationOption;
  c4_notes?: string;
  
  // Criteri de l'Avaluador (Opcions de camp complementàries)
  evaluatorCriteria?: EvaluatorCriteria;
  
  // Caracterització del fons i distància a Posidònia
  seabedTypes?: SeabedTypeOption[];
  posidoniaDistances?: PosidoniaDistanceOption[];
  
  // Evaluated result
  result: DecisionResult;
  hydrodynamics?: HydrodynamicAssessment;
  
  observerName?: string;
  generalNotes?: string;
  photoUrl?: string;
  photos?: string[];
  thumbnails?: string[];
}
