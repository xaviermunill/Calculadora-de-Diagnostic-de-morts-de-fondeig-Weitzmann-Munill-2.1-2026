/**
 * Matriu de Presa de Decisions de Diagnòstic i Mesures de Correcció Possibles (256 Combinacions)
 * Protocol de Restauració d'Hàbitats Marins & Conservació de Posidònia - v3.0 (2026)
 * Consorci de Conservació del Medi Marí W&M • Boris Weitzmann • Xavier Munill (bufalvent.net)
 */

import { ActionCategory, DynamismRiskOption, MortUsageStatus, SpeciesPresenceOption, StabilityIntegrationOption, SubstrateImpactOption } from '../types';

export interface DecisionMatrixItem {
  id: number;
  c1Index: number;
  c2Index: number;
  c3Index: number;
  c4Index: number;
  c1Desc: string;
  c1Points: number;
  c2Desc: string;
  c2Points: number;
  c3Desc: string;
  c3Points: number;
  c4Desc: string;
  c4Points: number;
  totalScore: number;
  decisionLabel: string;
  category: ActionCategory;
  categoryTitle: string;
  diagnostic: string;
  mitigationProposals: string;
}

export const C1_OPTIONS_DEF = [
  {
    key: 'high_coverage_or_protected' as SpeciesPresenceOption,
    desc: "Recobriment >10% o reproductors d'espècies protegides",
    points: -12,
    short: "Espècies protegides (>10%)",
  },
  {
    key: 'low_coverage' as SpeciesPresenceOption,
    desc: "Presència d'espècies amenaçades / d'interès (<10%)",
    points: -8,
    short: "Espècies d'interès (<10%)",
  },
  {
    key: 'renaturalized_algal' as SpeciesPresenceOption,
    desc: "Recobriment algal general o organismes renaturalitzats",
    points: -4,
    short: "Recobriment algal / renaturalitzat",
  },
  {
    key: 'none' as SpeciesPresenceOption,
    desc: "Absència d'espècies amenaçades, d'interès o hàbitats protegits",
    points: 0,
    short: "Sense espècies d'interès",
  },
];

export const C2_OPTIONS_DEF = [
  {
    usage: 'in_use' as MortUsageStatus,
    impact: 'active_erosion_halo' as SubstrateImpactOption,
    desc: "En ús: Evidència directa d'erosió activa / ferida a la praderia",
    points: 6,
    short: "En ús amb erosió activa",
  },
  {
    usage: 'in_use' as MortUsageStatus,
    impact: 'none' as SubstrateImpactOption,
    desc: "En ús: Absència d'abrasió o desplaçament",
    points: 0,
    short: "En ús sense abrasió",
  },
  {
    usage: 'abandoned' as MortUsageStatus,
    impact: 'active_erosion_halo' as SubstrateImpactOption,
    desc: "En desús: Amb elements mòbils (cadenes/caps) que malmeten el fons",
    points: 6,
    short: "En desús amb elements mòbils",
  },
  {
    usage: 'abandoned' as MortUsageStatus,
    impact: 'none' as SubstrateImpactOption,
    desc: "En desús: Sense elements mòbils",
    points: 0,
    short: "En desús sense elements mòbils",
  },
];

export const C3_OPTIONS_DEF = [
  {
    key: 'high_risk' as DynamismRiskOption,
    desc: "Risc alt de desplaçament (Categorització Blau)",
    points: 4,
    short: "Risc alt (Blau)",
  },
  {
    key: 'moderate_risk' as DynamismRiskOption,
    desc: "Risc mitjà-alt de mobilització (Categorització Verd)",
    points: 2,
    short: "Risc mitjà-alt (Verd)",
  },
  {
    key: 'low_risk' as DynamismRiskOption,
    desc: "Risc baix de mobilitat (Categorització Taronja)",
    points: 1,
    short: "Risc baix (Taronja)",
  },
  {
    key: 'no_risk' as DynamismRiskOption,
    desc: "Absència de risc de desplaçament (Categorització Vermell)",
    points: 0,
    short: "Sense risc (Vermell)",
  },
];

