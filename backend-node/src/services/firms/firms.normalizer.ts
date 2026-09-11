import * as crypto from 'crypto';
import { parse as csvParse } from 'csv-parse/sync';
import { FIRMSObservation } from './firms.types';

const VIIRS_CONFIDENCE_MAP: Record<string, number> = {
  l: 30.0,
  n: 65.0,
  h: 90.0,
};

function classifyIndiaHotspot(lat: number, lon: number, brightness: number, confidence: number, typeCol?: any): string {
  return 'unknown';
}

function deriveSeverity(brightness: number, confidence: number): string {
  const score = brightness * 0.7 + confidence * 3.0;
  if (score >= 340 * 0.7 + 85 * 3.0) return 'critical';
  if (score >= 320 * 0.7 + 70 * 3.0) return 'high';
  if (score >= 295 * 0.7 + 50 * 3.0) return 'medium';
  return 'low';
}

function isInsideIndia(lat: number, lon: number): boolean {
  if (!(lat >= 6.0 && lat <= 37.1 && lon >= 68.0 && lon <= 97.4)) return false;
  if (lat < 10.0 && lon > 79.5) return false;
  if (lon < 68.1) return false;
  if (lat < 24.0 && lon < 68.1) return false;
  if (lat >= 24.0 && lat < 28.0 && lon < 70.0) return false;
  if (lat >= 28.0 && lat < 30.5 && lon < 73.5) return false;
  if (lat >= 30.5 && lat < 32.5 && lon < 74.55) return false;
  if (lat >= 32.5 && lon < 73.8) return false;
  if (lat >= 27.3 && lat <= 30.5 && lon >= 80.0 && lon <= 88.2) return false;
  if (lat > 20.6 && lat < 26.6 && lon > 88.0 && lon < 92.6) {
    const isWb = lon <= 88.8 || lat <= 21.8;
    const isTripura = lat >= 22.8 && lat <= 24.6 && lon >= 91.1 && lon <= 92.4;
    const isMeghalaya = lat >= 25.0 && lat <= 26.1 && lon >= 89.8 && lon <= 92.8;
    const isAssam = lat >= 25.8;
    if (!(isWb || isTripura || isMeghalaya || isAssam)) return false;
  }
  if (lon > 97.4) return false;
  if (lat < 22.0 && lon > 93.0) {
    const isAn = lat >= 6.5 && lat <= 14.0 && lon >= 92.0 && lon <= 94.5;
    if (!isAn) return false;
  }
  return true;
}

export function makeStableId(source: string, lat: number, lon: number, acqDate: string, acqTime: string): string {
  // Use exact .4f equivalent in JS formatting
  const latStr = lat.toFixed(4);
  const lonStr = lon.toFixed(4);
  const key = `${source}|${latStr}|${lonStr}|${acqDate}|${acqTime}`;
  const digest = crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  return `FIRMS-${digest}`;
}

function parseAcqDatetime(acqDate: string, acqTime: string): Date {
  const paddedTime = acqTime.padStart(4, '0');
  const hh = paddedTime.substring(0, 2);
  const mm = paddedTime.substring(2, 4);
  const dtStr = `${acqDate}T${hh}:${mm}:00Z`;
  return new Date(dtStr);
}

function normalizeViirsRow(row: any, source: string): FIRMSObservation | null {
  try {
    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    const brightness = parseFloat(row.bright_ti4 || row.bright_412 || '0');
    const acqDate = (row.acq_date || '').trim();
    const acqTime = (row.acq_time || '').trim();
    const confidenceRaw = (row.confidence || 'n').trim().toLowerCase();

    let confidence = parseFloat(confidenceRaw);
    if (isNaN(confidence)) {
      confidence = VIIRS_CONFIDENCE_MAP[confidenceRaw] || 65.0;
    }

    const typeCol = row.type;
    const typeVal = classifyIndiaHotspot(lat, lon, brightness, confidence, typeCol);

    const frpRaw = row.frp;
    const frpVal = frpRaw ? parseFloat(frpRaw) : null;

    if (!isInsideIndia(lat, lon)) return null;
    if (brightness <= 0) return null;

    return {
      id: makeStableId(source, lat, lon, acqDate, acqTime),
      latitude: lat,
      longitude: lon,
      brightness,
      confidence,
      type: typeVal,
      severity: deriveSeverity(brightness, confidence),
      timestamp: parseAcqDatetime(acqDate, acqTime),
      facility_id: null,
      status: 'active',
      country: 'India',
      state: null,
      city: null,
      district: null,
      source,
      frp: frpVal,
    };
  } catch (err) {
    console.debug(`Skipping VIIRS row (parse error):`, err);
    return null;
  }
}

function normalizeModisRow(row: any, source: string): FIRMSObservation | null {
  try {
    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    const brightness = parseFloat(row.brightness || '0');
    const acqDate = (row.acq_date || '').trim();
    const acqTime = (row.acq_time || '').trim();
    let confidence = parseFloat(row.confidence || '50');

    const typeCol = row.type;
    const typeVal = classifyIndiaHotspot(lat, lon, brightness, confidence, typeCol);

    const frpRaw = row.frp;
    const frpVal = frpRaw ? parseFloat(frpRaw) : null;

    if (!isInsideIndia(lat, lon)) return null;
    if (brightness <= 0) return null;

    confidence = Math.min(confidence, 100.0);

    return {
      id: makeStableId(source, lat, lon, acqDate, acqTime),
      latitude: lat,
      longitude: lon,
      brightness,
      confidence,
      type: typeVal,
      severity: deriveSeverity(brightness, confidence),
      timestamp: parseAcqDatetime(acqDate, acqTime),
      facility_id: null,
      status: 'active',
      country: 'India',
      state: null,
      city: null,
      district: null,
      source,
      frp: frpVal,
    };
  } catch (err) {
    console.debug(`Skipping MODIS row (parse error):`, err);
    return null;
  }
}

export function parseFirmsCsv(csvText: string, source: string): FIRMSObservation[] {
  const records: FIRMSObservation[] = [];
  if (!csvText || !csvText.trim()) return records;

  const firstLine = csvText.trim().split('\n')[0];
  if (firstLine.startsWith('{') || firstLine.toLowerCase().includes('error')) {
    console.warn(`FIRMS returned a non-CSV response: ${firstLine.substring(0, 200)}`);
    return records;
  }

  const rows = csvParse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  const isModis = source.startsWith('MODIS');
  const normalizer = isModis ? normalizeModisRow : normalizeViirsRow;

  let skipped = 0;
  for (const row of rows) {
    const normalized = normalizer(row, source);
    if (normalized === null) {
      skipped++;
      continue;
    }
    records.push(normalized);
  }

  console.log(`FIRMS parse: source=${source} total=${records.length + skipped} skipped=${skipped}`);
  return records;
}
