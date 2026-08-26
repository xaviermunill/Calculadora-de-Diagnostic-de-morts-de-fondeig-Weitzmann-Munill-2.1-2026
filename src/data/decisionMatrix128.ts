/**
 * Matriu Oficial de Presa de Decisions de Diagnòstic i Mesures de Correcció (128 Casuístiques Exactes)
 * Protocol de Restauració d'Hàbitats Marins & Conservació de Posidònia - v3.0
 * Consorci de Conservació del Medi Marí • Boris Weitzmann • Xavier Munill (bufalvent.net)
 *
 * Estructura combinatòria exacta: 
 * 4 (Criteri 1) × 2 (Criteri 2) × 4 (Criteri 3) × 4 (Criteri 4) = 128 Casuístiques
 */

import {
  ActionCategory,
  DynamismRiskOption,
  SpeciesPresenceOption,
  StabilityIntegrationOption,
  SubstrateImpactOption,
} from '../types';

export interface Matrix128Item {
  id: number; // 1 to 128
  
  // Criteri 1
  c1Key: SpeciesPresenceOption;
  c1Index: number;
  c1Desc: string;
  c1Points: number;
  c1Short: string;

  // Criteri 2
  c2HasImpactOrMobile: boolean;
  c2Index: number;
  c2Desc: string;
  c2Points: number;
  c2Short: string;

  // Criteri 3
  c3Key: DynamismRiskOption;
  c3Index: number;
  c3Desc: string;
  c3Points: number;
  c3Short: string;

  // Criteri 4
  c4Key: StabilityIntegrationOption;
  c4Index: number;
  c4Desc: string;
  c4Points: number;
  c4Short: string;

  // Outcome
  totalScore: number;
  decisionLabel: 'RETIRADA IMMEDIATA' | 'RETIRADA PROGRAMADA' | 'PRIORITAT BAIXA (Mitigació)' | 'NO RETIRAR (CONSERVAR)';
  category: ActionCategory;
  categoryTitle: string;
  badgeClass: string;
  
  // Technical details
  diagnosticSummary: string;
  technicalJustification: string;
  mitigationProposals: string;
}

export const C1_MATRIX_OPTIONS = [
  {
    key: 'high_coverage_or_protected' as SpeciesPresenceOption,
    desc: "Recobriment >10% o reproductors d'espècies protegides",
    points: -12,
    short: 'Espècies protegides (>10%)',
  },
  {
    key: 'low_coverage' as SpeciesPresenceOption,
    desc: "Presència d'espècies amenaçades / d'interès (<10%)",
    points: -8,
    short: "Espècies d'interès (<10%)",
  },
  {
    key: 'renaturalized_algal' as SpeciesPresenceOption,
    desc: 'Recobriment algal general o organismes renaturalitzats',
    points: -4,
    short: 'Recobriment algal / renaturalitzat',
  },
  {
    key: 'none' as SpeciesPresenceOption,
    desc: "Absència d'espècies amenaçades, d'interès o hàbitats protegits",
    points: 0,
    short: "Sense espècies d'interès",
  },
];

export const C2_MATRIX_OPTIONS = [
  {
    hasImpact: true,
    desc: "Existeix ferida/halo d'erosió actiu a la praderia o presència d'elements mòbils (cadenes/caps)",
    points: 6,
    short: 'Amb erosió activa o mòbils',
  },
  {
    hasImpact: false,
    desc: "Absència d'abrasió/erosió activa i sense elements mòbils lesius",
    points: 0,
    short: 'Sense erosió ni mòbils',
  },
];

export const C3_MATRIX_OPTIONS = [
  {
    key: 'high_risk' as DynamismRiskOption,
    desc: 'Risc Alt de desplaçament (Categorització Blau - Baixa fondària / bloc petit)',
    points: 4,
    short: 'Risc Alt (Blau)',
  },
  {
    key: 'moderate_risk' as DynamismRiskOption,
    desc: 'Risc Mitjà-Alt de mobilització (Categorització Verd - Mobilitat en onatge fort)',
    points: 2,
    short: 'Risc Mitjà-Alt (Verd)',
  },
  {
    key: 'low_risk' as DynamismRiskOption,
    desc: 'Risc Baix de mobilitat (Categorització Taronja - Només temporals extrems)',
    points: 1,
    short: 'Risc Baix (Taronja)',
  },
  {
    key: 'no_risk' as DynamismRiskOption,
    desc: 'Absència de risc de mobilització (Categorització Vermell - Estable per pes o fondària)',
    points: 0,
    short: 'Sense risc (Vermell)',
  },
];

