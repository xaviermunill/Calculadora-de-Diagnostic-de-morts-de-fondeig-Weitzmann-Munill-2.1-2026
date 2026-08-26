import * as XLSX from 'xlsx';
import { BlockDimensions, SpeciesPresenceOption, SubstrateImpactOption, DynamismRiskOption, StabilityIntegrationOption, MortUsageStatus } from '../types';
import { BatchMortGroup } from './batchPhotoAnalyzer';
import { assessHydrodynamics } from './hydrodynamics';
import { evaluateDecision } from './decisionEngine';
import { getMatrix128Combination } from '../data/decisionMatrix128';

export interface BatchSpreadsheetRow {
  rawName: string;
  name: string; // Cleaned and trimmed name
  locationName?: string; // Nom de la Cala / Ubicació
  coordX?: number; // Longitude or UTM X
  coordY?: number; // Latitude or UTM Y
  depthM?: number; // Fondària in meters
  tamanyMortRaw?: string; // Text raw representation (e.g. "80x80x40")
  dimensions?: BlockDimensions;
  volumMortM3?: number; // Volume in cubic meters
  rawRowData: Record<string, any>;
}

export interface SpreadsheetParseResult {
  success: boolean;
  totalRows: number;
  validRows: BatchSpreadsheetRow[];
  headersFound: string[];
  detectedColumns: {
    nameCol?: string;
    locationCol?: string;
    coordXCol?: string;
    coordYCol?: string;
    depthCol?: string;
    tamanyCol?: string;
    volumCol?: string;
  };
  warnings: string[];
  error?: string;
}

/**
 * Normalizes text for header or key matching (lowercase, no accents, alphanumeric only)
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Clean and parse coordinate numbers (handles commas, degree symbols, UTM numbers)
 */
export function parseCoordinate(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : val;
  }
  const str = String(val)
    .replace(/[°º'"NnSsEeWw\s]/g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse depth in meters (e.g. "8.5 m", "-8.5", "12")
 */
export function parseDepth(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : Math.abs(val);
  }
  const cleanStr = String(val)
    .replace(/m(?:etres|eters)?/gi, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? undefined : Math.abs(num);
}

/**
 * Parse dimensions string into BlockDimensions object (e.g. "80x80x40", "100 x 100 x 80 cm", "0.8x0.8x0.4 m")
 */
export function parseTamanyMort(val: any): { dimensions: BlockDimensions; rawStr: string; volumeCalculatedM3?: number } | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const rawStr = String(val).trim();

  // Look for 3 dimensions separated by x, *, ×, ,, /, or -
  const match = rawStr.match(/([\d.,]+)\s*(?:[xX*×,/;-])\s*([\d.,]+)\s*(?:[xX*×,/;-])\s*([\d.,]+)/);
  if (match) {
    let d1 = parseFloat(match[1].replace(',', '.'));
    let d2 = parseFloat(match[2].replace(',', '.'));
    let d3 = parseFloat(match[3].replace(',', '.'));

    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3) && d1 > 0 && d2 > 0 && d3 > 0) {
      // If values are <= 5 and appear to be in meters (e.g. 0.8 x 0.8 x 0.4 or 1 x 1 x 0.8), convert to cm
      const isMeters = rawStr.toLowerCase().includes('m') && !rawStr.toLowerCase().includes('cm') || (d1 <= 5 && d2 <= 5 && d3 <= 5);
      
      const lengthCm = Math.round(isMeters ? d1 * 100 : d1);
      const widthCm = Math.round(isMeters ? d2 * 100 : d2);
      const heightCm = Math.round(isMeters ? d3 * 100 : d3);

      const volumeCalculatedM3 = Math.round(((lengthCm * widthCm * heightCm) / 1000000) * 1000) / 1000;

      return {
        rawStr,
        dimensions: {
          lengthCm,
          widthCm,
          heightCm,
          concreteDensityKgM3: 2400,
        },
        volumeCalculatedM3,
      };
    }
  }

  // Check if it's a 2D dimension (e.g. "80x80") - assume standard height 40cm
  const match2D = rawStr.match(/([\d.,]+)\s*(?:[xX*×,/;-])\s*([\d.,]+)/);
  if (match2D) {
    let d1 = parseFloat(match2D[1].replace(',', '.'));
    let d2 = parseFloat(match2D[2].replace(',', '.'));
    if (!isNaN(d1) && !isNaN(d2) && d1 > 0 && d2 > 0) {
      const isMeters = d1 <= 5 && d2 <= 5;
      const lengthCm = Math.round(isMeters ? d1 * 100 : d1);
      const widthCm = Math.round(isMeters ? d2 * 100 : d2);
      const heightCm = 40;
      const volumeCalculatedM3 = Math.round(((lengthCm * widthCm * heightCm) / 1000000) * 1000) / 1000;

      return {
        rawStr,
        dimensions: {
          lengthCm,
          widthCm,
          heightCm,
          concreteDensityKgM3: 2400,
        },
        volumeCalculatedM3,
      };
    }
  }

  return undefined;
}

