import { BlockDimensions, HydrodynamicAssessment } from '../types';
import { HYDRODYNAMICS_PHYSICS_CONSTANTS } from '../data/protocolStandards';

export function calculateSubmergedWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  concreteDensity = HYDRODYNAMICS_PHYSICS_CONSTANTS.concreteMassDensity
): {
  volumeM3: number;
  weightAirKg: number;
  submergedWeightKg: number;
} {
  const lengthM = Math.max(0.1, lengthCm / 100);
  const widthM = Math.max(0.1, widthCm / 100);
  const heightM = Math.max(0.1, heightCm / 100);
  const volumeM3 = lengthM * widthM * heightM;
  const weightAirKg = volumeM3 * concreteDensity;
  const submergedWeightKg = volumeM3 * (concreteDensity - HYDRODYNAMICS_PHYSICS_CONSTANTS.seawaterDensity);

  return {
    volumeM3: Math.round(volumeM3 * 1000) / 1000,
    weightAirKg: Math.round(weightAirKg * 10) / 10,
    submergedWeightKg: Math.round(submergedWeightKg * 10) / 10,
  };
}

/**
 * Solve dispersion relation omega^2 = g * k * tanh(k * d)
 */
function solveWaveNumber(omega: number, depth: number): number {
  const g = 9.81;
  // initial estimate using deep water approximation
  let k = (omega * omega) / g;
  // Newton-Raphson iteration
  for (let i = 0; i < 12; i++) {
    const f = g * k * Math.tanh(k * depth) - omega * omega;
    const df = g * Math.tanh(k * depth) + g * k * depth * (1 - Math.pow(Math.tanh(k * depth), 2));
    const step = f / df;
    k -= step;
    if (Math.abs(step) < 1e-6) break;
  }
  return k;
}

/**
 * Estimates critical bottom orbital velocity ub and required wave height H for a block or structure at depth d
 */
export function assessHydrodynamics(
  dims: BlockDimensions,
  depthM: number,
  wavePeriodT = 9, // typical 8-10 s storm period
  overridePhysics?: {
    volumeM3?: number;
    weightAirKg?: number;
    submergedWeightKg?: number;
  }
): HydrodynamicAssessment {
  const d = Math.max(1, depthM);
  
  let volumeM3: number;
  let weightAirKg: number;
  let submergedWeightKg: number;

  if (overridePhysics && (overridePhysics.volumeM3 !== undefined || overridePhysics.weightAirKg !== undefined || overridePhysics.submergedWeightKg !== undefined)) {
    volumeM3 = overridePhysics.volumeM3 ?? (dims.lengthCm * dims.widthCm * dims.heightCm) / 1000000;
    volumeM3 = Math.max(0.001, Math.round(volumeM3 * 1000) / 1000);
    
    weightAirKg = overridePhysics.weightAirKg ?? (volumeM3 * (dims.concreteDensityKgM3 || HYDRODYNAMICS_PHYSICS_CONSTANTS.concreteMassDensity));
    weightAirKg = Math.round(weightAirKg * 10) / 10;

    submergedWeightKg = overridePhysics.submergedWeightKg ?? (weightAirKg - volumeM3 * HYDRODYNAMICS_PHYSICS_CONSTANTS.seawaterDensity);
    submergedWeightKg = Math.max(1, Math.round(submergedWeightKg * 10) / 10);
  } else {
    const calc = calculateSubmergedWeight(
      dims.lengthCm,
      dims.widthCm,
      dims.heightCm,
      dims.concreteDensityKgM3 || HYDRODYNAMICS_PHYSICS_CONSTANTS.concreteMassDensity
    );
    volumeM3 = calc.volumeM3;
    weightAirKg = calc.weightAirKg;
    submergedWeightKg = calc.submergedWeightKg;
  }

  // Depth breaking limit Hmax ≈ 0.78 * d
  const breakingWaveHeightLimitM = Math.round(HYDRODYNAMICS_PHYSICS_CONSTANTS.depthBreakingRatio * d * 10) / 10;

  // Approximate critical ub based on dimension & weight ratio (calibrated with protocol table)
  // If custom/other structure, deduce equivalent cube side if dimensions are zero
  const equivSideM = Math.cbrt(Math.max(0.001, volumeM3));
  const heightM = dims.heightCm > 0 ? dims.heightCm / 100 : equivSideM;
  const lengthM = dims.lengthCm > 0 ? dims.lengthCm / 100 : equivSideM;
  const widthM = dims.widthCm > 0 ? dims.widthCm / 100 : equivSideM;
  const frontalArea = Math.min(lengthM, widthM) * heightM;
  const topArea = lengthM * widthM;

  // Base empirical calibration aligning with standard 40x40x40 -> 2.1 m/s, 80x80x40 -> 2.6 m/s, 150x150x50 -> 3.3 m/s
  const effectiveInertiaFactor = submergedWeightKg / (frontalArea * 1000 + topArea * 400 + 10);
  let criticalUb = 1.6 + 1.2 * Math.sqrt(Math.max(0.1, effectiveInertiaFactor));
  criticalUb = Math.min(4.5, Math.max(1.5, criticalUb));
  criticalUb = Math.round(criticalUb * 10) / 10;

  // Linear wave theory calculation to find wave height H needed to generate ub at depth d:
  // ub = (pi * H) / (T * sinh(k * d))
  // => H = ub * T * sinh(k * d) / pi
  const omega = (2 * Math.PI) / wavePeriodT;
  const k = solveWaveNumber(omega, d);
  const sinhKd = Math.sinh(k * d);
  const requiredH = (criticalUb * wavePeriodT * sinhKd) / Math.PI;

  let criticalWaveHeightM: number | 'unlikely_breaking';
  let willSlideInSevereStorm = false;
  let slidingRiskScore = 0;
  let riskColor: 'blue' | 'green' | 'orange' | 'red' = 'red';

  if (requiredH > breakingWaveHeightLimitM && d <= 7) {
    criticalWaveHeightM = 'unlikely_breaking';
    willSlideInSevereStorm = false;
    slidingRiskScore = 0;
    riskColor = 'red';
  } else {
    criticalWaveHeightM = Math.round(requiredH * 10) / 10;
    
    // Categorization according to storm probabilities on Catalan/Mediterranean coast (typical 3-6m storms):
    // If H needed <= 4.0m in shallow waters -> High sliding risk
    if (requiredH <= 4.2 && d <= 12) {
      willSlideInSevereStorm = true;
      slidingRiskScore = 3;
      riskColor = 'blue'; // Blau +3
    } else if (requiredH <= 6.5 && d <= 15) {
      willSlideInSevereStorm = true;
      slidingRiskScore = 2;
      riskColor = 'green'; // Verd +2
    } else if (requiredH <= 9.0 && d <= 20) {
      willSlideInSevereStorm = false;
      slidingRiskScore = 1;
      riskColor = 'orange'; // Taronja +1
    } else {
      willSlideInSevereStorm = false;
      slidingRiskScore = 0;
      riskColor = 'red'; // Vermell 0
    }
  }

  return {
    volumeM3,
    weightAirKg,
    submergedWeightKg,
    depthM: d,
    criticalBottomVelocityUb: criticalUb,
    wavePeriodSeconds: wavePeriodT,
    criticalWaveHeightM,
    breakingWaveHeightLimitM,
    willSlideInSevereStorm,
    slidingRiskScore,
    riskColor,
  };
}