export const C4_MATRIX_OPTIONS = [
  {
    key: 'not_buried_no_void' as StabilityIntegrationOption,
    desc: 'Bloc lliure sobre fons sedimentari/roca, no toca posidònia, no genera espai buit',
    points: 8,
    short: 'Bloc lliure, sense buit',
  },
  {
    key: 'partial_burial_no_posidonia' as StabilityIntegrationOption,
    desc: 'Enfonsament parcial en sediment, no toca posidònia, no genera espai buit',
    points: 4,
    short: 'Enfonsament parcial, sense buit',
  },
  {
    key: 'not_buried_generates_void' as StabilityIntegrationOption,
    desc: "Bloc no enterrat, l'extracció sí genera un espai buit nou danyós al fons",
    points: -6,
    short: 'Genera buit danyós',
  },
  {
    key: 'fixed_by_roots_or_sediment' as StabilityIntegrationOption,
    desc: 'Bloc fixat per les pròpies arrels de Posidònia (mata cohesionada)',
    points: -12,
    short: 'Fixat per arrels de Posidònia',
  },
];

/**
 * Builds a single matrix item from 1 to 128
 */
export function buildMatrix128Item(c1Idx: number, c2Idx: number, c3Idx: number, c4Idx: number): Matrix128Item {
  const c1 = C1_MATRIX_OPTIONS[c1Idx];
  const c2 = C2_MATRIX_OPTIONS[c2Idx];
  const c3 = C3_MATRIX_OPTIONS[c3Idx];
  const c4 = C4_MATRIX_OPTIONS[c4Idx];

  // ID from 1 to 128
  const id = c1Idx * 32 + c2Idx * 16 + c3Idx * 4 + c4Idx + 1;
  const totalScore = c1.points + c2.points + c3.points + c4.points;

  let decisionLabel: Matrix128Item['decisionLabel'];
  let category: ActionCategory;
  let categoryTitle: string;
  let badgeClass: string;

  if (totalScore >= 10) {
    category = 'high_priority';
    categoryTitle = 'Prioritat Alta';
    decisionLabel = 'RETIRADA IMMEDIATA';
    badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
  } else if (totalScore >= 5) {
    category = 'medium_priority';
    categoryTitle = 'Prioritat Mitjana';
    decisionLabel = 'RETIRADA PROGRAMADA';
    badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
  } else if (totalScore >= 1) {
    category = 'low_priority';
    categoryTitle = 'Prioritat Baixa';
    decisionLabel = 'PRIORITAT BAIXA (Mitigació)';
    badgeClass = 'bg-sky-100 text-sky-800 border border-sky-300';
  } else {
    category = 'conservation';
    categoryTitle = 'Conservar / No retirar';
    decisionLabel = 'NO RETIRAR (CONSERVAR)';
    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  }

  // Diagnostic texts
  const parts: string[] = [];
  const mitigations: string[] = [];

  // C1 text
  if (c1.points === -12) {
    parts.push("Presència crítica d'espècies protegides/reproductors (>10%)");
  } else if (c1.points === -8) {
    parts.push("Colonització per espècies amenaçades d'interès (<10%)");
  } else if (c1.points === -4) {
    parts.push('Recobriment algal renaturalitzat consolidat com a escull');
  } else {
    parts.push("Superfície nua o sense colonització biològica d'interès");
  }

  // C2 text
  if (c2.hasImpact) {
    parts.push("impacte mecànic actiu / presència de cadena o halo d'abrasió");
    mitigations.push("Retirar d'immediat cadenes i elements mòbils solts; instal·lar boia d'alça si el fondeig roman en ús.");
  } else {
    parts.push("absència d'erosió activa i sense cadenes soltes");
  }

  // C3 text
  if (c3.points === 4) {
    parts.push('risc hidrodinàmic alt de mobilització per onatge (Blau)');
    mitigations.push("Avaluar retirada per evitar que temporals ordinaris arrosseguin l'estructura sobre la praderia.");
  } else if (c3.points === 2) {
    parts.push('risc moderat de mobilitat en temporals severs (Verd)');
  } else if (c3.points === 1) {
    parts.push('risc baix de moviment, només en condicions extremes (Taronja)');
  } else {
    parts.push('estabilitat hidrodinàmica satisfactòria per fondària/inèrcia (Vermell)');
  }

  // C4 text
  if (c4.points === -12) {
    parts.push('fixació consolidada per arrels i mata viva de Posidonia.');
    mitigations.push("PROHIBIDA L'EXTRACCIÓ: l'arrencada destruiria rizomes vius creant una marmita d'erosió. Preservar in situ.");
  } else if (c4.points === -6) {
    parts.push("l'extracció generaria un espai buit perjudicial per al fons.");
    mitigations.push("En cas de retirar-lo, reomplir immediatament la concavitat amb sediment per evitar enfonsaments.");
  } else if (c4.points === 4) {
    parts.push('enfonsat parcialment en sediment sense afectar posidònia ni buits.');
    mitigations.push("Extracció tècnica viable mitjançant alçament vertical pur amb globus.");
  } else {
    parts.push('bloc lliure sobre el fons sense afecció a la vegetació ni buit nou.');
    mitigations.push("Retirada mecànica senzilla mitjançant maniobra d'alçament vertical.");
  }

  const diagnosticSummary = `Casuística #${id} (${totalScore > 0 ? `+${totalScore}` : totalScore} pts): ${parts.join(', ')}.`;
  const technicalJustification = `Classificació ${categoryTitle} segons el Protocol v3.0 amb puntuació final ponderada de ${totalScore} punts. C1(${c1.points}) + C2(${c2.points}) + C3(${c3.points}) + C4(${c4.points}) = ${totalScore}.`;
  const mitigationProposals = mitigations.length > 0 ? mitigations.join(' ') : "Mantenir la monitorització de l'estructura i de la colonització biològica.";

  return {
    id,
    c1Key: c1.key,
    c1Index: c1Idx,
    c1Desc: c1.desc,
    c1Points: c1.points,
    c1Short: c1.short,

    c2HasImpactOrMobile: c2.hasImpact,
    c2Index: c2Idx,
    c2Desc: c2.desc,
    c2Points: c2.points,
    c2Short: c2.short,

    c3Key: c3.key,
    c3Index: c3Idx,
    c3Desc: c3.desc,
    c3Points: c3.points,
    c3Short: c3.short,

    c4Key: c4.key,
    c4Index: c4Idx,
    c4Desc: c4.desc,
    c4Points: c4.points,
    c4Short: c4.short,

    totalScore,
    decisionLabel,
    category,
    categoryTitle,
    badgeClass,

    diagnosticSummary,
    technicalJustification,
    mitigationProposals,
  };
}

