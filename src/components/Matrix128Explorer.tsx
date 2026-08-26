import React, { useState, useMemo } from 'react';
import {
  Table,
  Search,
  Filter,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DECISION_MATRIX_128,
  Matrix128Item,
  C1_MATRIX_OPTIONS,
  C2_MATRIX_OPTIONS,
  C3_MATRIX_OPTIONS,
  C4_MATRIX_OPTIONS,
} from '../data/decisionMatrix128';

export function Matrix128Explorer() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [c1Filter, setC1Filter] = useState<string>('all');
  const [c2Filter, setC2Filter] = useState<string>('all');
  const [c3Filter, setC3Filter] = useState<string>('all');
  const [c4Filter, setC4Filter] = useState<string>('all');
  const [selectedCasuistica, setSelectedCasuistica] = useState<Matrix128Item | null>(null);

  // Filtered 128 items
  const filteredList = useMemo(() => {
    return DECISION_MATRIX_128.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (c1Filter !== 'all' && item.c1Key !== c1Filter) return false;
      if (c2Filter !== 'all') {
        const wantsImpact = c2Filter === 'impact';
        if (item.c2HasImpactOrMobile !== wantsImpact) return false;
      }
      if (c3Filter !== 'all' && item.c3Key !== c3Filter) return false;
      if (c4Filter !== 'all' && item.c4Key !== c4Filter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = `#${item.id}`.includes(q) || `${item.id}` === q;
        const matchesText =
          item.diagnosticSummary.toLowerCase().includes(q) ||
          item.decisionLabel.toLowerCase().includes(q) ||
          item.mitigationProposals.toLowerCase().includes(q) ||
          item.c1Short.toLowerCase().includes(q) ||
          item.c4Short.toLowerCase().includes(q);
        return matchesId || matchesText;
      }
      return true;
    });
  }, [categoryFilter, c1Filter, c2Filter, c3Filter, c4Filter, searchQuery]);

  // Statistics across all 128
  const stats = useMemo(() => {
    const total = DECISION_MATRIX_128.length;
    const immediate = DECISION_MATRIX_128.filter((i) => i.category === 'high_priority').length;
    const scheduled = DECISION_MATRIX_128.filter((i) => i.category === 'medium_priority').length;
    const low = DECISION_MATRIX_128.filter((i) => i.category === 'low_priority').length;
    const conserve = DECISION_MATRIX_128.filter((i) => i.category === 'conservation').length;
    return { total, immediate, scheduled, low, conserve };
  }, []);

  const handleExportCSV = () => {
    const headers = [
      'Casuistica_ID',
      'Puntuacio_Final',
      'Decisio_Final',
      'Prioritat',
      'C1_Especies_Desc',
      'C1_Punts',
      'C2_Impacte_Desc',
      'C2_Punts',
      'C3_Dinamisme_Desc',
      'C3_Punts',
      'C4_Integracio_Desc',
      'C4_Punts',
      'Diagnosi_Completa',
      'Mesures_Mitigacio',
    ];

    const rows = DECISION_MATRIX_128.map((item) => [
      `#${item.id}`,
      item.totalScore,
      `"${item.decisionLabel}"`,
      `"${item.categoryTitle}"`,
      `"${item.c1Desc}"`,
      item.c1Points,
      `"${item.c2Desc}"`,
      item.c2Points,
      `"${item.c3Desc}"`,
      item.c3Points,
      `"${item.c4Desc}"`,
      item.c4Points,
      `"${item.diagnosticSummary.replace(/"/g, '""')}"`,
      `"${item.mitigationProposals.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriu_Oficial_128_Casuistiques_v3.0.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setC1Filter('all');
    setC2Filter('all');
    setC3Filter('all');
    setC4Filter('all');
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E9E9E0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/10 text-[#134E4A] text-xs font-mono font-bold mb-2">
            <Layers className="w-3.5 h-3.5 text-[#134E4A]" />
            Taula Completa de 128 Casuístiques (4 × 2 × 4 × 4)
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#134E4A]">
            Matriu Exhaustiva de Presa de Decisions (Casuístiques #1 a #128)
          </h2>
          <p className="text-xs sm:text-sm text-[#64746B] mt-1 max-w-3xl">
            Taula oficial de combinatòria del Protocol v3.0 que contempla totes les combinacions possibles entre valor biològic (C1), impacte en el substrat (C2), risc hidrodinàmic (C3) i grau d'estabilitat a la mata (C4).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#134E4A] hover:bg-[#0F3F3C] text-white text-xs sm:text-sm font-semibold transition shadow-xs self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Matriu 128 (CSV / Excel)</span>
        </button>
      </div>

      {/* Stats Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl p-3">
          <div className="text-[11px] text-[#64746B]">Total Combinacions</div>
          <div className="text-base font-bold text-[#134E4A] mt-0.5 font-mono">
            {stats.total} Casuístiques
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
          <div className="text-[11px] text-rose-800 font-medium">Retirada Immediata</div>
          <div className="text-base font-bold text-rose-900 mt-0.5 font-mono">
            {stats.immediate} ({Math.round((stats.immediate / stats.total) * 100)}%)
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-[11px] text-amber-800 font-medium">Retirada Programada</div>
          <div className="text-base font-bold text-amber-900 mt-0.5 font-mono">
            {stats.scheduled} ({Math.round((stats.scheduled / stats.total) * 100)}%)
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
          <div className="text-[11px] text-sky-800 font-medium">Prioritat Baixa (Mitigació)</div>
          <div className="text-base font-bold text-sky-900 mt-0.5 font-mono">
            {stats.low} ({Math.round((stats.low / stats.total) * 100)}%)
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-emerald-800 font-medium">Conservar (Escull)</div>
          <div className="text-base font-bold text-emerald-900 mt-0.5 font-mono">
            {stats.conserve} ({Math.round((stats.conserve / stats.total) * 100)}%)
          </div>
        </div>
      </div>

      {/* Filter Controls Strip */}
      <div className="bg-[#FAF9F6] border border-[#E5E5DF] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8A9A90] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per #ID, paraula clau o diagnòstic..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#D1D1C7] bg-white text-[#134E4A] focus:outline-hidden focus:ring-2 focus:ring-[#134E4A]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-[#64746B]">
              Mostrant <strong>{filteredList.length}</strong> de {DECISION_MATRIX_128.length} casuístiques
            </span>
            {(categoryFilter !== 'all' || c1Filter !== 'all' || c2Filter !== 'all' || c3Filter !== 'all' || c4Filter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-rose-700 hover:underline font-semibold"
              >
                Netejar filtres
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-[#64746B] uppercase mb-1">Acció / Decisió</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A]"
            >
              <option value="all">Totes les decisions</option>
              <option value="high_priority">Retirada Immediata (≥ +10)</option>
              <option value="medium_priority">Retirada Programada (+5 a +9)</option>
              <option value="low_priority">Prioritat Baixa (+1 a +4)</option>
              <option value="conservation">Conservar (≤ 0)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#64746B] uppercase mb-1">Criteri 1 (Espècies)</label>
            <select
              value={c1Filter}
              onChange={(e) => setC1Filter(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A]"
            >
              <option value="all">Tots els estats C1</option>
              {C1_MATRIX_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.short} ({o.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#64746B] uppercase mb-1">Criteri 2 (Impacte/Mòbils)</label>
            <select
              value={c2Filter}
              onChange={(e) => setC2Filter(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A]"
            >
              <option value="all">Tots els estats C2</option>
              <option value="impact">Amb erosió/mòbils (+6 pts)</option>
              <option value="clean">Sense erosió/mòbils (0 pts)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#64746B] uppercase mb-1">Criteri 3 (Dinamisme)</label>
            <select
              value={c3Filter}
              onChange={(e) => setC3Filter(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A]"
            >
              <option value="all">Tots els nivells C3</option>
              {C3_MATRIX_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.short} ({o.points > 0 ? `+${o.points}` : o.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#64746B] uppercase mb-1">Criteri 4 (Integració)</label>
            <select
              value={c4Filter}
              onChange={(e) => setC4Filter(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D1D1C7] bg-white text-[#134E4A]"
            >
              <option value="all">Tots els graus C4</option>
              {C4_MATRIX_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.short} ({o.points > 0 ? `+${o.points}` : o.points} pts)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 128 Casuístiques Interactive Table */}
      <div className="overflow-x-auto border border-[#E5E5DF] rounded-2xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E9E9E0] text-[#134E4A] font-serif font-bold uppercase text-[11px] tracking-wider">
            <tr>
              <th className="p-3 w-16 text-center"># ID</th>
              <th className="p-3 w-28 text-center">Punts & Acció</th>
              <th className="p-3 min-w-[140px]">C1: Espècies</th>
              <th className="p-3 min-w-[130px]">C2: Substrat</th>
              <th className="p-3 min-w-[120px]">C3: Dinamisme</th>
              <th className="p-3 min-w-[150px]">C4: Integració</th>
              <th className="p-3 min-w-[240px]">Diagnosi i Mesura de Mitigació</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9E9E0]">
            {filteredList.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedCasuistica(item)}
                className="hover:bg-[#FAF9F6] cursor-pointer transition"
              >
                <td className="p-3 text-center font-mono font-bold text-[#134E4A]">
                  #{item.id}
                </td>
                <td className="p-3 text-center">
                  <div className="font-mono font-extrabold text-xs text-[#134E4A]">
                    {item.totalScore > 0 ? `+${item.totalScore}` : item.totalScore} pts
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${item.badgeClass}`}>
                    {item.decisionLabel}
                  </span>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-[#134E4A]">{item.c1Short}</div>
                  <div className="text-[10px] font-mono text-[#8A9A90]">{item.c1Points} pts</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-[#134E4A]">{item.c2Short}</div>
                  <div className="text-[10px] font-mono text-[#8A9A90]">+{item.c2Points} pts</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-[#134E4A]">{item.c3Short}</div>
                  <div className="text-[10px] font-mono text-[#8A9A90]">+{item.c3Points} pts</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-[#134E4A]">{item.c4Short}</div>
                  <div className="text-[10px] font-mono text-[#8A9A90]">{item.c4Points > 0 ? `+${item.c4Points}` : item.c4Points} pts</div>
                </td>
                <td className="p-3 text-[#4A5D52]">
                  <p className="leading-snug">{item.diagnosticSummary}</p>
                  <p className="text-[11px] text-[#134E4A] font-medium mt-1">
                    <strong>Mitigació:</strong> {item.mitigationProposals}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal for a specific Casuística */}
      {selectedCasuistica && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-[#D1D1C7] shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E9E9E0] pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#134E4A] text-white font-mono font-bold text-sm flex items-center justify-center">
                  #{selectedCasuistica.id}
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#134E4A]">
                    Casuística Oficial #{selectedCasuistica.id} de 128
                  </h3>
                  <div className="text-xs text-[#64746B]">
                    Puntuació Total: <strong>{selectedCasuistica.totalScore > 0 ? `+${selectedCasuistica.totalScore}` : selectedCasuistica.totalScore} punts</strong> • {selectedCasuistica.categoryTitle}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCasuistica(null)}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#D1D1C7] flex items-center justify-center text-[#64746B] hover:text-[#134E4A]"
              >
                ✕
              </button>
            </div>

            {/* Decision Banner */}
            <div className={`p-4 rounded-2xl ${selectedCasuistica.badgeClass}`}>
              <div className="text-xs font-bold uppercase tracking-wider">Acció Recomanada</div>
              <div className="text-base font-serif font-bold mt-0.5">
                {selectedCasuistica.decisionLabel}
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E5DF]">
                <div className="text-[10px] text-[#64746B] font-bold uppercase">C1: Espècies</div>
                <div className="font-bold text-[#134E4A] mt-1">{selectedCasuistica.c1Short}</div>
                <div className="font-mono text-[10px] text-[#2D5A3C]">{selectedCasuistica.c1Points} punts</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E5DF]">
                <div className="text-[10px] text-[#64746B] font-bold uppercase">C2: Substrat</div>
                <div className="font-bold text-[#134E4A] mt-1">{selectedCasuistica.c2Short}</div>
                <div className="font-mono text-[10px] text-rose-700">+{selectedCasuistica.c2Points} punts</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E5DF]">
                <div className="text-[10px] text-[#64746B] font-bold uppercase">C3: Dinamisme</div>
                <div className="font-bold text-[#134E4A] mt-1">{selectedCasuistica.c3Short}</div>
                <div className="font-mono text-[10px] text-[#204E6B]">+{selectedCasuistica.c3Points} punts</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E5DF]">
                <div className="text-[10px] text-[#64746B] font-bold uppercase">C4: Integració</div>
                <div className="font-bold text-[#134E4A] mt-1">{selectedCasuistica.c4Short}</div>
                <div className="font-mono text-[10px] text-[#134E4A]">{selectedCasuistica.c4Points > 0 ? `+${selectedCasuistica.c4Points}` : selectedCasuistica.c4Points} punts</div>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-[#134E4A]">Diagnosi Tècnica:</div>
              <p className="text-[#4A5D52] bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E5DF] leading-relaxed">
                {selectedCasuistica.diagnosticSummary}
              </p>
            </div>

            {/* Mitigation Proposals */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-[#134E4A]">Mesures de Correcció i Mitigació Operatives:</div>
              <p className="text-[#134E4A] bg-[#EBF3ED] p-3 rounded-xl border border-[#C5DDCB] leading-relaxed font-medium">
                {selectedCasuistica.mitigationProposals}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCasuistica(null)}
                className="px-5 py-2 rounded-xl bg-[#134E4A] text-white text-xs font-semibold hover:bg-[#0F3F3C]"
              >
                Tancar Detall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