export const C4_OPTIONS_DEF = [
  {
    key: 'not_buried_no_void' as StabilityIntegrationOption,
    desc: "Bloc lliure, no toca posidònia, no genera espai buit",
    points: 8,
    short: "Bloc lliure, sense buit",
  },
  {
    key: 'partial_burial_no_posidonia' as StabilityIntegrationOption,
    desc: "Enfonsament parcial, no toca posidònia, no genera espai buit",
    points: 4,
    short: "Enfonsament parcial, sense buit",
  },
  {
    key: 'not_buried_generates_void' as StabilityIntegrationOption,
    desc: "Bloc no enterrat, sí genera un espai buit nou danyós",
    points: -6,
    short: "Genera buit danyós",
  },
  {
    key: 'fixed_by_roots_or_sediment' as StabilityIntegrationOption,
    desc: "Bloc fixat per les pròpies arrels de Posidònia (mata cohesionada)",
    points: -12,
    short: "Fixat per arrels de Posidònia",
  },
];

/**
 * Builds the 256 matrix item given the 4 indexes
 */
export function buildMatrixItem(c1Idx: number, c2Idx: number, c3Idx: number, c4Idx: number): DecisionMatrixItem {
  const c1 = C1_OPTIONS_DEF[c1Idx];
  const c2 = C2_OPTIONS_DEF[c2Idx];
  const c3 = C3_OPTIONS_DEF[c3Idx];
  const c4 = C4_OPTIONS_DEF[c4Idx];

  const id = c1Idx * 64 + c2Idx * 16 + c3Idx * 4 + c4Idx + 1;
  const totalScore = c1.points + c2.points + c3.points + c4.points;

  // Determine category and title
  let category: ActionCategory;
  let categoryTitle: string;
  let decisionLabel: string;

  if (totalScore >= 10) {
    category = 'high_priority';
    categoryTitle = 'Prioritat Alta (Retirada Immediata)';
    decisionLabel = 'Retirada Immediata';
  } else if (totalScore >= 5) {
    category = 'medium_priority';
    categoryTitle = 'Prioritat Mitjana (Retirada Programada)';
    decisionLabel = 'Retirada Programada';
  } else if (totalScore >= 1) {
    category = 'low_priority';
    categoryTitle = 'Prioritat Baixa (Mitigació in situ)';
    decisionLabel = 'Mitigació in situ / Retirada Condicionada';
  } else {
    category = 'conservation';
    categoryTitle = 'No retirar (Conservar / Escull)';
    decisionLabel = 'Conservar';
  }

  // Generate specific diagnostic and mitigation texts
  const diagnosticParts: string[] = [];
  const mitigationParts: string[] = [];

  // C1 diagnostic
  if (c1.points === -12) {
    diagnosticParts.push("Presència crítica d'espècies d'alt valor ecològic o protegides (>10% o reproductors)");
  } else if (c1.points === -8) {
    diagnosticParts.push("Colonització incipient per espècies protegides / d'interès (<10%)");
  } else if (c1.points === -4) {
    diagnosticParts.push("Bloc integrat com a escull artificial amb recobriment algal i organismes sèssils");
  } else {
    diagnosticParts.push("Superfície sense colonització rellevant d'espècies protegides");
  }

  // C2 diagnostic
  if (c2.points === 6) {
    if (c2.usage === 'in_use') {
      diagnosticParts.push("impacte mecànic actiu per ús de fondeig amb generació d'halo d'erosió a la praderia");
      mitigationParts.push("Instal·lar fondeig ecològic de baix impacte (ancoratge helicoïdal/tipus Manta Ray) amb boia d'alça intermèdia.");
    } else {
      diagnosticParts.push("impacte actiu per elements mòbils (cadenes/caps solts) que escombren el substrat");
      mitigationParts.push("Retirar d'immediat cadenes, caps i elements mòbils solts per frenar l'abrasió del fons.");
    }
  } else {
    if (c2.usage === 'in_use') {
      diagnosticParts.push("estat en ús sense evidència d'abrasió activa en el substrat circumdant");
    } else {
      diagnosticParts.push("estat en desús net, sense cadenes ni elements mòbils lesius");
    }
  }

  // C3 diagnostic
  if (c3.points === 4) {
    diagnosticParts.push("risc hidrodinàmic elevat de desplaçament en temporals (categorització Blau)");
    mitigationParts.push("Avaluar retirada ràpida o fixació addicional per evitar que temporals ordinaris arrosseguin l'estructura.");
  } else if (c3.points === 2) {
    diagnosticParts.push("risc moderat de mobilització durant episodis d'onatge sever (categorització Verd)");
  } else if (c3.points === 1) {
    diagnosticParts.push("risc baix de mobilitat, només mobilitzable en temporals extrems (categorització Taronja)");
  } else {
    diagnosticParts.push("estabilitat hidrodinàmica satisfactòria per pes i fondària (categorització Vermell)");
  }

  // C4 diagnostic & mitigation
  if (c4.points === -12) {
    diagnosticParts.push("integració profunda amb arrels de Posidònia oceanica adherides a l'estructura.");
    mitigationParts.push("No extreure mai el bloc: l'extracció arrencaria rizomes vius i crearia una marmita d'erosió irreversible. Mantenir com a biòtop.");
  } else if (c4.points === -6) {
    diagnosticParts.push("l'extracció del bloc generaria una depressió buida danyosa per al fons.");
    mitigationParts.push("En cas de retirar-lo, reomplir immediatament el buit amb sediment adequat per prevenir l'erosió i la colonització d'espècies invasores.");
  } else if (c4.points === 4) {
    diagnosticParts.push("enfonsament parcial sense contacte directe amb posidònia ni generació de buit perjudicial.");
    mitigationParts.push("Extracció tècnica viable si es requereix, supervisant l'elevació vertical neta.");
  } else {
    diagnosticParts.push("bloc lliure sobre fons sedimentari o roca sense afecció a la mata vegetal ni buit nou.");
    mitigationParts.push("Retirada mecànica viable mitjançant globus d'alçament o cabestrant, evitant arrossegament horitzontal.");
  }

  const diagnostic = `Combinació Matriu #${id} (${totalScore > 0 ? `+${totalScore}` : totalScore} pts): ${diagnosticParts.join(', ')}.`;
  const mitigationProposals = mitigationParts.length > 0
    ? mitigationParts.join(' ')
    : "Mantenir el seguiment periòdic de l'estructura i de la colonització biològica.";

  return {
    id,
    c1Index: c1Idx,
    c2Index: c2Idx,
    c3Index: c3Idx,
    c4Index: c4Idx,
    c1Desc: c1.desc,
    c1Points: c1.points,
    c2Desc: c2.desc,
    c2Points: c2.points,
    c3Desc: c3.desc,
    c3Points: c3.points,
    c4Desc: c4.desc,
    c4Points: c4.points,
    totalScore,
    decisionLabel,
    category,
    categoryTitle,
    diagnostic,
    mitigationProposals,
  };
}

