import React from 'react';
import { Anchor, Calculator, Database, Waves, BookOpen, PlusCircle, Compass, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'calculator' | 'inventory' | 'batch' | 'map' | 'hydrodynamics' | 'protocol';
  setActiveTab: (tab: 'calculator' | 'inventory' | 'batch' | 'map' | 'hydrodynamics' | 'protocol') => void;
  inventoryCount: number;
  onNewEvaluation: () => void;
  isDriveConnected?: boolean;
  isDriveSyncing?: boolean;
  onDriveSyncClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  inventoryCount,
  onNewEvaluation,
}) => {
  return (
    <header className="bg-[#F5F5F0] text-[#134E4A] border-b border-[#D1D1C7] sticky top-0 z-30 shadow-xs backdrop-blur-md bg-[#F5F5F0]/95 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo and Brand Title with Serif Italic Theme */}
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#134E4A] text-[#FAF9F6] rounded-xl flex items-center justify-center shadow-xs">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold italic tracking-tight text-[#134E4A]">
                  Calculadora de Diagnosi: Morts de fondeig
                </h1>
                <span className="text-[11px] font-mono bg-[#134E4A] text-white px-2 py-0.5 rounded tracking-wider uppercase">
                  v3.3 - 2026
                </span>
              </div>
              <p className="text-xs text-[#4A5D52] font-semibold mt-0.5">
                Protocol de Restauració d'Hàbitats Marins &amp; Conservació de Posidònia
              </p>
              <div className="text-[11px] text-[#64746B] mt-0.5 font-medium flex items-center flex-wrap gap-x-2">
                <span>Consorci de Conservació del Medi Marí W&amp;M</span>
                <span>•</span>
                <span>Boris Weitzmann</span>
                <span>•</span>
                <span>Xavier Munill / Bufalvent.net</span>
              </div>
            </div>
          </div>

          {/* Navigation and Action */}
          <div className="flex items-center flex-wrap gap-2">
            <nav className="flex bg-[#E9E9E0] p-1 rounded-xl border border-[#DCDCD2]">
              <button
                id="nav-tab-calculator"
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'calculator'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Calculadora</span>
              </button>

              <button
                id="nav-tab-inventory"
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Inventari</span>
                {inventoryCount > 0 && (
                  <span className="ml-1 text-xs px-1.5 py-0.2 bg-[#FAF9F6] text-[#134E4A] rounded-full font-mono font-bold border border-[#D1D1C7]">
                    {inventoryCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-batch"
                onClick={() => setActiveTab('batch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'batch'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Pre-Anàlisi Imatges (Batch)</span>
              </button>

              <button
                id="nav-tab-map"
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'map'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Mapa</span>
              </button>

              <button
                id="nav-tab-hydrodynamics"
                onClick={() => setActiveTab('hydrodynamics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'hydrodynamics'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <Waves className="w-4 h-4" />
                <span>Física i Onatge</span>
              </button>

              <button
                id="nav-tab-protocol"
                onClick={() => setActiveTab('protocol')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'protocol'
                    ? 'bg-[#134E4A] text-white shadow-xs'
                    : 'text-[#134E4A] hover:bg-[#DCDCD2]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Criteris & Marc</span>
              </button>
            </nav>

            <button
              id="btn-new-eval-header"
              onClick={onNewEvaluation}
              className="flex items-center gap-1.5 bg-[#134E4A] hover:bg-[#0f3e3b] text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition shadow-xs"
              title="Nova avaluació de mort"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Avaluació</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

