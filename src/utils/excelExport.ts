import * as XLSX from 'xlsx';
import { MortEvaluationRecord } from '../types';

export function exportInventoryToExcel(records: MortEvaluationRecord[], filename?: string) {
  const wb = XLSX.utils.book_new();

  // 1. INVENTARI PRINCIPAL
  const inventoryRows = records.map((r, index) => {
    const isLocated = r.presenceStatus !== 'not_found';
    const hasPhoto = (r.photos && r.photos.length > 0) || Boolean(r.photoUrl);
    const photoCount = (r.photos ? r.photos.length : 0) + (r.photoUrl && (!r.photos || !r.photos.includes(r.photoUrl)) ? 1 : 0);

    return {
      'Núm.': index + 1,
      'Codi del Mort': r.code,
      'Estat de Presència': isLocated ? 'Localitzat (Present)' : 'No Localitzat / Desaparegut',
      'Motiu No Localització': !isLocated ? (r.notFoundReason || 'No detectat en immersió') : '-',
      'Data Inspecció': r.date,
      'Localització / Cala': r.locationName,
      'Latitud (N)': r.latitude || '',
      'Longitud (E)': r.longitude || '',
      'Fondària (m)': r.depthM,
      'Estat d\'Ús': r.usageStatus === 'in_use' ? 'En ús actiu' : 'En desús / Abandonat',
      'Longitud (cm)': isLocated ? r.dimensions.lengthCm : '',
      'Amplada (cm)': isLocated ? r.dimensions.widthCm : '',
      'Alçada (cm)': isLocated ? r.dimensions.heightCm : '',
      'Volum (m³)': isLocated && r.hydrodynamics ? r.hydrodynamics.volumeM3 : '',
      'Pes en Aire (kg)': isLocated && r.hydrodynamics ? r.hydrodynamics.weightAirKg : '',
      'Pes Submergit (kg)': isLocated && r.hydrodynamics ? r.hydrodynamics.submergedWeightKg : '',
      'C1 Espècies (Punts)': isLocated ? r.result.scoresBreakdown.c1_species : 0,
      'C1 Observacions': isLocated ? (r.c1_speciesNotes || '') : '',
      'C2 Substrat (Punts)': isLocated ? r.result.scoresBreakdown.c2_substrate : 0,
      'C2 Elements Mòbils': isLocated ? (r.c2_hasMobileElements ? 'Sí (Cadenes/Caps)' : 'No') : '',
      'C3 Dinamisme (Punts)': isLocated ? r.result.scoresBreakdown.c3_dynamism : 0,
      'C4 Estabilitat (Punts)': isLocated ? r.result.scoresBreakdown.c4_stability : 0,
      'Puntuació Total': isLocated ? r.result.totalScore : 'N/A',
      'Classificació': r.result.categoryTitle,
      'Acció Recomanada': r.result.recommendedAction,
      'Mesura de Mitigació': r.result.mitigationAction || '',
      'Instruccions Operatives': r.result.operationalRecommendation || '',
      'Fotografies': hasPhoto ? `Sí (${photoCount || 1} foto/es)` : 'Sense foto',
      'Auditor / Tècnic': r.observerName || '',
      'Observacions Generals': r.generalNotes || '',
    };
  });

  const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
  
  // Set column widths for readability
  wsInventory['!cols'] = [
    { wch: 6 },  // Num
    { wch: 18 }, // Codi
    { wch: 24 }, // Presencia
    { wch: 26 }, // Motiu
    { wch: 14 }, // Data
    { wch: 22 }, // Localitzacio
    { wch: 12 }, // Lat
    { wch: 12 }, // Long
    { wch: 12 }, // Fondaria
    { wch: 20 }, // Estat d'us
    { wch: 12 }, // L
    { wch: 12 }, // W
    { wch: 12 }, // H
    { wch: 12 }, // Volum
    { wch: 14 }, // Pes Aire
    { wch: 16 }, // Pes Submergit
    { wch: 18 }, // C1
    { wch: 25 }, // C1 Obs
    { wch: 18 }, // C2
    { wch: 20 }, // Elements mobils
    { wch: 20 }, // C3
    { wch: 20 }, // C4
    { wch: 16 }, // Puntuacio
    { wch: 24 }, // Classificacio
    { wch: 28 }, // Accio Recomanada
    { wch: 45 }, // Mesura Mitigacio
    { wch: 50 }, // Instruccions
    { wch: 16 }, // Fotografies
    { wch: 22 }, // Auditor
    { wch: 40 }, // Observacions
  ];

  XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventari de Morts');

  // 2. RESUM ESTADÍSTIC
  const total = records.length;
  const located = records.filter((r) => r.presenceStatus !== 'not_found').length;
  const notFound = records.filter((r) => r.presenceStatus === 'not_found').length;
  const conservation = records.filter((r) => r.result.category === 'conservation').length;
  const lowPriority = records.filter((r) => r.result.category === 'low_priority').length;
  const mediumPriority = records.filter((r) => r.result.category === 'medium_priority').length;
  const highPriority = records.filter((r) => r.result.category === 'high_priority').length;

  const totalWeightAirKg = records.reduce(
    (sum, r) => sum + (r.presenceStatus !== 'not_found' ? (r.hydrodynamics?.weightAirKg || 0) : 0),
    0
  );
  const totalSubmergedWeightKg = records.reduce(
    (sum, r) => sum + (r.presenceStatus !== 'not_found' ? (r.hydrodynamics?.submergedWeightKg || 0) : 0),
    0
  );

  const conservationRate = located > 0 ? Math.round(((conservation + lowPriority) / located) * 100) : 0;

  const summaryRows = [
    { Concepte: 'Data de Generació de l\'Informe', Valor: new Date().toLocaleDateString('ca-ES') },
    { Concepte: 'Total de Registres Avaluats', Valor: total },
    { Concepte: 'Blocs Localitzats i Avaluats (Presència confirmada)', Valor: located },
    { Concepte: 'Blocs No Localitzats / Desapareguts', Valor: notFound },
    { Concepte: '----------------------------------------', Valor: '--------------------' },
    { Concepte: 'DISTRIBUCIÓ DE RESULTATS PER CATEGORIES', Valor: '' },
    { Concepte: '1. No Retirar (Conservar - Refugi / Biòtop) [≤ 0 pts]', Valor: conservation },
    { Concepte: '2. Prioritat Baixa (Mitigació in situ) [+1 a +4 pts]', Valor: lowPriority },
    { Concepte: '3. Prioritat Mitjana (Retirada Programada) [+5 a +9 pts]', Valor: mediumPriority },
    { Concepte: '4. Prioritat Alta (Retirada Immediata) [≥ +10 pts]', Valor: highPriority },
    { Concepte: '5. No Localitzats (Sense actuació)', Valor: notFound },
    { Concepte: '----------------------------------------', Valor: '--------------------' },
    { Concepte: 'BALANÇ DE MASSA I IMPACTE MECÀNIC', Valor: '' },
    { Concepte: 'Pes Total en Aire (tones)', Valor: (totalWeightAirKg / 1000).toFixed(2) + ' t' },
    { Concepte: 'Pes Total Submergit (tones)', Valor: (totalSubmergedWeightKg / 1000).toFixed(2) + ' t' },
    { Concepte: 'Taxa de Conservació in situ (% no retirada)', Valor: `${conservationRate}%` },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 55 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resum Estadístic');

  // 3. PROTOCOL I CRITERIS
  const protocolRows = [
    {
      'Codi Criteri': 'C1',
      'Nom del Criteri': 'Espècies amenaçades / protegides',
      'Rang de Puntuació': '-10 a 0 pts',
      'Descripció': 'Presència de Cystoseira/Ericaria, Posidonia, Cymodocea nodosa, Lithophyllum, coral·ligen o organismes sèssils.',
    },
    {
      'Codi Criteri': 'C2',
      'Nom del Criteri': 'Impacte sobre el substrat annex',
      'Rang de Puntuació': '0 a +5 pts',
      'Descripció': 'Evidència d\'erosió activa o rizomes trencats / presència d\'elements mòbils (cadenes/caps) que garregen.',
    },
    {
      'Codi Criteri': 'C3',
      'Nom del Criteri': 'Dinamisme i risc hidrodinàmic',
      'Rang de Puntuació': '0 a +3 pts',
      'Descripció': 'Risc de lliscament per onatge segons fondària i dimensions (Blau=+3, Verd=+2, Taronja=+1, Vermell=0).',
    },
    {
      'Codi Criteri': 'C4',
      'Nom del Criteri': 'Estabilitat i integració en l\'hàbitat',
      'Rang de Puntuació': '-5 a +5 pts',
      'Descripció': 'Retirada no genera buit (+5), retirada genera buit danyós (-5), o bloc fixat per arrels/sediment (-5).',
    },
    {
      'Codi Criteri': 'DECISIÓ',
      'Nom del Criteri': 'Prioritat Alta (≥ +10 pts)',
      'Rang de Puntuació': '≥ 10',
      'Descripció': 'Retirada immediata del bloc i cadenes per dany actiu i absència de valor ecològic.',
    },
    {
      'Codi Criteri': 'DECISIÓ',
      'Nom del Criteri': 'Prioritat Mitjana (+5 a +9 pts)',
      'Rang de Puntuació': '5 a 9',
      'Descripció': 'Retirada programada. Mitigació amb boies intermèdies per suspendre cadenes.',
    },
    {
      'Codi Criteri': 'DECISIÓ',
      'Nom del Criteri': 'Prioritat Baixa (+1 a +4 pts)',
      'Rang de Puntuació': '1 a 4',
      'Descripció': 'Mitigació in situ. Desconnectar i tallar cadenes residuals; mantenir bloc si és estable.',
    },
    {
      'Codi Criteri': 'DECISIÓ',
      'Nom del Criteri': 'No Retirar (Conservar) (≤ 0 pts)',
      'Rang de Puntuació': '≤ 0',
      'Descripció': 'Preservació in situ com a biòtop/refugi. Retirar únicament cadenes sobrants per tall net.',
    },
  ];

  const wsProtocol = XLSX.utils.json_to_sheet(protocolRows);
  wsProtocol['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsProtocol, 'Barem i Criteris');

  // Trigger file download
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `inventari_diagnosi_morts_fondeig_${dateStr}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}
