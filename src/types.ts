export type PresenceStatus = 'located' | 'not_found';

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
  | 'not_buried_no_void'         // Bloc no enterrat, no toca rizoma, retirada NO genera espai buit (+5)
  | 'not_buried_generates_void'  // Bloc no enterrat, no toca rizoma, retirada SÍ genera espai buit (-5)
  | 'fixed_by_roots_or_sediment'; // Bloc fixat pel sediment o per les pròpies arrels de la praderia (-5)

export interface BlockDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  concreteDensityKgM3: number; // default 2400 kg/m3 (mass) or 2500 (reinforced)
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
  category: ActionCategory;
  categoryTitle: string;
  recommendedAction: string;
  mitigationAction: string;
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
  
  // Dimensions
  dimensions: BlockDimensions;
  
  // Criteria selections
  c1_speciesPresence: SpeciesPresenceOption;
  c1_speciesNotes?: string;
  
  c2_substrateImpact: SubstrateImpactOption;
  c2_hasMobileElements: boolean;
  c2_haloRadiusM?: number;
  c2_notes?: string;
  
  c3_dynamismRisk: DynamismRiskOption;
  c3_useCustomPhysics: boolean;
  
  c4_stabilityIntegration: StabilityIntegrationOption;
  c4_notes?: string;
  
  // Evaluated result
  result: DecisionResult;
  hydrodynamics?: HydrodynamicAssessment;
  
  observerName?: string;
  generalNotes?: string;
  photoUrl?: string;
  photos?: string[];
}