/**
 * Array containing all 128 exact matrix items
 */
export const DECISION_MATRIX_128: Matrix128Item[] = (() => {
  const items: Matrix128Item[] = [];
  for (let c1 = 0; c1 < 4; c1++) {
    for (let c2 = 0; c2 < 2; c2++) {
      for (let c3 = 0; c3 < 4; c3++) {
        for (let c4 = 0; c4 < 4; c4++) {
          items.push(buildMatrix128Item(c1, c2, c3, c4));
        }
      }
    }
  }
  return items;
})();

/**
 * Fast lookup for the exact Casuística #1 to #128
 */
export function getMatrix128Combination(
  c1Key: SpeciesPresenceOption,
  c2ImpactOrMobile: boolean | SubstrateImpactOption,
  c3Key: DynamismRiskOption,
  c4Key: StabilityIntegrationOption
): Matrix128Item {
  let c1Idx = C1_MATRIX_OPTIONS.findIndex((o) => o.key === c1Key);
  if (c1Idx === -1) c1Idx = 3;

  const hasImpact = typeof c2ImpactOrMobile === 'boolean'
    ? c2ImpactOrMobile
    : c2ImpactOrMobile === 'active_erosion_halo';
  const c2Idx = hasImpact ? 0 : 1;

  let c3Idx = C3_MATRIX_OPTIONS.findIndex((o) => o.key === c3Key);
  if (c3Idx === -1) c3Idx = 3;

  let c4Idx = C4_MATRIX_OPTIONS.findIndex((o) => o.key === c4Key);
  if (c4Idx === -1) c4Idx = 0;

  const id = c1Idx * 32 + c2Idx * 16 + c3Idx * 4 + c4Idx + 1;
  return DECISION_MATRIX_128[id - 1] || buildMatrix128Item(c1Idx, c2Idx, c3Idx, c4Idx);
}
