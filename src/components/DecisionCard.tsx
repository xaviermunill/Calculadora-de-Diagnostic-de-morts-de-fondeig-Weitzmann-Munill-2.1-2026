import React from 'react';
import { DecisionResult, EvaluatorCriteria, EVALUATOR_CRITERIA_OPTIONS, getActiveEvaluatorCriteriaLabels, getEvaluatorActionLabel } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Printer,
  BookmarkPlus,
  ArrowRight,
  Info,
  Scale,
  TreeDeciduous,
  Waves,
  Anchor,
  Mail,
  UserCheck,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DecisionCardProps {
  result: DecisionResult;
  evaluatorCriteria?: EvaluatorCriteria;
  onSaveToInventory: () => void;
  onPrintReport: () => void;
  isSaved?: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  result,
  evaluatorCriteria,
  onSaveToInventory,
  onPrintReport,
  isSaved = false,
}) => {
  const triggerConfetti = () => {
    if (result.category === 'conservation') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#134E4A', '#065F46', '#047857', '#FAF9F6'],
      });
    }
  };

  const activeCriteriaLabels = getActiveEvaluatorCriteriaLabels(evaluatorCriteria);
  const evaluatorAction = getEvaluatorActionLabel(evaluatorCriteria);
  const hasEvaluatorCriteria = activeCriteriaLabels.length > 0;

  const getStatusIcon = () => {
    switch (result.category) {
      case 'not_found':
        return <Anchor className="w-6 h-6 text-slate-300" />;
      case 'conservation':
        return <ShieldCheck className="w-6 h-6 text-emerald-300" />;
      case 'low_priority':
        return <CheckCircle2 className="w-6 h-6 text-sky-300" />;
      case 'medium_priority':
        return <AlertTriangle className="w-6 h-6 text-amber-300" />;
      case 'high_priority':
        return <AlertOctagon className="w-6 h-6 text-rose-300" />;
    }
  };

  const getBadgeStyle = () => {
    switch (result.category) {
      case 'not_found':
        return 'bg-slate-800/80 text-slate-100 border border-slate-500/40';
      case 'conservation':
        return 'bg-emerald-800/80 text-emerald-100 border border-emerald-500/40';
      case 'low_priority':
        return 'bg-sky-900/80 text-sky-100 border border-sky-500/40';
      case 'medium_priority':
        return 'bg-amber-800/80 text-amber-100 border border-amber-500/40';
      case 'high_priority':
        return 'bg-rose-900/80 text-rose-100 border border-rose-500/40';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Primary Natural Hero Decision Card */}
      <div className="bg-[#134E4A] text-white p-7 sm:p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-lg border border-[#0f3e3b] relative overflow-hidden">
        {/* Subtle background glow/watermark */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-teal-800/30 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] opacity-80 mb-2 font-mono">
          {getStatusIcon()}
          <span>Puntuació de Diagnosi</span>
          {result.casuistica128Id && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] tracking-normal">
              Casuística #{result.casuistica128Id} / 128
            </span>
          )}
        </div>

        {/* Large Serif Italic Score */}
        <div className="text-7xl sm:text-8xl font-serif italic font-bold my-1 tracking-tight text-white drop-shadow-xs">
          {result.category === 'not_found' ? 'Ø' : result.totalScore > 0 ? `+${result.totalScore}` : result.totalScore}
        </div>

        {/* Decision Badge */}
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mt-2 shadow-xs ${getBadgeStyle()}`}>
          {result.recommendedAction}
        </div>

        <h3 className="text-base font-semibold text-white/90 mt-3 max-w-xs">
          {result.categoryTitle}
        </h3>

        <p className="mt-4 text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
          {result.ecologicalJustification}
        </p>

        {/* Complement de Criteri de l'Avaluador si està marcat */}
        {hasEvaluatorCriteria && (
          <div className="mt-5 w-full bg-black/25 backdrop-blur-sm border border-white/20 rounded-2xl p-3.5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200 uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Criteri de l'Avaluador (Complementari)</span>
              </div>
              <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-full">
                {activeCriteriaLabels.length} {activeCriteriaLabels.length > 1 ? 'opcions' : 'opció'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {evaluatorCriteria?.absencePosidoniaOrHabitats && (
                <div className="flex items-center gap-2 text-xs bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 px-2.5 py-1.5 rounded-xl">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="font-semibold">Absència de posidònia/hàbitats protegits</span>
                </div>
              )}

              {evaluatorAction && (
                <div className="flex items-center gap-2 text-xs bg-amber-950/60 border border-amber-500/40 text-amber-100 px-2.5 py-1.5 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="font-semibold">{evaluatorAction}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card Actions */}
        <div className="flex items-center flex-wrap gap-2.5 mt-6 w-full justify-center pt-4 border-t border-white/15">
          <button
            id="btn-save-to-inventory"
            onClick={() => {
              onSaveToInventory();
              triggerConfetti();
            }}
            disabled={isSaved}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex-1 sm:flex-initial ${
              isSaved
                ? 'bg-white/30 text-white/90 cursor-default'
                : 'bg-[#FAF9F6] text-[#134E4A] hover:bg-white'
            }`}
          >
            <BookmarkPlus className="w-4 h-4 text-[#134E4A]" />
            <span>{isSaved ? 'Guardat a l\'Inventari' : 'Guardar a Inventari'}</span>
          </button>

          <button
            id="btn-print-decision-card"
            onClick={onPrintReport}
            className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-white/25 transition shadow-xs"
            title="Generar fitxa d'inspecció per imprimir o PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Fitxa PDF</span>
          </button>
        </div>
      </div>

      {/* Decision Matrix Container in Natural Stone Tone (#E9E9E0) */}
      <div className="bg-[#E9E9E0] p-6 rounded-3xl border border-[#DCDCD2] space-y-4">
        <div className="flex items-center justify-between border-b border-[#D1D1C7] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#134E4A]">
            Matriu Oficial de Decisions (256 Combinacions)
          </h3>
          <span className="text-[10px] font-mono font-bold bg-[#134E4A] text-white px-2 py-0.5 rounded-md">
            v3.0
          </span>
        </div>

        <ul className="space-y-2 text-xs">
          <li
            className={`flex justify-between items-center p-2.5 rounded-xl transition ${
              result.category === 'high_priority'
                ? 'bg-white text-[#134E4A] font-bold shadow-xs border border-[#D1D1C7]'
                : 'bg-transparent text-[#4A4A43]'
            }`}
          >
            <span className="font-mono font-bold">≥ +10 pts</span>
            <span className="uppercase text-[11px] font-semibold">Prioritat Alta (Retirada Immediata)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
          </li>

          <li
            className={`flex justify-between items-center p-2.5 rounded-xl transition ${
              result.category === 'medium_priority'
                ? 'bg-white text-[#134E4A] font-bold shadow-xs border border-[#D1D1C7]'
                : 'bg-transparent text-[#4A4A43]'
            }`}
          >
            <span className="font-mono font-bold">+5 a +9 pts</span>
            <span className="uppercase text-[11px] font-semibold">Prioritat Mitjana (Programada)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-600"></div>
          </li>

          <li
            className={`flex justify-between items-center p-2.5 rounded-xl transition ${
              result.category === 'low_priority'
                ? 'bg-white text-[#134E4A] font-bold shadow-xs border border-[#D1D1C7]'
                : 'bg-transparent text-[#4A4A43]'
            }`}
          >
            <span className="font-mono font-bold">+1 a +4 pts</span>
            <span className="uppercase text-[11px] font-semibold">Prioritat Baixa (Mitigació in situ)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-sky-600"></div>
          </li>

          <li
            className={`flex justify-between items-center p-2.5 rounded-xl transition ${
              result.category === 'conservation'
                ? 'bg-white text-[#134E4A] font-bold shadow-xs border border-[#D1D1C7]'
                : 'bg-transparent text-[#4A4A43]'
            }`}
          >
            <span className="font-mono font-bold">≤ 0 pts</span>
            <span className="uppercase text-[11px] font-semibold">No retirar (Conservar / Escull)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
          </li>
        </ul>

        {/* Acció correctora i recomanació de mitigació */}
        <div className="p-3.5 bg-white/80 rounded-2xl border border-[#D1D1C7] space-y-2 text-xs">
          <div className="font-bold text-[#134E4A] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <ArrowRight className="w-3.5 h-3.5 text-[#134E4A]" />
            Mesura de Mitigació d'Impacte
          </div>
          <p className="text-[11px] text-[#134E4A] font-medium leading-relaxed bg-[#F5F5F0] p-2.5 rounded-xl border border-[#E0E0D6]">
            {result.mitigationAction || result.operationalRecommendation}
          </p>
        </div>

        <div className="p-3 bg-white/50 rounded-xl border border-white/40">
          <p className="text-[10px] italic leading-tight text-[#64746B]">
            Nota del Protocol: La intervenció sobre el medi marí prioritza aturar l'erosió mecànica activa (retirar cadenes soltes o instal·lar boies d'alça) i preservar els blocs renaturalitzats com a refugi de biodiversitat.
          </p>
        </div>
      </div>

    </div>
  );
};