/**
 * Parse volume in m3 (e.g. "0.256 m³", "0,8", "1.152")
 */
export function parseVolumMort(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : Math.round(Math.abs(val) * 1000) / 1000;
  }
  const cleanStr = String(val)
    .replace(/m3|m³|litres|l/gi, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? undefined : Math.round(Math.abs(num) * 1000) / 1000;
}

/**
 * Parses a spreadsheet file (Excel .xlsx, .xls, .csv)
 */
export async function parseBatchSpreadsheet(file: File): Promise<SpreadsheetParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validRows: [],
        headersFound: [],
        detectedColumns: {},
        warnings: [],
        error: "El fitxer no conté cap full de càlcul vàlid.",
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawJsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawJsonRows.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validRows: [],
        headersFound: [],
        detectedColumns: {},
        warnings: [],
        error: "El full de càlcul està buit o no conté files de dades.",
      };
    }

    // Extract headers from the first row object keys
    const headersFound = Object.keys(rawJsonRows[0] || {});

    // Flexible column resolution
    let nameCol: string | undefined;
    let coordXCol: string | undefined;
    let coordYCol: string | undefined;
    let depthCol: string | undefined;
    let tamanyCol: string | undefined;
    let volumCol: string | undefined;

    for (const h of headersFound) {
      const norm = normalizeKey(h);

      // Name / Codi
      if (!nameCol && (
        norm === 'name' || norm === 'nom' || norm === 'codi' || norm === 'codibloc' ||
        norm === 'codimort' || norm === 'id' || norm === 'bloc' || norm === 'mort' ||
        norm === 'identificador' || norm === 'code' || norm === 'codidelbloc'
      )) {
        nameCol = h;
      }

      // CoordX (Longitude / UTM X)
      if (!coordXCol && (
        norm === 'coordx' || norm === 'coord_x' || norm === 'x' || norm === 'longitud' ||
        norm === 'longitude' || norm === 'lon' || norm === 'lng' || norm === 'utmx' ||
        norm === 'utm_x' || norm === 'coordenadax' || norm === 'easting'
      )) {
        coordXCol = h;
      }

      // CoordY (Latitude / UTM Y)
      if (!coordYCol && (
        norm === 'coordy' || norm === 'coord_y' || norm === 'y' || norm === 'latitud' ||
        norm === 'latitude' || norm === 'lat' || norm === 'utmy' || norm === 'utm_y' ||
        norm === 'coordenaday' || norm === 'northing'
      )) {
        coordYCol = h;
      }

      // Fondària / Profunditat
      if (!depthCol && (
        norm === 'fondaria' || norm === 'fondaria' || norm === 'profunditat' ||
        norm === 'depth' || norm === 'fons' || norm === 'prof' || norm === 'fondariam' ||
        norm === 'profunditatm' || norm === 'depthm'
      )) {
        depthCol = h;
      }

      // Tamany Mort / Mida / Dimensions
      if (!tamanyCol && (
        norm === 'tamanymort' || norm === 'tamany' || norm === 'mida' || norm === 'midamort' ||
        norm === 'mides' || norm === 'dimensions' || norm === 'dimension' || norm === 'size' ||
        norm === 'tamanybloc' || norm === 'midesbloc' || norm === 'dimensionscm' || norm === 'tamanycm'
      )) {
        tamanyCol = h;
      }

      // Volum Mort / Volum
      if (!volumCol && (
        norm === 'volummort' || norm === 'volum' || norm === 'volume' || norm === 'volumm3' ||
        norm === 'volumm' || norm === 'volumbloc' || norm === 'vol' || norm === 'volumem3'
      )) {
        volumCol = h;
      }
    }

    // Fallback: if Name column is still not found, check if first column contains codes
    if (!nameCol && headersFound.length > 0) {
      nameCol = headersFound[0];
    }

    const detectedColumns = { nameCol, coordXCol, coordYCol, depthCol, tamanyCol, volumCol };
    const warnings: string[] = [];

    if (!nameCol) {
      warnings.push("No s'ha detectat una columna de 'Name' o 'Codi' clara. S'ha utilitzat la primera columna.");
    }
    if (!coordXCol || !coordYCol) {
      warnings.push("No s'han detectat columnes de coordenades completes ('CoordX' / 'CoordY').");
    }
    if (!depthCol) {
      warnings.push("No s'ha detectat la columna de 'Fondària' o 'Profunditat'.");
    }
    if (!tamanyCol && !volumCol) {
      warnings.push("No s'ha detectat columna de 'tamany mort' ni de 'Volum Mort'.");
    }

    // Parse each row
    const validRows: BatchSpreadsheetRow[] = [];

    for (let i = 0; i < rawJsonRows.length; i++) {
      const row = rawJsonRows[i];
      const rawName = nameCol ? String(row[nameCol] || '').trim() : `Bloc_${i + 1}`;
      if (!rawName) continue; // Skip empty rows

      let coordX = coordXCol ? parseCoordinate(row[coordXCol]) : undefined;
      let coordY = coordYCol ? parseCoordinate(row[coordYCol]) : undefined;

      // Coordinate sanity check: if X is ~41-43 and Y is ~2-4, user might have swapped Lat/Lon
      if (coordX !== undefined && coordY !== undefined) {
        if (coordX > 40 && coordX < 44 && coordY >= 0 && coordY <= 5) {
          const temp = coordX;
          coordX = coordY;
          coordY = temp;
        }
      }

      const depthM = depthCol ? parseDepth(row[depthCol]) : undefined;
      
      const tamanyResult = tamanyCol ? parseTamanyMort(row[tamanyCol]) : undefined;
      const volumMortM3 = volumCol ? parseVolumMort(row[volumCol]) : tamanyResult?.volumeCalculatedM3;

      validRows.push({
        rawName,
        name: rawName,
        coordX,
        coordY,
        depthM,
        tamanyMortRaw: tamanyResult?.rawStr || (tamanyCol ? String(row[tamanyCol] || '').trim() : undefined),
        dimensions: tamanyResult?.dimensions,
        volumMortM3,
        rawRowData: row,
      });
    }

    return {
      success: true,
      totalRows: validRows.length,
      validRows,
      headersFound,
      detectedColumns,
      warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      totalRows: 0,
      validRows: [],
      headersFound: [],
      detectedColumns: {},
      warnings: [],
      error: `Error al llegir el full de càlcul: ${err?.message || 'Format no compatible'}`,
    };
  }
}

