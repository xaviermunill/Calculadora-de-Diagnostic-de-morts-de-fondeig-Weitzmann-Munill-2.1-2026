import {
  DecisionResult,
  ActionCategory,
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
} from '../types';
import { getMatrixCombination } from '../data/decisionMatrix256';
import { getMatrix128Combination } from '../data/decisionMatrix128';

export function calculateScoreBreakdown(
  c1: SpeciesPresenceOption,
  c2: SubstrateImpactOption,
  c3: DynamismRiskOption,
  c4: StabilityIntegrationOption,
  hasMobileElements: boolean = false
) {
  // Criteri 1: Protecció d'espècies amenaçades o hàbitats protegits (-12 a 0)
  let s1 = 0;
  if (c1 === 'high_coverage_or_protected') s1 = -12;
  else if (c1 === 'low_coverage') s1 = -8;
  else if (c1 === 'renaturalized_algal') s1 = -4;
  else if (c1 === 'none') s1 = 0;

  // Criteri 2: Impacte sobre el substrat annex (0 a +6)
  let s2 = 0;
  if (c2 === 'active_erosion_halo' || hasMobileElements) s2 = 6;
  else if (c2 === 'none') s2 = 0;

  // Criteri 3: Dinamisme i Risc — Tamany, pes i fondària (0 a +4)
  let s3 = 0;
  if (c3 === 'high_risk') s3 = 4;
  else if (c3 === 'moderate_risk') s3 = 2;
  else if (c3 === 'low_risk') s3 = 1;
  else if (c3 === 'no_risk') s3 = 0;

  // Criteri 4: Estabilitat i Integració en l'hàbitat (-12 a +8)
  let s4 = 0;
  if (c4 === 'not_buried_no_void') s4 = 8;
  else if (c4 === 'partial_burial_no_posidonia') s4 = 4;
  else if (c4 === 'not_buried_generates_void') s4 = -6;
  else if (c4 === 'fixed_by_roots_or_sediment') s4 = -12;

  const total = s1 + s2 + s3 + s4;

  return {
    c1_species: s1,
    c2_substrate: s2,
    c3_dynamism: s3,
    c4_stability: s4,
    total,
  };
}

