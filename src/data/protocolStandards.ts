export interface PresetBlock {
  id: string;
  name: string;
  dimensionsCm: { length: number; width: number; height: number };
  volumeM3: number;
  weightAirKg: number;
  submergedWeightKg: number;
  criticalUbMs: number;
  waveHeightsByDepth: {
    atMinus5m: string;
    atMinus10m: string;
    atMinus15m: string;
    atMinus20m: string;
  };
  description: string;
}

export const PRESET_BLOCKS: PresetBlock[] = [
  {
    id: 'block_40x40x40',
    name: 'Bloc Petit (40 x 40 x 40 cm)',
    dimensionsCm: { length: 40, width: 40, height: 40 },
    volumeM3: 0.064,
    weightAirKg: 153.6,
    submergedWeightKg: 88.0,
    criticalUbMs: 2.1,
    waveHeightsByDepth: {
      atMinus5m: '3,0 – 3,3 m',
      atMinus10m: '4,8 – 5,3 m',
      atMinus15m: '6,5 – 7,5 m',
      atMinus20m: '8,2 – 10,2 m',
    },
    description: 'Bloc molt lleuger, fàcilment mobilitzable durant temporals hivernals ordinaris en zones someres (<15 m).',
  },
  {
    id: 'block_80x80x40',
    name: 'Bloc Mitjà Estàndard (80 x 80 x 40 cm)',
    dimensionsCm: { length: 80, width: 80, height: 40 },
    volumeM3: 0.256,
    weightAirKg: 614.4,
    submergedWeightKg: 352.0,
    criticalUbMs: 2.6,
    waveHeightsByDepth: {
      atMinus5m: '3,8 – 4,2 m',
      atMinus10m: '6,1 – 6,7 m',
      atMinus15m: '8,2 – 9,5 m',
      atMinus20m: '10,3 – 13,0 m',
    },
    description: 'Pes considerable. A fondàries superiors a 10-15 m requereix temporals extrems per lliscar.',
  },
  {
    id: 'block_100x100x30',
    name: 'Bloc Pla / Placa (100 x 100 x 30 cm)',
    dimensionsCm: { length: 100, width: 100, height: 30 },
    volumeM3: 0.300,
    weightAirKg: 720.0,
    submergedWeightKg: 412.5,
    criticalUbMs: 2.6,
    waveHeightsByDepth: {
      atMinus5m: '3,8 – 4,1 m',
      atMinus10m: '6,1 – 6,7 m',
      atMinus15m: '8,1 – 9,5 m',
      atMinus20m: '10,3 – 12,9 m',
    },
    description: 'Perfil hidrodinàmic baix (30 cm alt) que compensa la major superfície horitzontal reduint l\'impacte frontal de l\'aigua.',
  },
  {
    id: 'block_150x150x50',
    name: 'Bloc Gran / Pesant (150 x 150 x 50 cm)',
    dimensionsCm: { length: 150, width: 150, height: 50 },
    volumeM3: 1.125,
    weightAirKg: 2700.0,
    submergedWeightKg: 1546.9,
    criticalUbMs: 3.3,
    waveHeightsByDepth: {
      atMinus5m: 'Improbable (ona trenca a 3,9 m)',
      atMinus10m: '7,7 – 8,4 m',
      atMinus15m: '10,2 – 11,9 m',
      atMinus20m: '12,9 – 16,2 m',
    },
    description: 'Elevadíssima inèrcia (>1,5 tones submergides). A -5 m l\'ona trenca abans de poder desplaçar-lo per lliscament pur.',
  },
];

export interface SpeciesInfo {
  scientificName: string;
  commonNameCatalan: string;
  protectionStatus: string;
  conservationValue: string;
  category: 'fucales' | 'coralligenous' | 'seagrass' | 'cnidarian' | 'mollusc';
}

