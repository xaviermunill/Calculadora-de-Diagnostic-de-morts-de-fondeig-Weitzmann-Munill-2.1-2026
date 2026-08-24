import React, { useState, useEffect } from 'react';
import { MortEvaluationRecord } from '../types';
import { Printer, X, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, Waves, Anchor, Scale, SearchX, Camera, Sparkles, Loader2 } from 'lucide-react';
import { fetchFullPhotosForRecord } from '../utils/googleDriveService';

interface InspectionReportModalProps {
  record: MortEvaluationRecord | null;
  onClose: () => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  const [fullPhotos, setFullPhotos] = useState<string[]>(() => {
    return record.photos && record.photos.length > 0
      ? record.photos
      : record.thumbnails && record.thumbnails.length > 0
      ? record.thumbnails
      : record.photoUrl
      ? [record.photoUrl]
      : [];
  });
  const [isLoadingFullRes, setIsLoadingFullRes] = useState<boolean>(true);

  // Load high-resolution photos for official technical report
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFullRes(true);

    fetchFullPhotosForRecord(record)
      .then((photos) => {
        if (isMounted && photos && photos.length > 0) {
          setFullPhotos(photos);
        }
      })
      .catch((e) => {
        console.warn('Could not load high-res photos for report:', e);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFullRes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [record]);

  const handlePrint = () => {
    window.print();
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
  const allPhotos = fullPhotos.length > 0 ? fullPhotos : (record.photos && record.photos.length > 0 ? record.photos : (record.thumbnails && record.thumbnails.length > 0 ? record.thumbnails : (record.photoUrl ? [record.photoUrl] : [])));

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
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#F5F5F0] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3.5 py-1.5 rounded-full transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#0E3B38] text-white/80 hover:text-white rounded-full transition cursor-pointer"
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
              <div className="text-xs text-[#5C6B5E] font-medium flex flex-wrap items-center gap-2 mt-0.5">
                <span>{record.result.categoryTitle} • Suma de puntuació:{' '}
                  <strong>
                    {isNotFound ? 'Ø (Sense puntuació)' : `${record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore} punts`}
                  </strong>
                </span>
                {record.result.casuistica128Id && (
                  <span className="px-2 py-0.5 rounded-full bg-[#134E4A]/10 text-[#134E4A] font-bold font-mono text-[11px]">
                    Casuística Oficial #{record.result.casuistica128Id} de 128
                  </span>
                )}
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
                {record.blocks && record.blocks.length > 1 && (
                  <li>
                    <strong>Connexió dels morts:</strong>{' '}
                    <span className="font-semibold text-[#134E4A]">
                      {record.connectionMode === 'chained'
                        ? '⛓️ Concatenats amb cadena (Solidaris • Suma de pesos per a la diagnosi)'
                        : '🔗 Aïllats / independents (Diagnosi per separat)'}
                    </span>
                  </li>
                )}
                <li><strong>Auditor / Equip:</strong> {record.observerName || 'No especificat'}</li>
                {record.latitude && record.longitude && (
                  <li><strong>Coordenades GPS:</strong> {record.latitude.toFixed(5)}°N, {record.longitude.toFixed(5)}°E</li>
                )}
              </ul>
            </div>

            <div className="border border-[#D1D1C7] rounded-2xl p-4 space-y-2 bg-[#FAF9F6]">
              <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                2. Característiques Físiques {record.blocks && record.blocks.length > 1 ? `dels Blocs/Estructures (${record.blocks.length})` : 'del Bloc / Estructura'}
              </h3>
              {isNotFound ? (
                <div className="p-3 text-xs text-[#5C6B5E] italic">
                  Sense dimensions registrades per impossibilitat de contacte visual o soterrat complet.
                </div>
              ) : record.blocks && record.blocks.length > 1 ? (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-[#134E4A]">
                    Nombre total d'estructures / morts inspeccionats: {record.blocks.length}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border border-[#D1D1C7] rounded-lg">
                      <thead className="bg-[#E9E9E0] text-[#134E4A]">
                        <tr>
                          <th className="p-1.5">Mort</th>
                          <th className="p-1.5">Tipologia / Dimensions</th>
                          <th className="p-1.5 text-right">Pes Subm.</th>
                          <th className="p-1.5 text-center">Punts</th>
                          <th className="p-1.5">Dictamen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5DF] bg-white">
                        {record.blocks.map((b, idx) => {
                          const isOther = b.structureType === 'other_structure';
                          return (
                            <tr key={b.id || idx}>
                              <td className="p-1.5 font-medium">{b.label || `Mort ${idx + 1}`}</td>
                              <td className="p-1.5 font-mono">
                                {isOther
                                  ? (b.otherStructure?.customTypeDescription || "Estructura especial")
                                  : `${b.dimensions.lengthCm}×${b.dimensions.widthCm}×${b.dimensions.heightCm} cm`}
                              </td>
                              <td className="p-1.5 text-right font-mono font-semibold">{b.hydrodynamics?.submergedWeightKg || 0} kg</td>
                              <td className="p-1.5 text-center font-mono font-bold">
                                {b.result ? (b.result.totalScore > 0 ? `+${b.result.totalScore}` : b.result.totalScore) : '-'}
                              </td>
                              <td className="p-1.5 font-semibold text-[10px]">{b.result?.decisionLabel || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : record.structureType === 'other_structure' && record.otherStructure ? (
                <ul className="space-y-1 text-xs text-[#5C6B5E]">
                  <li><strong>Tipologia d'estructura:</strong> {record.otherStructure.customTypeDescription || "Estructura especial / Altres"}</li>
                  <li><strong>Volum aproximat:</strong> {record.otherStructure.estimatedVolumeM3 || record.hydrodynamics?.volumeM3 || 0} m³</li>
                  <li><strong>Pes a l'aire estimat:</strong> {record.otherStructure.estimatedWeightAirKg?.toLocaleString() || record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                  <li><strong>Pes submergit en aigua salada:</strong> {record.otherStructure.estimatedSubmergedWeightKg?.toLocaleString() || record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                  {record.otherStructure.structureNotes && (
                    <li><strong>Observacions estructura:</strong> {record.otherStructure.structureNotes}</li>
                  )}
                </ul>
              ) : (
                <ul className="space-y-1 text-xs text-[#5C6B5E]">
                  <li>
                    <strong>Dimensions:</strong> {record.dimensions.lengthCm} x {record.dimensions.widthCm} x {record.dimensions.heightCm} cm
                  </li>
                  <li><strong>Volum:</strong> {record.hydrodynamics?.volumeM3 || 0} m³</li>
                  <li><strong>Pes a l'aire:</strong> {record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                  <li><strong>Pes submergit en aigua salada:</strong> {record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                  <li><strong>Velocitat crítica u_b:</strong> {record.hydrodynamics?.criticalBottomVelocityUb} m/s</li>
                </ul>
              )}
            </div>
          </div>

          {/* Scoring Table Breakdown (only if located) */}
          {!isNotFound && record.blocks && record.blocks.length > 1 ? (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                3. Desglossament de Criteris per Cada Mort
              </h3>
              {record.blocks.map((b, idx) => {
                const isOther = b.structureType === 'other_structure';
                const res = b.result;
                return (
                  <div key={b.id || idx} className="border border-[#D1D1C7] rounded-2xl overflow-hidden bg-white">
                    <div className="bg-[#FAF9F6] p-2.5 px-3.5 border-b border-[#E9E9E0] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#134E4A]">{b.label || `Mort ${idx + 1}`}</span>
                        <span className="text-[11px] text-[#64746B] font-mono">
                          ({isOther ? (b.otherStructure?.customTypeDescription || "Estructura especial") : `${b.dimensions.lengthCm}x${b.dimensions.widthCm}x${b.dimensions.heightCm} cm`})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#134E4A]">
                          {res ? (res.totalScore > 0 ? `+${res.totalScore}` : res.totalScore) : 0} punts
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#134E4A] text-white">
                          {res?.decisionLabel || '-'}
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-[#E9E9E0]">
                        <tr>
                          <td className="p-2.5 font-semibold text-[#134E4A] w-1/3">1. Espècies amenaçades</td>
                          <td className="p-2.5 text-[#5C6B5E]">
                            {b.c1_speciesPresence === 'high_coverage_or_protected'
                              ? 'Cobertura >10% o espècies protegides'
                              : b.c1_speciesPresence === 'low_coverage'
                              ? 'Presència <10% espècies d\'interès'
                              : b.c1_speciesPresence === 'renaturalized_algal'
                              ? 'Recobriment algal / renaturalitzat'
                              : 'Absència d\'espècies d\'interès'}
                            {b.c1_speciesNotes && <div className="text-[10px] text-[#2D5A3C]">({b.c1_speciesNotes})</div>}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#2D5A3C]">
                            {res?.scoresBreakdown.c1_species ?? 0} pts
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-semibold text-[#134E4A]">2. Impacte sobre substrat</td>
                          <td className="p-2.5 text-[#5C6B5E]">
                            {b.c2_substrateImpact === 'active_erosion_halo'
                              ? `Ferida/calva activa (Superfície estimada d'abrasió: ${b.c2_abrasionAreaM2 ?? b.c2_haloRadiusM ?? 0} m²)`
                              : 'Absència d\'abrasió activa'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#8B322C]">
                            +{res?.scoresBreakdown.c2_substrate ?? 0} pts
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-semibold text-[#134E4A]">3. Dinamisme i risc</td>
                          <td className="p-2.5 text-[#5C6B5E]">
                            {b.hydrodynamics?.willSlideInSevereStorm
                              ? `Risc lliscament (u_b = ${b.hydrodynamics.criticalBottomVelocityUb} m/s)`
                              : 'Estructura estable per inèrcia o fondària'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#7D5B18]">
                            +{res?.scoresBreakdown.c3_dynamism ?? 0} pts
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-semibold text-[#134E4A]">4. Estabilitat i integració</td>
                          <td className="p-2.5 text-[#5C6B5E]">
                            {b.c4_stabilityIntegration === 'fixed_by_roots_or_sediment'
                              ? 'Fixat per rizomes/sediment'
                              : b.c4_stabilityIntegration === 'not_buried_generates_void'
                              ? 'Retirada generaria buit danyós'
                              : b.c4_stabilityIntegration === 'not_buried_no_void'
                              ? 'No enterrat, retirada neta possible'
                              : 'Estable'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#134E4A]">
                            {res?.scoresBreakdown.c4_stability !== undefined
                              ? (res.scoresBreakdown.c4_stability > 0 ? `+${res.scoresBreakdown.c4_stability}` : res.scoresBreakdown.c4_stability)
                              : 0} pts
                          </td>
                        </tr>
                        {b.notes && (
                          <tr className="bg-[#FAF9F6]">
                            <td className="p-2.5 font-semibold text-[#134E4A]">5. Notes de camp</td>
                            <td colSpan={2} className="p-2.5 text-[#5C6B5E] italic">
                              {b.notes}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : !isNotFound && (
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
                        ? `Ferida/calva activa a praderia (Superfície estimada d'abrasió: ${record.c2_abrasionAreaM2 ?? record.c2_haloRadiusM ?? 0} m²)`
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#134E4A]" />
                  <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                    Registre Fotogràfic Subaquàtic ({allPhotos.length} imatge{allPhotos.length > 1 ? 's' : ''})
                  </h3>
                </div>
                {isLoadingFullRes ? (
                  <span className="text-[10px] text-amber-700 flex items-center gap-1 font-mono print:hidden">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Carregant HD...
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border border-emerald-300 print:hidden">
                    <Sparkles className="w-3 h-3" />
                    Màxima Resolució (HD)
                  </span>
                )}
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