/**
 * Matches and applies spreadsheet data to batch mort groups
 */
export function applySpreadsheetDataToMortGroups(
  groups: BatchMortGroup[],
  rows: BatchSpreadsheetRow[]
): {
  updatedGroups: BatchMortGroup[];
  matchedCount: number;
  unmatchedGroupCodes: string[];
  unmatchedRowNames: string[];
} {
  const matchedRowNamesSet = new Set<string>();
  const matchedGroupIdsSet = new Set<string>();

  // Helper to normalize strings for comparison
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const updatedGroups = groups.map((group) => {
    const gClean = cleanStr(group.mortCode);

    // 1. Direct clean match
    let matchedRow = rows.find((r) => cleanStr(r.name) === gClean);

    // 2. Substring match (e.g. "BLO-001" in "BLO-001_Foto" or vice-versa)
    if (!matchedRow) {
      matchedRow = rows.find((r) => {
        const rClean = cleanStr(r.name);
        return (
          rClean.length >= 2 &&
          gClean.length >= 2 &&
          (gClean.includes(rClean) || rClean.includes(gClean))
        );
      });
    }

    // 3. Numeric ID match (e.g. "01" vs "MORT_01" or "BLO-001" vs "1")
    if (!matchedRow) {
      const gNums = group.mortCode.match(/\d+/g)?.join('') || '';
      if (gNums) {
        matchedRow = rows.find((r) => {
          const rNums = r.name.match(/\d+/g)?.join('') || '';
          return rNums && (parseInt(rNums, 10) === parseInt(gNums, 10));
        });
      }
    }

    if (!matchedRow) {
      return group;
    }

    matchedRowNamesSet.add(matchedRow.name);
    matchedGroupIdsSet.add(group.id);

    // Apply values from spreadsheet row
    const newDepth = matchedRow.depthM !== undefined ? matchedRow.depthM : group.validatedDepthM;
    const newDimensions = matchedRow.dimensions || group.dimensions;
    const newLatitude = matchedRow.coordY !== undefined ? matchedRow.coordY : group.latitude;
    const newLongitude = matchedRow.coordX !== undefined ? matchedRow.coordX : group.longitude;
    const newCustomVolume = matchedRow.volumMortM3 !== undefined ? matchedRow.volumMortM3 : group.customVolumeM3;

    // Recalculate decision & casuística with updated dimensions/depth
    const result = evaluateDecision(
      group.validatedC1,
      group.validatedC2,
      group.validatedC3,
      group.validatedC4,
      group.validatedUsage,
      group.validatedHasMobileElements,
      false
    );
    const matrix128 = getMatrix128Combination(
      group.validatedC1,
      group.validatedC2 === 'active_erosion_halo' || group.validatedHasMobileElements,
      group.validatedC3,
      group.validatedC4
    );

    return {
      ...group,
      validatedDepthM: newDepth,
      suggestedDepthM: newDepth,
      dimensions: newDimensions,
      latitude: newLatitude,
      longitude: newLongitude,
      customVolumeM3: newCustomVolume,
      hasSpreadsheetData: true,
      spreadsheetData: {
        rawName: matchedRow.rawName,
        coordX: matchedRow.coordX,
        coordY: matchedRow.coordY,
        depthM: matchedRow.depthM,
        tamanyMort: matchedRow.tamanyMortRaw,
        volumMortM3: matchedRow.volumMortM3,
      },
      result,
      matrix128,
    };
  });

  const unmatchedGroupCodes = groups
    .filter((g) => !matchedGroupIdsSet.has(g.id))
    .map((g) => g.mortCode);

  const unmatchedRowNames = rows
    .filter((r) => !matchedRowNamesSet.has(r.name))
    .map((r) => r.name);

  return {
    updatedGroups,
    matchedCount: matchedGroupIdsSet.size,
    unmatchedGroupCodes,
    unmatchedRowNames,
  };
}