/**
 * Pre-generate the 256 matrix lookup table
 */
export const DECISION_MATRIX_256: DecisionMatrixItem[] = (() => {
  const list: DecisionMatrixItem[] = [];
  for (let c1 = 0; c1 < 4; c1++) {
    for (let c2 = 0; c2 < 4; c2++) {
      for (let c3 = 0; c3 < 4; c3++) {
        for (let c4 = 0; c4 < 4; c4++) {
          list.push(buildMatrixItem(c1, c2, c3, c4));
        }
      }
    }
  }
  return list;
})();

/**
 * Lookup by criteria selections
 */
export function getMatrixCombination(
  c1Key: SpeciesPresenceOption,
  c2Key: SubstrateImpactOption,
  usageStatus: MortUsageStatus,
  c3Key: DynamismRiskOption,
  c4Key: StabilityIntegrationOption,
  hasMobileElements = false
): DecisionMatrixItem {
  // Find c1 index
  let c1Idx = C1_OPTIONS_DEF.findIndex((o) => o.key === c1Key);
  if (c1Idx === -1) c1Idx = 3;

  // Find c2 index
  let c2Idx: number;
  const isErosionOrMobile = c2Key === 'active_erosion_halo' || hasMobileElements;
  if (usageStatus === 'in_use') {
    c2Idx = isErosionOrMobile ? 0 : 1;
  } else {
    c2Idx = isErosionOrMobile ? 2 : 3;
  }

  // Find c3 index
  let c3Idx = C3_OPTIONS_DEF.findIndex((o) => o.key === c3Key);
  if (c3Idx === -1) c3Idx = 3;

  // Find c4 index
  let c4Idx = C4_OPTIONS_DEF.findIndex((o) => o.key === c4Key);
  if (c4Idx === -1) c4Idx = 0;

  const id = c1Idx * 64 + c2Idx * 16 + c3Idx * 4 + c4Idx + 1;
  return DECISION_MATRIX_256[id - 1] || buildMatrixItem(c1Idx, c2Idx, c3Idx, c4Idx);
}
