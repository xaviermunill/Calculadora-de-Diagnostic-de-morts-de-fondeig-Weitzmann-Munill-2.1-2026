import React, { useState, useMemo } from 'react';
import { PRESET_BLOCKS, HYDRODYNAMICS_PHYSICS_CONSTANTS } from '../data/protocolStandards';
import { assessHydrodynamics, calculateSubmergedWeight } from '../utils/hydrodynamics';
import { Waves, ShieldAlert, CheckCircle2, Info, ArrowUpRight, Gauge } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const HydrodynamicsPanel: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('block_80x80x40');
  const [lengthCm, setLengthCm] = useState<number>(80);
  const [widthCm, setWidthCm] = useState<number>(80);
  const [heightCm, setHeightCm] = useState<number>(40);
  const [concreteDensity, setConcreteDensity] = useState<number>(2400);
  const [depthM, setDepthM] = useState<number>(10);
  const [wavePeriodT, setWavePeriodT] = useState<number>(9);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PRESET_BLOCKS.find((b) => b.id === presetId);
    if (p) {
      setLengthCm(p.dimensionsCm.length);
      setWidthCm(p.dimensionsCm.width);
      setHeightCm(p.dimensionsCm.height);
    }
  };

  const assessment = useMemo(() => {
    return assessHydrodynamics(
      {
        lengthCm,
        widthCm,
        heightCm,
        concreteDensityKgM3: concreteDensity,
      },
      depthM,
      wavePeriodT
    );
  }, [lengthCm, widthCm, heightCm, concreteDensity, depthM, wavePeriodT]);

  // Generate chart data comparing wave heights across depths (3m to 25m)
  const chartData = useMemo(() => {
    const depths = [3, 5, 7, 10, 12, 15, 18, 20, 25];
    return depths.map((d) => {
      const hBreaking = Math.round(0.78 * d * 10) / 10;
      
      const resCustom = assessHydrodynamics(
        { lengthCm, widthCm, heightCm, concreteDensityKgM3: concreteDensity },
        d,
        wavePeriodT
      );
      const customH = typeof resCustom.criticalWaveHeightM === 'number' ? resCustom.criticalWaveHeightM : null;

      const res40 = assessHydrodynamics({ lengthCm: 40, widthCm: 40, heightCm: 40, concreteDensityKgM3: 2400 }, d, wavePeriodT);
      const res80 = assessHydrodynamics({ lengthCm: 80, widthCm: 80, heightCm: 40, concreteDensityKgM3: 2400 }, d, wavePeriodT);
      const res150 = assessHydrodynamics({ lengthCm: 150, widthCm: 150, heightCm: 50, concreteDensityKgM3: 2400 }, d, wavePeriodT);

      return {
        fondaria: `-${d}m`,
        depthVal: d,
        LimitTrencament: hBreaking,
        BlocPersonalitzat: customH,
        BlocPetit40cm: typeof res40.criticalWaveHeightM === 'number' ? res40.criticalWaveHeightM : null,
        BlocMitja80cm: typeof res80.criticalWaveHeightM === 'number' ? res80.criticalWaveHeightM : null,
        BlocGran150cm: typeof res150.criticalWaveHeightM === 'number' ? res150.criticalWaveHeightM : null,
      };
    });
  }, [lengthCm, widthCm, heightCm, concreteDensity, wavePeriodT]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-[#134E4A] text-[#F5F5F0] rounded-3xl p-6 sm:p-10 shadow-lg border border-[#0E3B38] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9E0]/20 text-[#E9E9E0] text-xs font-semibold uppercase tracking-wider border border-[#E9E9E0]/30">
              <Waves className="w-3.5 h-3.5" />
              <span>Model Físic d'Estabilitat Hidrodinàmica</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-[#FAF9F6]">
              Càlcul d'Onatge Límit i Lliscament de Blocs
            </h2>
            <p className="text-[#D1D1C7] text-sm sm:text-base leading-relaxed font-sans">
              Equilibri de forces hidrodinàmiques d'arrossegament (drag) i sustentació (lift) contra la fricció amb el fons marí (μ = 0,6), mitjançant la Teoria d'Ona Lineal per a temporals a la costa catalana i mediterrània.
            </p>
          </div>

          {/* Quick Indicator of current block */}
          <div className="bg-[#0E3B38]/80 border border-[#2D5A45] rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center min-w-[240px] shadow-sm">
            <span className="text-xs text-[#A8B8AA] uppercase font-semibold tracking-wider">Pes submergit calculat</span>
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#E9E9E0] my-1.5">
              {assessment.submergedWeightKg.toLocaleString()} <span className="text-sm font-sans font-normal text-[#A8B8AA]">kg</span>
            </span>
            <span className="text-xs text-[#A8B8AA] font-sans">
              Pes aire: {assessment.weightAirKg.toLocaleString()} kg | Volum: {assessment.volumeM3} m³
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Inputs & Dynamic Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Dimension & Environmental Controls */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6">
          <div className="flex items-center justify-between border-b border-[#E9E9E0] pb-4">
            <h3 className="text-lg font-serif font-bold text-[#134E4A] flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#3D5A45]" />
              Paràmetres del Bloc i Fons
            </h3>
            <span className="text-xs bg-[#E9E9E0] text-[#134E4A] px-3 py-1 rounded-full font-medium">
              Ajust directe
            </span>
          </div>

          {/* Presets Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C6B5E] mb-2">
              Models Estàndard del Protocol
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_BLOCKS.map((b) => (
                <button
                  key={b.id}
                  id={`preset-btn-${b.id}`}
                  onClick={() => handleSelectPreset(b.id)}
                  className={`text-left p-3 rounded-2xl border text-xs transition-all ${
                    selectedPreset === b.id
                      ? 'border-[#134E4A] bg-[#E9E9E0]/80 text-[#134E4A] font-semibold shadow-xs'
                      : 'border-[#D1D1C7] hover:border-[#3D5A45] text-[#3D5A45] bg-[#FAF9F6]'
                  }`}
                >
                  <div className="font-semibold text-sm">{b.name}</div>
                  <div className="text-[#5C6B5E] text-[11px] mt-0.5">Submergit: {b.submergedWeightKg} kg</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Sliders for Dimensions */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5C6B5E] mb-1">
                  Llargada (cm)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={lengthCm}
                  onChange={(e) => {
                    setLengthCm(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#134E4A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B5E] mb-1">
                  Amplada (cm)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={widthCm}
                  onChange={(e) => {
                    setWidthCm(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#134E4A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6B5E] mb-1">
                  Alçada (cm)
                </label>
                <input
                  type="number"
                  min="15"
                  max="200"
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#134E4A]"
                />
              </div>
            </div>

            {/* Depth Slider */}
            <div>
              <div className="flex justify-between text-xs font-medium text-[#134E4A] mb-1">
                <span>Profunditat del fons (m)</span>
                <span className="font-bold text-[#134E4A] font-serif text-sm">-{depthM} metres</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="0.5"
                value={depthM}
                onChange={(e) => setDepthM(Number(e.target.value))}
                className="w-full accent-[#134E4A]"
              />
              <div className="flex justify-between text-[11px] text-[#7A8A7C] mt-1">
                <span>-2 m (Molt somera)</span>
                <span>-10 m</span>
                <span>-15 m</span>
                <span>-25 m (Profunda)</span>
              </div>
            </div>

            {/* Wave Period & Density */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#5C6B5E] mb-1">
                  Període d'onada temporal (T)
                </label>
                <select
                  value={wavePeriodT}
                  onChange={(e) => setWavePeriodT(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] text-[#134E4A] focus:bg-white"
                >
                  <option value={8}>T = 8 segons (Temporal curt)</option>
                  <option value={9}>T = 9 segons (Temporal típic)</option>
                  <option value={10}>T = 10 segons (Temporal llarg/llevantada)</option>
                  <option value={11}>T = 11 segons (Gran llevantada)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C6B5E] mb-1">
                  Tipus de formigó
                </label>
                <select
                  value={concreteDensity}
                  onChange={(e) => setConcreteDensity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] text-[#134E4A] focus:bg-white"
                >
                  <option value={2400}>Formigó en massa (2.400 kg/m³)</option>
                  <option value={2500}>Formigó armat amb acer (2.500 kg/m³)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Assessment Output Card */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#E9E9E0] pb-4">
              <h3 className="text-lg font-serif font-bold text-[#134E4A]">
                Diagnosi Hidrodinàmica a -{depthM} m
              </h3>
              
              {/* Category Pill */}
              <span
                className={`text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider ${
                  assessment.slidingRiskScore === 3
                    ? 'bg-[#EAF0F4] text-[#204E6B] border border-[#BFD4E2]'
                    : assessment.slidingRiskScore === 2
                    ? 'bg-[#EBF3ED] text-[#2D5A3C] border border-[#C5DDCB]'
                    : assessment.slidingRiskScore === 1
                    ? 'bg-[#F8F3E8] text-[#7D5B18] border border-[#E8DCC0]'
                    : 'bg-[#FAF9F6] text-[#5C6B5E] border border-[#D1D1C7]'
                }`}
              >
                Puntuació Risc: +{assessment.slidingRiskScore} punts
              </span>
            </div>

            {/* Grid of Results */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#D1D1C7]">
                <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider">Velocitat de fons ub</span>
                <p className="text-xl font-serif font-bold text-[#134E4A] mt-0.5">
                  {assessment.criticalBottomVelocityUb} <span className="text-xs font-sans font-normal text-[#5C6B5E]">m/s</span>
                </p>
                <span className="text-[10px] text-[#7A8A7C]">Velocitat crítica orbital</span>
              </div>

              <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#D1D1C7]">
                <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider">Onada necessària (H)</span>
                <p className="text-xl font-serif font-bold text-[#134E4A] mt-0.5">
                  {typeof assessment.criticalWaveHeightM === 'number'
                    ? `${assessment.criticalWaveHeightM} m`
                    : 'Improbable'}
                </p>
                <span className="text-[10px] text-[#7A8A7C]">Per mobilitzar el bloc</span>
              </div>

              <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#D1D1C7]">
                <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider">Límit trencament (Hmax)</span>
                <p className="text-xl font-serif font-bold text-[#134E4A] mt-0.5">
                  {assessment.breakingWaveHeightLimitM} <span className="text-xs font-sans font-normal text-[#5C6B5E]">m</span>
                </p>
                <span className="text-[10px] text-[#7A8A7C]">0,78 × fondària ({depthM}m)</span>
              </div>
            </div>

            {/* Ecological Evaluation Box */}
            <div
              className={`p-5 rounded-2xl border text-sm leading-relaxed ${
                assessment.slidingRiskScore === 3
                  ? 'bg-[#EAF0F4] border-[#BFD4E2] text-[#133E59]'
                  : assessment.slidingRiskScore === 2
                  ? 'bg-[#EBF3ED] border-[#C5DDCB] text-[#1A4526]'
                  : assessment.slidingRiskScore === 1
                  ? 'bg-[#F8F3E8] border-[#E8DCC0] text-[#5F430E]'
                  : 'bg-[#FAF9F6] border-[#D1D1C7] text-[#134E4A]'
              }`}
            >
              <div className="flex items-start gap-2 font-bold mb-1.5 font-serif text-base">
                {assessment.slidingRiskScore >= 2 ? (
                  <ShieldAlert className="w-5 h-5 text-[#8B322C] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#2D5A3C] shrink-0 mt-0.5" />
                )}
                <span>
                  {assessment.slidingRiskScore === 3
                    ? 'Alt Risc de Dinamisme i Arrossegament (+3 punts al protocol)'
                    : assessment.slidingRiskScore === 2
                    ? 'Risc Moderat de Desplaçament (+2 punts al protocol)'
                    : assessment.slidingRiskScore === 1
                    ? 'Risc Baix de Dinamisme (+1 punt al protocol)'
                    : 'Bloc Estable per Inèrcia Hidrodinàmica (0 punts de risc)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-sans">
                {assessment.criticalWaveHeightM === 'unlikely_breaking'
                  ? `A -${depthM}m la màxima onada possible abans de trencar és de ${assessment.breakingWaveHeightLimitM}m. La inèrcia del bloc impedeix el seu lliscament per ona no trencant.`
                  : typeof assessment.criticalWaveHeightM === 'number' && assessment.criticalWaveHeightM <= 4.2
                  ? `Una onada de només ${assessment.criticalWaveHeightM} m (freqüent a temporals mediterranis) assoleix la velocitat de fons de ${assessment.criticalBottomVelocityUb} m/s, generant garreig i desplaçament incontrolat.`
                  : `Requereix una onada d'almenys ${assessment.criticalWaveHeightM} m per mobilitzar-se, la qual cosa confereix una alta estabilitat al fons.`}
              </p>
            </div>
          </div>

          <div className="text-xs text-[#5C6B5E] bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#D1D1C7] flex items-center justify-between">
            <span>Coeficient de fricció fons sorra/roca: <strong>μ = 0,6</strong></span>
            <span>Densitat aigua: <strong>1.025 kg/m³</strong></span>
          </div>
        </div>

      </div>

      {/* Chart & Curves Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E9E9E0] pb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#134E4A] flex items-center gap-2">
              <Waves className="w-5 h-5 text-[#3D5A45]" />
              Comparativa d'Alçada d'Onada Necessària (H) segons la Fondària
            </h3>
            <p className="text-xs text-[#5C6B5E] mt-0.5">
              Corbes de lliscament: valors per sota de la línia vermella (Límit de Trencament) són onades físicament possibles abans de rompre.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E0" />
              <XAxis dataKey="fondaria" stroke="#5C6B5E" tick={{ fontSize: 12 }} />
              <YAxis stroke="#5C6B5E" tick={{ fontSize: 12 }} unit=" m" domain={[0, 18]} />
              <Tooltip
                formatter={(val: any) => [`${val} m`, '']}
                labelFormatter={(label) => `Profunditat: ${label}`}
                contentStyle={{ backgroundColor: '#134E4A', color: '#F5F5F0', borderRadius: '12px', border: '1px solid #3D5A45', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="LimitTrencament"
                name="Límit Trencant (0,78d)"
                stroke="#8B322C"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="BlocPetit40cm"
                name="Bloc Petit 40x40"
                stroke="#204E6B"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="BlocMitja80cm"
                name="Bloc Mitjà 80x80"
                stroke="#2D5A3C"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="BlocGran150cm"
                name="Bloc Gran 150x150"
                stroke="#5F430E"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="BlocPersonalitzat"
                name="Bloc Seleccionat"
                stroke="#134E4A"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protocol Master Hydrodynamic Benchmark Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E9E0] pb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#134E4A]">
              Taula de Referència Oficial del Protocol
            </h2>
            <p className="text-xs text-[#5C6B5E] mt-0.5">
              Valors de velocitat crítica (u_b) i alçada d'onada (H) a diferents fondàries per a temporals T = 8 s a 10 s.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[#EAF0F4] text-[#204E6B] font-bold border border-[#BFD4E2]">Blau: +3</span>
            <span className="px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#2D5A3C] font-bold border border-[#C5DDCB]">Verd: +2</span>
            <span className="px-2.5 py-1 rounded-full bg-[#F8F3E8] text-[#7D5B18] font-bold border border-[#E8DCC0]">Taronja: +1</span>
            <span className="px-2.5 py-1 rounded-full bg-[#FBF0EE] text-[#8B322C] font-bold border border-[#EDC5C0]">Vermell: 0</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left text-[#134E4A]">
            <thead className="text-xs uppercase bg-[#E9E9E0] text-[#134E4A] font-serif font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Dimensions</th>
                <th className="px-3 py-3.5">Volum (m³)</th>
                <th className="px-3 py-3.5">Pes Aire (kg)</th>
                <th className="px-3 py-3.5">Pes Submergit (kg)</th>
                <th className="px-3 py-3.5">Velocitat u_b</th>
                <th className="px-3 py-3.5">H a -5 m</th>
                <th className="px-3 py-3.5">H a -10 m</th>
                <th className="px-3 py-3.5">H a -15 m</th>
                <th className="px-4 py-3.5 rounded-r-xl">H a -20 m</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E9E0]">
              {PRESET_BLOCKS.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF9F6] transition">
                  <td className="px-4 py-3.5 font-semibold text-[#134E4A]">
                    {b.dimensionsCm.length} x {b.dimensionsCm.width} x {b.dimensionsCm.height} cm
                  </td>
                  <td className="px-3 py-3.5">{b.volumeM3}</td>
                  <td className="px-3 py-3.5">{b.weightAirKg.toLocaleString()}</td>
                  <td className="px-3 py-3.5 font-medium text-[#2D5A3C]">{b.submergedWeightKg.toLocaleString()}</td>
                  <td className="px-3 py-3.5 font-mono">{b.criticalUbMs} m/s</td>
                  <td className="px-3 py-3.5">
                    <span className="bg-[#EAF0F4] text-[#204E6B] font-medium px-2 py-0.5 rounded-md">
                      {b.waveHeightsByDepth.atMinus5m}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="bg-[#EBF3ED] text-[#2D5A3C] font-medium px-2 py-0.5 rounded-md">
                      {b.waveHeightsByDepth.atMinus10m}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="bg-[#F8F3E8] text-[#7D5B18] font-medium px-2 py-0.5 rounded-md">
                      {b.waveHeightsByDepth.atMinus15m}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="bg-[#FBF0EE] text-[#8B322C] font-medium px-2 py-0.5 rounded-md">
                      {b.waveHeightsByDepth.atMinus20m}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Technical Explanations from Protocol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs text-[#5C6B5E]">
          <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#D1D1C7] space-y-1.5">
            <h4 className="font-serif font-bold text-[#134E4A] flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-[#3D5A45]" />
              Límit de trencament d'onada (Depth-limited breaking)
            </h4>
            <p className="leading-relaxed font-sans">
              En aigua poc profunda, les onades trenquen quan la seva alçada aconsegueix aproximadament el 78% de la profunditat (Hmax ≈ 0,78d). A -5 m, la màxima alçada d'ona possible abans de rompre és de 3,9 m. El bloc de 150x150x50 cm no es mourà per l'ona abans de la ruptura, excepte si queda sotmès a l'impacte directe de la zona de trencant (surf zone).
            </p>
          </div>

          <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#D1D1C7] space-y-1.5">
            <h4 className="font-serif font-bold text-[#134E4A] flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-[#3D5A45]" />
              Efecte del període d'ona (T) i Geometria de perfil
            </h4>
            <p className="leading-relaxed font-sans">
              Onades de temporal amb períodes més llargs (T ≥ 10 s) traslladen la seva energia a més profunditat. El bloc de 100x100x30 cm té una estabilitat gairebé idèntica al de 80x80x40 cm gràcies a la seva menor alçada (30 cm), que redueix l'àrea d'impacte frontal de l'aigua.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
