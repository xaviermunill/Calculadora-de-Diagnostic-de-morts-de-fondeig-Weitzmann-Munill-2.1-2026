import { MortEvaluationRecord } from '../types';

export interface EmailDispatchResult {
  success: boolean;
  recipient: string;
  subject: string;
  deliveryMethod?: string;
  error?: string;
}

export const TARGET_NOTIFICATION_EMAIL = 'xaviermunill@bufalvent.net';

/**
 * Sends point evaluation data to the server endpoint to dispatch email to xaviermunill@bufalvent.net
 */
export async function sendPointEmailNotification(
  record: MortEvaluationRecord,
  recipient: string = TARGET_NOTIFICATION_EMAIL
): Promise<EmailDispatchResult> {
  try {
    const response = await fetch('/api/send-point-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        record,
        recipient,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al servidor en enviar el correu');
    }

    return {
      success: true,
      recipient: data.recipient || recipient,
      subject: data.subject || `Registre ${record.code}`,
      deliveryMethod: data.deliveryMethod,
    };
  } catch (error: any) {
    console.warn('Avís en enviar correu al servidor:', error);
    return {
      success: false,
      recipient,
      subject: `Registre ${record.code}`,
      error: error?.message || 'No s\'ha pogut connectar amb el servei de correu',
    };
  }
}

/**
 * Generates a pre-filled mailto URI as a direct local client backup
 */
export function generateMailtoUrl(
  record: MortEvaluationRecord,
  recipient: string = TARGET_NOTIFICATION_EMAIL
): string {
  const code = record.code || 'Sense Codi';
  const location = record.locationName || 'Localització no especificada';
  const action = record.result?.recommendedAction?.toUpperCase() || 'DIAGNOSI';
  const totalScore = record.result?.totalScore ?? 0;

  const subject = encodeURIComponent(
    `[Diagnosi Morts de Fondeig] Registre: ${code} - ${location} (${action})`
  );

  const volM3 = record.hydrodynamics?.volumeM3
    ? record.hydrodynamics.volumeM3.toFixed(3) + ' m³'
    : ((record.dimensions.lengthCm * record.dimensions.widthCm * record.dimensions.heightCm) / 1e6).toFixed(3) + ' m³';
  const weightAir = record.hydrodynamics?.weightAirKg
    ? `${record.hydrodynamics.weightAirKg} kg`
    : '-';
  const weightSub = record.hydrodynamics?.submergedWeightKg
    ? `${record.hydrodynamics.submergedWeightKg} kg`
    : '-';

  const bodyText = `
ACTA DE REGISTRE I DIAGNOSI: MORTS DE FONDEIG (v2.1 - 2026)
Consorci de Conservació del Medi Marí W&M • Boris Weitzmann • Xavier Munill / Bufalvent.net
------------------------------------------------------
1. IDENTIFICACIÓ:
- Codi: ${code}
- Localització / Cala: ${location}
- Data d'inspecció: ${record.date || ''}
- Coordenades GPS: ${record.latitude ? record.latitude.toFixed(6) : '-'}° N, ${record.longitude ? record.longitude.toFixed(6) : '-'}° E
- Fondària: ${record.depthM ? record.depthM + ' m' : '-'}
- Inspector / Tècnic: ${record.observerName || 'No indicat'}
- Estat al fons: ${record.presenceStatus === 'not_found' ? 'NO LOCALITZAT (' + (record.notFoundReason || '') + ')' : 'LOCALITZAT'}
- Estat d'ús: ${record.usageStatus || 'No indicat'}

2. CARACTERÍSTIQUES FÍSIQUES:
- Dimensions: ${record.dimensions?.lengthCm || 0} x ${record.dimensions?.widthCm || 0} x ${record.dimensions?.heightCm || 0} cm
- Volum estimat: ${volM3}
- Pes en aire / submergit: ${weightAir} / ${weightSub}

3. CRITERIS MARIN_BIODIV:
- C1 (Espècies / Colonització): ${record.c1_speciesPresence} ${record.c1_speciesNotes ? '(' + record.c1_speciesNotes + ')' : ''}
- C2 (Substrat & Impacte): ${record.c2_substrateImpact} (Elements mòbils: ${record.c2_hasMobileElements ? 'Sí, halo ' + record.c2_haloRadiusM + 'm' : 'No'})
- C3 (Dinàmica & Onatge): ${record.c3_dynamismRisk}
- C4 (Estabilitat): ${record.c4_stabilityIntegration}

4. DECISIÓ RECOMANDADA:
- Puntuació total: ${totalScore > 0 ? '+' + totalScore : totalScore} punts
- Acció recomanada: ${action}
- Justificació: ${record.result?.ecologicalJustification || ''}

5. OBSERVACIONS:
${record.generalNotes || 'Cap observació.'}
`;

  return `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
}