export const PROTECTED_SPECIES_CATALOG: SpeciesInfo[] = [
  {
    scientificName: 'Cystoseira / Ericaria / Gongolaria / Treptacantha spp.',
    commonNameCatalan: 'Algues fucals estructurants (boscos d\'algues brunes)',
    protectionStatus: 'Directiva Hàbitats (Annex I/II), Conveni de Berna, Catàleg Nacional/Gencat',
    conservationValue: 'Molt Alta. Espècies formadores d\'hàbitat, creixement lent, altament vulnerables a pertorbacions mecàniques.',
    category: 'fucales',
  },
  {
    scientificName: 'Posidonia oceanica (colonització adherida/rizoma)',
    commonNameCatalan: 'Posidònia mediterrània (mata/rizoma adherit al bloc)',
    protectionStatus: 'Directiva Hàbitats (Hàbitat Prioritari 1120*), Decret de Protecció Posidònia',
    conservationValue: 'Crítica. Fixa el fons i crea biòtop clau. El trencament mecànic genera marmites d\'erosió irreversibles.',
    category: 'seagrass',
  },
  {
    scientificName: 'Cymodocea nodosa',
    commonNameCatalan: 'Sedassa / Herba de mar (fanerògama marina)',
    protectionStatus: 'Directiva Hàbitats (Annex I - 1110 Bancs de sorra), Catàleg d\'Espècies Amenaçades de Catalunya',
    conservationValue: 'Molt Alta. Fanerògama pionera i estabilitzadora de fons sedimentaris i sorrencs somers, d\'alt valor ecològic.',
    category: 'seagrass',
  },
  {
    scientificName: 'Lithophyllum spp. i altres algues calcàries incrustants',
    commonNameCatalan: 'Lithophyllum (L. byssoides, L. incrustans, Lithothamnion) i algues coral·linàcies encrostants',
    protectionStatus: 'Directiva Hàbitats (1170 Esculls), Conveni de Berna (Annex I)',
    conservationValue: 'Alta. Algues vermelles calcàries (rodòfits calcaris) de creixement mil·limètric anual amb funció bioconstrucció i cimentació.',
    category: 'coralligenous',
  },
  {
    scientificName: 'Comunitat de Coral·ligen (Hàbitat 1170 Esculls)',
    commonNameCatalan: 'Hàbitat de Coral·ligen mediterrani i biocenosi coral·lígena',
    protectionStatus: 'Directiva Hàbitats (Hàbitat 1170), Conveni de Barcelona (SPA/BD Protocol)',
    conservationValue: 'Crítica. Estructura biogènica tridimensional d\'extraordinària biodiversitat, taxa de renovació extremadament lenta.',
    category: 'coralligenous',
  },
  {
    scientificName: 'Organismes sèssils propis del coral·ligen',
    commonNameCatalan: 'Gorgònies (Paramuricea, Eunicella), esponges massives (Axinella), briozous (Pentapora) i ascidis',
    protectionStatus: 'Conveni de Barcelona (Annex II), Llista Vermella de la UICN',
    conservationValue: 'Molt Alta. Organismes sèssils filtradors d\'elevada longevitat i gran fragilitat estructural davant d\'impactes mecànics.',
    category: 'coralligenous',
  },
  {
    scientificName: 'Cladocora caespitosa',
    commonNameCatalan: 'Madrèpora mediterrània (corall colonial bioconstructor)',
    protectionStatus: 'Directiva Hàbitats, Llista Vermella UICN (En Perill), Catàleg Nacional Espècies Amenaçades',
    conservationValue: 'Molt Alta. Únic autèntic corall dur colonial bioconstructor endèmic de la Mediterrània.',
    category: 'cnidarian',
  },
  {
    scientificName: 'Pinna nobilis / Pinna rudis',
    commonNameCatalan: 'Nacra / Nacra de roca (mol·luscs bivalves protegits)',
    protectionStatus: 'En Perill Crític d\'Extinció (UICN, Catàleg Espanyol d\'Espècies Amenaçades, CEE)',
    conservationValue: 'Crítica. Espècies sotmeses a protecció estricta; qualsevol manipulació requereix autorització específica.',
    category: 'mollusc',
  },
];

export const HYDRODYNAMICS_PHYSICS_CONSTANTS = {
  concreteMassDensity: 2400, // kg/m³
  concreteReinforcedDensity: 2500, // kg/m³
  seawaterDensity: 1025, // kg/m³
  frictionCoefficientMu: 0.6, // friction on dense sand / flat rock
  depthBreakingRatio: 0.78, // Hmax ≈ 0.78 * d
  typicalStormPeriodTMin: 8, // seconds
  typicalStormPeriodTMax: 10, // seconds
};