export function evaluateDecision(
  c1: SpeciesPresenceOption,
  c2: SubstrateImpactOption,
  c3: DynamismRiskOption,
  c4: StabilityIntegrationOption,
  usageStatus: MortUsageStatus = 'in_use',
  hasMobileElements: boolean = false,
  isNotFound: boolean = false
): DecisionResult {
  const breakdown = calculateScoreBreakdown(c1, c2, c3, c4, hasMobileElements);
  const total = isNotFound ? 0 : breakdown.total;

  // Lookup in 256 matrix & 128 matrix
  const matrixItem = getMatrixCombination(
    c1,
    c2,
    usageStatus,
    c3,
    c4,
    hasMobileElements
  );
  const matrix128Item = getMatrix128Combination(
    c1,
    c2 === 'active_erosion_halo' || hasMobileElements,
    c3,
    c4
  );

  let category: ActionCategory;
  let categoryTitle: string;
  let recommendedAction: string;
  let decisionLabel: string;
  let finalDecision: 'REMOVE' | 'LEAVE' | 'MITIGATE';
  let mitigationAction: string;
  let colorClass: string;
  let badgeClass: string;
  let ecologicalJustification: string;
  let operationalRecommendation: string;

  if (isNotFound) {
    category = 'not_found';
    categoryTitle = 'No Localitzat / Desaparegut';
    recommendedAction = 'SENSE ACTUACIÓ (No Present)';
    decisionLabel = 'No Localitzat';
    finalDecision = 'LEAVE';
    colorClass = 'border-slate-500 bg-slate-50 text-slate-800';
    badgeClass = 'bg-slate-700 text-white';
    ecologicalJustification =
      'El bloc no ha estat localitzat a les coordenades ni cota de fondària indicades durant la immersió de prospecció (possiblement soterrat pel sediment mòbil, arrossegat per temporals a zones més profundes o retirat amb anterioritat).';
    operationalRecommendation =
      'Registrar l\'estat com a "No Localitzat / Desaparegut" a l\'inventari per al control cartogràfic. No cal mobilitzar mitjans d\'extracció. Mantenir la referència per a futures prospeccions.';
    mitigationAction =
      'Actualitzar la cartografia marina i donar de baixa provisional el punt de fondeig.';
  } else if (total >= 10) {
    category = 'high_priority';
    categoryTitle = 'Prioritat Alta (Retirada Immediata)';
    recommendedAction = 'RETIRADA IMMEDIATA';
    decisionLabel = 'Retirada Immediata';
    finalDecision = 'REMOVE';
    colorClass = 'border-rose-600 bg-rose-50 text-rose-900';
    badgeClass = 'bg-[#8B322C] text-white';
    ecologicalJustification =
      'Estratègic extreure\'ls immediatament: generen dany actiu sobre el substrat (halo d\'erosió / abrasió mecànica de cadenes), presenten risc alt de mobilitat per hidrodinàmica i no aporten valor ecològic ni colonització d\'espècies protegides.';
    operationalRecommendation =
      'Extracció immediata del mort i de totes les cadenes restants. Utilitzar globus reflotadors d\'ascens vertical (lift bags) per evitar arrossegar pel fons. Substitució per ancoratge de baix impacte (àncora helicoïdal o fondeig ecològic).';
    mitigationAction = matrixItem.mitigationProposals ||
      'Retirada completa del bloc i de les cadenes abandonades. Restauració activa del substrat afectat mitjançant fixació o recolonització.';
  } else if (total >= 5 && total <= 9) {
    category = 'medium_priority';
    categoryTitle = 'Prioritat Mitjana (Retirada Programada)';
    recommendedAction = 'RETIRADA PROGRAMADA';
    decisionLabel = 'Retirada Programada';
    finalDecision = 'REMOVE';
    colorClass = 'border-amber-600 bg-amber-50 text-amber-900';
    badgeClass = 'bg-[#7D5B18] text-white';
    ecologicalJustification =
      'Convé la seva retirada en segones fases d\'actuació. Presenta impacte moderat o risc de mobilitat, però amb un cert grau d\'estabilitat o recobriment incipient que no aconsella una intervenció d\'urgència.';
    operationalRecommendation =
      'Programar la retirada durant la finestra de mar en calma. Si està en ús o té cadenes residuals que toquen el fons, instal·lar flotadors intermedis d\'alça immediatament per suprimir el garreig fins a l\'extracció.';
    mitigationAction = matrixItem.mitigationProposals ||
      'Afegir boies de suspensió a la cadena per evitar el garreig sobre el fons marí fins a la seva retirada programada.';
  } else if (total >= 1 && total <= 4) {
    category = 'low_priority';
    categoryTitle = 'Prioritat Baixa (Mitigació in situ)';
    recommendedAction = 'PRIORITAT BAIXA (Mitigació in situ)';
    decisionLabel = 'Mitigació in situ';
    finalDecision = 'MITIGATE';
    colorClass = 'border-sky-600 bg-sky-50 text-sky-900';
    badgeClass = 'bg-[#204E6B] text-white';
    ecologicalJustification =
      'Cal avaluar si el cost o l\'impacte de l\'extracció compensa el petit benefici ambiental obtingut. L\'extracció mecànica podria causar més resuspensió de sediments o alteració que la seva permanència.';
    operationalRecommendation =
      'Acció correctora in situ: tallar i extreure immediatament els elements mòbils o cadenes que freguen el fons marí, mantenint el bloc in situ si està estabilitzat o renaturalitzat.';
    mitigationAction = matrixItem.mitigationProposals ||
      'Desconnectar i tallar els elements mòbils residuals arran de bloc. Equipar la línia de fondeig amb elements de flotació neutra.';
  } else {
    // total <= 0 (Model Conservacionista)
    category = 'conservation';
    categoryTitle = total === 0 && breakdown.c2_substrate > 0 ? 'No retirar (Avaluació / Retirar cadenes)' : 'No retirar (Conservar / Escull)';
    recommendedAction = total === 0 && breakdown.c2_substrate > 0 ? 'CONSERVAR BLOC / RETIRAR CADENA' : 'NO RETIRAR (CONSERVAR)';
    decisionLabel = 'Conservar';
    finalDecision = 'LEAVE';
    colorClass = 'border-emerald-600 bg-emerald-50 text-emerald-900';
    badgeClass = 'bg-[#2D5A3C] text-white';
    ecologicalJustification =
      'El bloc actua com a refugi de biodiversitat (colonització per algues fucals protegides com Cystoseira, coral·ligen o integració en mata de Posidonia) o la seva extracció causaria més dany al medi (desestabilització del llit marí, pèrdua d\'espècies amenaçades, obertura de marmites d\'erosió) que la seva permanència.';
    operationalRecommendation =
      'Deixar el bloc in situ com a escull de biodiversitat i refugi marí. Si el bloc conté cadenes abandonades o elements mòbils que toquen el fons, tallar-les netament sense moure ni traccionar el bloc de formigó.';
    mitigationAction = matrixItem.mitigationProposals ||
      (breakdown.c2_substrate > 0
        ? 'Tallar i extreure exclusivament la cadena mòbil restant mitjançant cisalla hidràulica; preservar íntegrament el bloc colonitzat.'
        : 'Preservació total in situ com a punt de refugi i concentració de biodiversitat; seguiment passiu.');
  }

  return {
    totalScore: total,
    combinationId: matrixItem.id,
    casuistica128Id: matrix128Item.id,
    category,
    categoryTitle,
    decisionLabel,
    finalDecision,
    recommendedAction,
    mitigationAction,
    matrixDiagnostic: matrixItem.diagnostic,
    colorClass,
    badgeClass,
    ecologicalJustification,
    operationalRecommendation,
    scoresBreakdown: {
      c1_species: breakdown.c1_species,
      c2_substrate: breakdown.c2_substrate,
      c3_dynamism: breakdown.c3_dynamism,
      c4_stability: breakdown.c4_stability,
    },
  };
}
