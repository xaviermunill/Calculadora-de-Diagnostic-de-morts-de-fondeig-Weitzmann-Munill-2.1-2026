import React, { useState, useEffect } from 'react';
import {
  MortEvaluationRecord,
  SeabedTypeOption,
  PosidoniaDistanceOption,
  getSeabedTypeLabels,
  getPosidoniaDistanceLabels,
  getActiveEvaluatorCriteriaLabels,
} from '../types';
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
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg uppercase text-xs">
            NO LOCALITZAT / SOTERRAT
          </span>
        );
      case 'conservation':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg uppercase text-xs">
            NO RETIRAR (CONSERVAR)
          </span>
        );
      case 'low_priority':
        return (
          <span className="px-2.5 py-1 bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-lg uppercase text-xs">
            PRIORITAT BAIXA (MITIGACIÓ)
          </span>
        );
      case 'medium_priority':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg uppercase text-xs">
            PRIORITAT MITJANA (RETIRADA)
          </span>
        );
      case 'high_priority':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-lg uppercase text-xs">
            PRIORITAT ALTA (RETIRADA IMMEDIATA)
          </span>
        );
    }
  };

  const isNotFound = record.presenceStatus === 'not_found';
  const allPhotos = fullPhotos.length > 0 ? fullPhotos : (record.photos && record.photos.length > 0 ? record.photos : (record.thumbnails && record.thumbnails.length > 0 ? record.thumbnails : (record.photoUrl ? [record.photoUrl] : [])));

  // Extract seabed types, posidonia distances and evaluator criteria
  const allSeabedTypes = record.seabedTypes && record.seabedTypes.length > 0
    ? record.seabedTypes
    : (record.blocks?.flatMap((b) => b.seabedTypes || []).filter(Boolean) || []);
  const uniqueSeabedTypes = Array.from(new Set(allSeabedTypes)) as SeabedTypeOption[];

  const allPosidoniaDistances = record.posidoniaDistances && record.posidoniaDistances.length > 0
    ? record.posidoniaDistances
    : (record.blocks?.flatMap((b) => b.posidoniaDistances || []).filter(Boolean) || []);
  const uniquePosidoniaDistances = Array.from(new Set(allPosidoniaDistances)) as PosidoniaDistanceOption[];

  const evaluatorCriteriaLabels = record.evaluatorCriteria
    ? getActiveEvaluatorCriteriaLabels(record.evaluatorCriteria)
    : (record.blocks?.flatMap((b) => (b.evaluatorCriteria ? getActiveEvaluatorCriteriaLabels(b.evaluatorCriteria) : [])).filter(Boolean) || []);
  const uniqueEvaluatorCriteriaLabels = Array.from(new Set(evaluatorCriteriaLabels));

  return (
    <div className="fixed inset-0 z-50 bg-[#134E4A]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#D1D1C7] overflow-hidden print:border-none print:shadow-none print:max-w-full my-auto">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="bg-[#134E4A] text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm sm:text-base">Fitxa Tècnica d'Inspecció Oficial (1 pàgina A4)</span>
            <span className="text-xs bg-[#0E3B38] text-white px-2 py-0.5 rounded-full font-mono">
              {record.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#F5F5F0] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3.5 py-1.5 rounded-full transition shadow-xs cursor-pointer"
              title="Imprimir aquesta fitxa d'inspecció en 1 pàgina A4"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Fitxa (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#0E3B38] text-white/80 hover:text-white rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Report Document - Formatted strictly for 1 A4 Page on print */}
        <div className="p-5 sm:p-8 space-y-4 text-[#134E4A] text-xs print:p-0 print:space-y-2 print-a4-page">
          
          {/* Header */}
          <div className="border-b-2 border-[#134E4A] pb-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-[#3D5A45] uppercase tracking-wider font-sans">
                Protocol Oficial de Diagnosi • Restauració d'Hàbitats Marins (v3.6)
              </div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-[#134E4A] tracking-tight leading-snug">
                FITXA D'INSPECCIÓ I DIAGNOSI D'ESTRUCTURES DE FONDEIG
              </h1>
              <p className="text-[11px] text-[#5C6B5E] leading-none mt-0.5">
                Avaluació objectiva de blocs artificials submergits segons protocol científic
              </p>
            </div>

            <div className="text-right shrink-0 bg-[#FAF9F6] border border-[#D1D1C7] px-3 py-1 rounded-xl">
              <div className="font-bold text-[#134E4A] font-mono text-sm leading-tight">{record.code}</div>
              <div className="text-[10px] text-[#5C6B5E]">Data: {record.date}</div>
              <div className="text-[10px] text-[#5C6B5E]">Fondària: -{record.depthM} m</div>
            </div>
          </div>

          {/* Decision Outcome Banner */}
          <div className="p-2.5 px-3.5 rounded-xl border border-[#D1D1C7] bg-[#FAF9F6] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5C6B5E] block leading-none mb-0.5">
                Dictamen Oficial del Protocol
              </span>
              <div className="text-base font-serif font-bold text-[#134E4A] leading-tight">
                {record.result.recommendedAction}
              </div>
              <div className="text-[11px] text-[#5C6B5E] font-medium flex flex-wrap items-center gap-2 mt-0.5">
                <span>{record.result.categoryTitle} • Suma de puntuació:{' '}
                  <strong>
                    {isNotFound ? 'Ø (Sense puntuació)' : `${record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore} punts`}
                  </strong>
                </span>
                {record.result.casuistica128Id && (
                  <span className="px-1.5 py-0.2 rounded bg-[#134E4A]/10 text-[#134E4A] font-bold font-mono text-[10px]">
                    Casuística #{record.result.casuistica128Id} de 128
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">{getStatusBadge()}</div>
          </div>

          {/* 2-Column Info Grid: Identification & Physical characteristics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="border border-[#D1D1C7] rounded-xl p-2.5 space-y-1 bg-[#FAF9F6]">
              <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider border-b border-[#E9E9E0] pb-1">
                1. Localització i Paràmetres Operatius
              </h3>
              <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                <li><strong>Estat de presència:</strong> {isNotFound ? '⚠️ No localitzat / Soterrat' : '🟢 Localitzat in situ'}</li>
                {isNotFound && record.notFoundReason && (
                  <li className="text-amber-900 font-medium"><strong>Motiu:</strong> {record.notFoundReason}</li>
                )}
                <li><strong>Ubicació:</strong> {record.locationName}</li>
                <li><strong>Fondària de fons:</strong> -{record.depthM} metres</li>
                <li><strong>Estat d'ús:</strong> {record.usageStatus === 'in_use' ? 'En ús actiu' : 'En desús / Abandonat'}</li>
                {record.blocks && record.blocks.length > 1 && (
                  <li>
                    <strong>Morts:</strong>{' '}
                    <span className="font-semibold text-[#134E4A]">
                      {record.connectionMode === 'chained'
                        ? '⛓️ Concatenats amb cadena'
                        : '🔗 Aïllats / independents'}
                    </span>
                  </li>
                )}
                <li><strong>Auditor:</strong> {record.observerName || 'No especificat'}</li>
                {record.latitude && record.longitude && (
                  <li><strong>Coordenades GPS:</strong> {record.latitude.toFixed(5)}°N, {record.longitude.toFixed(5)}°E</li>
                )}
                {uniqueSeabedTypes.length > 0 && (
                  <li>
                    <strong>Tipus de Fons:</strong>{' '}
                    <span className="font-semibold text-emerald-950">
                      {getSeabedTypeLabels(uniqueSeabedTypes).join(', ')}
                    </span>
                  </li>
                )}
                {uniquePosidoniaDistances.length > 0 && (
                  <li>
                    <strong>Distància a Posidònia:</strong>{' '}
                    <span className="font-semibold text-teal-950">
                      {getPosidoniaDistanceLabels(uniquePosidoniaDistances).join(', ')}
                    </span>
                  </li>
                )}
                {uniqueEvaluatorCriteriaLabels.length > 0 && (
                  <li>
                    <strong>Criteri Avaluador:</strong>{' '}
                    <span className="font-semibold text-sky-950">
                      {uniqueEvaluatorCriteriaLabels.join(' + ')}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="border border-[#D1D1C7] rounded-xl p-2.5 space-y-1 bg-[#FAF9F6]">
              <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider border-b border-[#E9E9E0] pb-1">
                2. Característiques Físiques {record.blocks && record.blocks.length > 1 ? `(${record.blocks.length} morts)` : 'del Bloc'}
              </h3>
              {isNotFound ? (
                <div className="p-2 text-[10px] text-[#5C6B5E] italic">
                  Sense dimensions per no localització.
                </div>
              ) : record.blocks && record.blocks.length > 1 ? (
                <div className="space-y-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border border-[#D1D1C7] rounded-md">
                      <thead className="bg-[#E9E9E0] text-[#134E4A]">
                        <tr>
                          <th className="p-1">Mort</th>
                          <th className="p-1">Dimensions</th>
                          <th className="p-1 text-right">Pes Subm.</th>
                          <th className="p-1 text-center">Punts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5DF] bg-white">
                        {record.blocks.map((b, idx) => (
                          <tr key={b.id || idx}>
                            <td className="p-1 font-medium">{b.label || `M${idx + 1}`}</td>
                            <td className="p-1 font-mono text-[9px]">
                              {b.structureType === 'other_structure'
                                ? (b.otherStructure?.customTypeDescription || "Especial")
                                : `${b.dimensions.lengthCm}×${b.dimensions.widthCm}×${b.dimensions.heightCm}`}
                            </td>
                            <td className="p-1 text-right font-mono font-semibold">{b.hydrodynamics?.submergedWeightKg || 0} kg</td>
                            <td className="p-1 text-center font-mono font-bold">
                              {b.result ? (b.result.totalScore > 0 ? `+${b.result.totalScore}` : b.result.totalScore) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : record.structureType === 'other_structure' && record.otherStructure ? (
                <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                  <li><strong>Tipologia:</strong> {record.otherStructure.customTypeDescription || "Estructura especial"}</li>
                  <li><strong>Volum aprox.:</strong> {record.otherStructure.estimatedVolumeM3 || record.hydrodynamics?.volumeM3 || 0} m³</li>
                  <li><strong>Pes submergit:</strong> {record.otherStructure.estimatedSubmergedWeightKg?.toLocaleString() || record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                  {record.otherStructure.structureNotes && (
                    <li className="truncate"><strong>Notes:</strong> {record.otherStructure.structureNotes}</li>
                  )}
                </ul>
              ) : (
                <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                  <li>
                    <strong>Dimensions:</strong> {record.dimensions.lengthCm} × {record.dimensions.widthCm} × {record.dimensions.heightCm} cm
                  </li>
                  <li><strong>Volum:</strong> {record.hydrodynamics?.volumeM3 || 0} m³ &nbsp;|&nbsp; <strong>Pes aire:</strong> {record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                  <li><strong>Pes submergit:</strong> {record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                  <li><strong>Velocitat crítica u_b:</strong> {record.hydrodynamics?.criticalBottomVelocityUb} m/s</li>
                </ul>
              )}
            </div>
          </div>

          {/* Scoring Table Breakdown */}
          {!isNotFound && (
            <div className="border border-[#D1D1C7] rounded-xl overflow-hidden">
              <table className="w-full text-[10.5px] text-left">
                <thead className="bg-[#E9E9E0] uppercase text-[#134E4A] font-serif font-bold text-[10px]">
                  <tr>
                    <th className="p-1.5 px-2.5">Criteri Avaluat</th>
                    <th className="p-1.5 px-2.5">Estat Observat a la Immersió</th>
                    <th className="p-1.5 px-2.5 text-right">Puntuació</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9E0]">
                  <tr>
                    <td className="p-1.5 px-2.5 font-semibold text-[#134E4A] w-1/3">1. Espècies amenaçades / protegides</td>
                    <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                      {record.c1_speciesPresence === 'high_coverage_or_protected'
                        ? 'Cobertura >10% o espècies protegides'
                        : record.c1_speciesPresence === 'low_coverage'
                        ? 'Presència <10% espècies d\'interès'
                        : record.c1_speciesPresence === 'renaturalized_algal'
                        ? 'Recobriment algal / renaturalitzat'
                        : 'Absència d\'espècies d\'interès'}
                      {record.c1_speciesNotes && <span className="text-[9.5px] text-[#2D5A3C] font-medium ml-1">({record.c1_speciesNotes})</span>}
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#2D5A3C]">
                      {record.result.scoresBreakdown.c1_species} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">2. Impacte sobre substrat annex</td>
                    <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                      {record.c2_substrateImpact === 'active_erosion_halo'
                        ? `Ferida/calva activa (Superfície estimada: ${record.c2_abrasionAreaM2 ?? record.c2_haloRadiusM ?? 0} m²)`
                        : 'Absència d\'abrasió activa'}
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#8B322C]">
                      +{record.result.scoresBreakdown.c2_substrate} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">3. Dinamisme i risc (Hidrodinàmica)</td>
                    <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                      {record.hydrodynamics?.willSlideInSevereStorm
                        ? `Risc de lliscament (Onada crítica: ${record.hydrodynamics.criticalWaveHeightM} m)`
                        : 'Estructura estable per inèrcia hidrodinàmica'}
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#7D5B18]">
                      +{record.result.scoresBreakdown.c3_dynamism} pts
                    </td>
                  </tr>

                  <tr>
                    <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">4. Estabilitat i integració en l'hàbitat</td>
                    <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                      {record.c4_stabilityIntegration === 'fixed_by_roots_or_sediment'
                        ? 'Fixat per rizomes/sediment (mata cohesionada)'
                        : record.c4_stabilityIntegration === 'not_buried_generates_void'
                        ? 'No enterrat, retirada generaria buit desestabilitzador'
                        : record.c4_stabilityIntegration === 'not_buried_no_void'
                        ? 'No enterrat, retirada neta possible'
                        : 'Estructura estable'}
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#134E4A]">
                      {record.result.scoresBreakdown.c4_stability > 0
                        ? `+${record.result.scoresBreakdown.c4_stability}`
                        : record.result.scoresBreakdown.c4_stability}{' '}
                      pts
                    </td>
                  </tr>

                  <tr className="bg-[#FAF9F6] font-bold">
                    <td colSpan={2} className="p-1.5 px-2.5 text-[#134E4A] uppercase font-serif text-[10px]">
                      PUNTUACIÓ TOTAL ACUMULADA
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono text-xs text-[#134E4A]">
                      {record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Attached Photo Gallery - strictly sized for A4 single page */}
          {allPhotos.length > 0 && (
            <div className="border border-[#D1D1C7] rounded-xl p-2 bg-[#FAF9F6] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#134E4A]" />
                  <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider">
                    Registre Fotogràfic Subaquàtic ({allPhotos.length} imatge{allPhotos.length > 1 ? 's' : ''})
                  </h3>
                </div>
                {isLoadingFullRes ? (
                  <span className="text-[9px] text-amber-700 flex items-center gap-1 font-mono print:hidden">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Carregant HD...
                  </span>
                ) : (
                  <span className="text-[9px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-full font-mono font-bold flex items-center gap-1 border border-emerald-300 print:hidden">
                    <Sparkles className="w-2.5 h-2.5" />
                    HD
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5">
                {allPhotos.slice(0, 4).map((photo, idx) => (
                  <div key={idx} className="rounded-lg overflow-hidden border border-[#D1D1C7] bg-black/5 aspect-4/3 max-h-24 print:max-h-18 print:h-18">
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
          <div className="space-y-1.5 text-[10.5px]">
            <div className="border-l-3 border-[#134E4A] pl-2">
              <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Justificació Ecològica</h4>
              <p className="text-[#5C6B5E] leading-tight mt-0.5">{record.result.ecologicalJustification}</p>
            </div>

            <div className="border-l-3 border-amber-600 pl-2">
              <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Mesura Específica de Mitigació d'Impacte</h4>
              <p className="text-[#5C6B5E] leading-tight mt-0.5 font-medium">{record.result.mitigationAction || record.result.operationalRecommendation}</p>
            </div>

            <div className="border-l-3 border-[#2D5A3C] pl-2">
              <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Instruccions d'Actuació Operativa</h4>
              <p className="text-[#5C6B5E] leading-tight mt-0.5">{record.result.operationalRecommendation}</p>
            </div>

            {record.generalNotes && (
              <div className="border-l-3 border-[#7A8A7C] pl-2">
                <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Notes Generals de Camp</h4>
                <p className="text-[#5C6B5E] leading-tight mt-0.5">{record.generalNotes}</p>
              </div>
            )}
          </div>

          {/* Signatures & Certification block (sticks cleanly to bottom of A4) */}
          <div className="pt-2.5 border-t border-[#D1D1C7] grid grid-cols-2 gap-6 text-[10px] text-[#5C6B5E] mt-auto">
            <div>
              <div className="font-semibold text-[#134E4A]">Responsable Tècnic de la Diagnosi:</div>
              <div className="mt-4 border-b border-[#D1D1C7] w-40"></div>
              <div className="mt-0.5 text-[9px] text-[#7A8A7C]">Signatura / Tècnic col·legiat</div>
            </div>
            <div>
              <div className="font-semibold text-[#134E4A]">Conformitat Medi Ambient / Marítim:</div>
              <div className="mt-4 border-b border-[#D1D1C7] w-40"></div>
              <div className="mt-0.5 text-[9px] text-[#7A8A7C]">Segell o Vist-i-plau oficial</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
