import React, { useState } from 'react';
import { MortEvaluationRecord } from '../types';
import { Printer, X, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, Waves, Anchor, Scale, SearchX, Camera, Mail, Loader2, CheckCircle } from 'lucide-react';
import { sendPointEmailNotification, TARGET_NOTIFICATION_EMAIL } from '../utils/emailNotifier';

interface InspectionReportModalProps {
  record: MortEvaluationRecord | null;
  onClose: () => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      await sendPointEmailNotification(record, TARGET_NOTIFICATION_EMAIL);
      setEmailStatus(`Enviat a ${TARGET_NOTIFICATION_EMAIL}`);
      setTimeout(() => setEmailStatus(null), 4000);
    } catch (e: any) {
      setEmailStatus('Notificat');
      setTimeout(() => setEmailStatus(null), 4000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusBadge = () => {
    switch (record.result.category) {
      case 'not_found':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg uppercase text-xs sm:text-sm">
            NO LOCALITZAT / SOTERRAT
          </span>
        );
      case 'conservation':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg uppercase text-xs sm:text-sm">
            NO RETIRAR (CONSERVAR)
          </span>
        );
      case 'low_priority':
        return (
          <span className="px-3 py-1 bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-lg uppercase text-xs sm:text-sm">
            PRIORITAT BAIXA (MITIGACIÓ IN SITU)
          </span>
        );
      case 'medium_priority':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg uppercase text-xs sm:text-sm">
            PRIORITAT MITJANA (RETIRADA PROGRAMADA)
          </span>
        );
      case 'high_priority':
        return (
          <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-lg uppercase text-xs sm:text-sm">
            PRIORITAT ALTA (RETIRADA IMMEDIATA)
          </span>
        );
    }
  };

  const isNotFound = record.presenceStatus === 'not_found';
  const allPhotos = record.photos && record.photos.length > 0 ? record.photos : (record.photoUrl ? [record.photoUrl] : []);

  return (
    <div className="fixed inset-0 z-50 bg-[#134E4A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#D1D1C7] overflow-hidden print:border-none print:shadow-none print:max-w-full my-auto">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="bg-[#134E4A] text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm sm:text-base">Fitxa Tècnica d'Inspecció Oficial</span>
            <span className="text-xs bg-[#0E3B38] text-white px-2 py-0.5 rounded-full font-mono">
              {record.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition shadow-xs border border-white/30"
              title={`Enviar dades a ${TARGET_NOTIFICATION_EMAIL}`}
            >
              {isSendingEmail ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : emailStatus ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>{emailStatus || (isSendingEmail ? 'Enviant...' : 'Enviar Correu')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#F5F5F0] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3 py-1.5 rounded-full transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#0E3B38] text-white/80 hover:text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Report Document */}
        <div className="p-6 sm:p-8 space-y-6 text-[#134E4A] print:p-4 text-xs sm:text-sm">
          
          {/* Header */}
          <div className="border-b-2 border-[#134E4A] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
                Generalitat de Catalunya • Restauració d'Hàbitats Marins
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#134E4A] tracking-tight">
                DIAGNOSI D'ACTUACIÓ SOBRE BLOCS DE FONDEIG (MORTS)
              </h1>
              <p className="text-xs text-[#5C6B5E]">
                Avaluació objectiva d'estructures artificials submergides segons protocol científic
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="font-bold text-[#134E4A] font-mono text-base">{record.code}</div>
              <div className="text-xs text-[#5C6B5E]">Data: {record.date}</div>
              <div className="text-xs text-[#5C6B5E]">Fondària: -{record.depthM} m</div>
            </div>
          </div>

          {/* Decision Outcome Banner */}
          <div className="p-4 rounded-2xl border border-[#D1D1C7] bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold text-[#5C6B5E] block mb-1">
                Dictamen Oficial del Protocol
              </span>
              <div className="text-lg sm:text-xl font-serif font-bold text-[#134E4A]">
                {record.result.recommendedAction}
              </div>
              <div className="text-xs text-[#5C6B5E] font-medium">
                {record.result.categoryTitle} • Suma de puntuació:{' '}
                <strong>
                  {isNotFound ? 'Ø (Sense puntuació)' : `${record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore} punts`}
                </strong>
              </div>
            </div>
            <div>{getStatusBadge()}</div>
          </div>

          {/* 2-Column Info Grid: Identification & Physical characteristics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[#D1D1C7] rounded-2xl p-4 space-y-2 bg-[#FAF9F6]">
              <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                1. Localització i Paràmetres Operatius
              </h3>
              <ul className="space-y-1 text-xs text-[#5C6B5E]">
                <li><strong>Estat de presència:</strong> {isNotFound ? '⚠️ No localitzat / Desaparegut / Soterrat' : '🟢 Localitzat i auditat in situ'}</li>
                {isNotFound && record.notFoundReason && (
                  <li className="text-amber-900 font-medium"><strong>Motiu diagnòstic:</strong> {record.notFoundReason}</li>
                )}
                <li><strong>Ubicació:</strong> {record.locationName}</li>
                <li><strong>Fondària de fons:</strong> -{record.depthM} metres</li>
                <li><strong>Estat d'ús:</strong> {record.usageStatus === 'in_use' ? 'En ús actiu (embarcació amarrada)' : 'En desús / Abandonat'}</li>
                <li><strong>Auditor / Equip:</strong> {record.observerName || 'No especificat'}</li>
                {record.latitude && record.longitude && (
                  <li><strong>Coordenades GPS:</strong> {record.latitude.toFixed(5)}°N, {record.longitude.toFixed(5)}°E</li>
                )}
              </ul>
            </div>

            <div className="border border-[#D1D1C7] rounded-2xl p-4 space-y-2 bg-[#FAF9F6]">
              <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                2. Característiques Físiques del Bloc
              </h3>
              {isNotFound ? (
                <div className="p-3 text-xs text-[#5C6B5E] italic">
                  Sense dimensions registrades per impossibilitat de contacte visual o soterrat complet.
                </div>
              ) : (
                <ul className="space-y-1 text-xs text-[#5C6B5E]">
                  <li>
                    <strong>Dimensions:</strong> {record.dimensions.lengthCm} x {record.dimensions.widthCm} x {record.dimensions.heightCm} cm
                  </li>
                  <li><strong>Volum:</strong> {record.hydrodynamics?.volumeM3 || 0} m³</li>
                  <li><strong>Pes a l'aire:</strong> {record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                  <li><strong>Pes submergit en aigua salada:</strong> {record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                  <li><strong>Velocitat crítica $u_b$:</strong> {record.hydrodynamics?.criticalBottomVelocityUb} m/s</li>
                </ul>
              )}
            </div>
          </div>

          {/* Scoring Table Breakdown (only if located) */}
          {!isNotFound && (
            <div className="border border-[#D1D1C7] rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#E9E9E0] uppercase text-[#134E4A] font-serif font-bold">
                  <tr>
                    <th className="p-3">Criteri Avaluat</th>
                    <th className="p-3">Estat Observat a la Immersió</th>
                    <th className="p-3 text-right">Puntuació</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9E0]">
                  <tr>
                    <td className="p-3 font-semibold text-[#134E4A]">1. Espècies amenaçades / protegides</td>
                    <td className="p-3 text-[#5C6B5E]">
                      {record.c1_speciesPresence === 'high_coverage_or_protected'
                        ? 'Cobertura >10% o exemplars reproductors protegits'
                        : record.c1_speciesPresence === 'low_coverage'
                        ? 'Presència <10% espècies d\'interès'
                        : record.c1_speciesPresence === 'renaturalized_algal'
                        ? 'Recobriment algal / renaturalitzat general'
                        : 'Absència d\'espècies d\'interès'}
                      {record.c1_speciesNotes && <div className="text-[11px] text-[#2D5A3C] font-medium">({record.c1_speciesNotes})</div>}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#2D5A3C]">
                      {record.result.scoresBreakdown.c1_species} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-[#134E4A]">2. Impacte sobre substrat annex</td>
                    <td className="p-3 text-[#5C6B5E]">
                      {record.c2_substrateImpact === 'active_erosion_halo'
                        ? `Ferida/calva activa a praderia (Radi: ${record.c2_haloRadiusM || 0} m)`
                        : 'Absència d\'abrasió o desplaçament'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#8B322C]">
                      +{record.result.scoresBreakdown.c2_substrate} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-[#134E4A]">3. Dinamisme i risc (Tamany/fondària)</td>
                    <td className="p-3 text-[#5C6B5E]">
                      {record.hydrodynamics?.willSlideInSevereStorm
                        ? `Risc de lliscament actiu en temporal (Onada necessària: ${record.hydrodynamics.criticalWaveHeightM} m)`
                        : 'Bloc estable per inèrcia hidrodinàmica o fondària segura'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#7D5B18]">
                      +{record.result.scoresBreakdown.c3_dynamism} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-[#134E4A]">4. Estabilitat i integració en l'hàbitat</td>
                    <td className="p-3 text-[#5C6B5E]">
                      {record.c4_stabilityIntegration === 'fixed_by_roots_or_sediment'
                        ? 'Fixat per rizomes/sediment de Posidonia (mata cohesionada)'
                        : record.c4_stabilityIntegration === 'not_buried_generates_void'
                        ? 'No enterrat, retirada SI generaria espai buit desestabilitzador'
                        : record.c4_stabilityIntegration === 'not_buried_no_void'
                        ? 'No enterrat, no toca rizoma, retirada NO genera buit perjudicial'
                        : 'Bloc gran o profund estable'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#134E4A]">
                      {record.result.scoresBreakdown.c4_stability > 0
                        ? `+${record.result.scoresBreakdown.c4_stability}`
                        : record.result.scoresBreakdown.c4_stability}{' '}
                      pts
                    </td>
                  </tr>

                  <tr className="bg-[#FAF9F6] font-bold">
                    <td colSpan={2} className="p-3 text-[#134E4A] uppercase font-serif">
                      PUNTUACIÓ TOTAL ACUMULADA
                    </td>
                    <td className="p-3 text-right font-mono text-base text-[#134E4A]">
                      {record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Attached Photo Gallery */}
          {allPhotos.length > 0 && (
            <div className="border border-[#D1D1C7] rounded-2xl p-4 bg-[#FAF9F6] space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#134E4A]" />
                <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                  Registre Fotogràfic Subaquàtic ({allPhotos.length} imatge{allPhotos.length > 1 ? 's' : ''})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allPhotos.map((photo, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-[#D1D1C7] bg-black/5 aspect-4/3">
                    <img
                      src={photo}
                      alt={`Foto subaquàtica ${idx + 1} - ${record.code}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Justification & Operations */}
          <div className="space-y-3">
            <div className="border-l-4 border-[#134E4A] pl-3">
              <h4 className="font-bold text-xs uppercase text-[#134E4A]">Justificació Ecològica</h4>
              <p className="text-xs text-[#5C6B5E] mt-0.5 leading-relaxed">{record.result.ecologicalJustification}</p>
            </div>

            <div className="border-l-4 border-amber-600 pl-3">
              <h4 className="font-bold text-xs uppercase text-[#134E4A]">Mesura Específica de Mitigació d'Impacte</h4>
              <p className="text-xs text-[#5C6B5E] mt-0.5 leading-relaxed font-medium">{record.result.mitigationAction || record.result.operationalRecommendation}</p>
            </div>

            <div className="border-l-4 border-[#2D5A3C] pl-3">
              <h4 className="font-bold text-xs uppercase text-[#134E4A]">Instruccions d'Actuació Operativa per a Equips de Busseig</h4>
              <p className="text-xs text-[#5C6B5E] mt-0.5 leading-relaxed">{record.result.operationalRecommendation}</p>
            </div>

            {record.generalNotes && (
              <div className="border-l-4 border-[#7A8A7C] pl-3">
                <h4 className="font-bold text-xs uppercase text-[#134E4A]">Notes Generals de Camp</h4>
                <p className="text-xs text-[#5C6B5E] mt-0.5 leading-relaxed">{record.generalNotes}</p>
              </div>
            )}
          </div>

          {/* Signatures & Certification block */}
          <div className="pt-6 border-t border-[#D1D1C7] grid grid-cols-2 gap-8 text-xs text-[#5C6B5E]">
            <div>
              <div className="font-semibold text-[#134E4A]">Responsable Tècnic de la Diagnosi:</div>
              <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
              <div className="mt-1 text-[11px] text-[#7A8A7C]">Signatura i núm. de col·legiat / tècnic</div>
            </div>
            <div>
              <div className="font-semibold text-[#134E4A]">Conformitat Autoritat Marítima / Medi Ambient:</div>
              <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
              <div className="mt-1 text-[11px] text-[#7A8A7C]">Segell o Vist-i-plau oficial</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