/**
 * Generates and downloads an Excel template file for batch loading
 */
export function downloadBatchTemplateExcel() {
  const sampleData = [
    {
      Name: 'BLO-001',
      CoordX: 3.14251,
      CoordY: 41.98234,
      'Fondària': 8.5,
      'tamany mort': '80x80x40',
      'Volum Mort': 0.256,
    },
    {
      Name: 'BLO-002',
      CoordX: 3.14285,
      CoordY: 41.98260,
      'Fondària': 12.0,
      'tamany mort': '100x100x80',
      'Volum Mort': 0.800,
    },
    {
      Name: 'BLO-003',
      CoordX: 3.14310,
      CoordY: 41.98295,
      'Fondària': 6.0,
      'tamany mort': '60x60x40',
      'Volum Mort': 0.144,
    },
    {
      Name: 'BLO-004',
      CoordX: 3.14350,
      CoordY: 41.98320,
      'Fondària': 9.5,
      'tamany mort': '120x120x80',
      'Volum Mort': 1.152,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dades_Morts');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Name
    { wch: 14 }, // CoordX
    { wch: 14 }, // CoordY
    { wch: 12 }, // Fondària
    { wch: 16 }, // tamany mort
    { wch: 14 }, // Volum Mort
  ];

  XLSX.writeFile(workbook, 'Plantilla_Dades_Morts_Batch.xlsx');
}

/**
 * Generates and downloads a CSV template file for batch loading
 */
export function downloadBatchTemplateCSV() {
  const csvContent = [
    'Name,CoordX,CoordY,Fondària,tamany mort,Volum Mort',
    'BLO-001,3.14251,41.98234,8.5,80x80x40,0.256',
    'BLO-002,3.14285,41.98260,12.0,100x100x80,0.800',
    'BLO-003,3.14310,41.98295,6.0,60x60x40,0.144',
    'BLO-004,3.14350,41.98320,9.5,120x120x80,1.152',
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Plantilla_Dades_Morts_Batch.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
