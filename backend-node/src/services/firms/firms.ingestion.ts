import axios from 'axios';
import { PoolClient } from 'pg';
import { db } from '../../db/postgres';
import { FIRMSClient, INDIA_BBOX } from './firms.client';
import { parseFirmsCsv } from './firms.normalizer';
import { FIRMSSourceSummary, FIRMSIngestSummary, FIRMSObservation, MLPredictionOutput } from './firms.types';

const MAX_RECORDS_PER_SOURCE = 5000;
const SQL_BATCH_SIZE = 500;

export class FIRMSIngestionService {
  private client: FIRMSClient;

  constructor() {
    this.client = new FIRMSClient();
  }

  async ingest(
    source = 'VIIRS_SNPP_NRT',
    bbox = INDIA_BBOX,
    days = 1
  ): Promise<FIRMSSourceSummary> {
    console.log(`FIRMS ingest started: source=${source} bbox=${bbox} days=${days}`);

    let csvText: string;
    try {
      csvText = await this.client.fetchCsv(source, bbox, days);
    } catch (error) {
      console.error(`FIRMS fetch failed:`, error);
      throw error;
    }

    const records = parseFirmsCsv(csvText, source);
    const fetched = records.length;
    console.log(`FIRMS parse complete: ${fetched} records`);

    if (fetched === 0) {
      return { source, fetched: 0, inserted: 0, skipped: 0, errors: 0 };
    }

    const capped = records.slice(0, MAX_RECORDS_PER_SOURCE);
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < capped.length; i += SQL_BATCH_SIZE) {
      const batch = capped.slice(i, i + SQL_BATCH_SIZE);
      const [batchInserted, batchSkipped] = await this.upsertBatch(batch);
      inserted += batchInserted;
      skipped += batchSkipped;
    }

    console.log(`FIRMS ingest complete: fetched=${fetched} inserted=${inserted} skipped=${skipped}`);
    return { source, fetched, inserted, skipped, errors: 0 };
  }

  async ingestAllSources(
    sources: string[],
    bbox = INDIA_BBOX,
    days = 5
  ): Promise<FIRMSIngestSummary> {
    console.log(`FIRMS multi-source ingest started: sources=${sources.join(',')} bbox=${bbox} days=${days}`);

    const perSourceResults: FIRMSSourceSummary[] = [];
    const errorRecords: { source: string; error: string }[] = [];

    for (const source of sources) {
      try {
        const result = await this.ingest(source, bbox, days);
        perSourceResults.push(result);
        console.log(`Source ${source}: fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}`);
      } catch (error: any) {
        console.error(`FIRMS source ${source} failed (continuing with remaining sources):`, error);
        errorRecords.push({ source, error: error.message || String(error) });
      }
    }

    const totalFetched = perSourceResults.reduce((sum, r) => sum + r.fetched, 0);
    const totalInserted = perSourceResults.reduce((sum, r) => sum + r.inserted, 0);
    const totalSkipped = perSourceResults.reduce((sum, r) => sum + r.skipped, 0);

    const summary: FIRMSIngestSummary = {
      sources_attempted: sources.length,
      sources_succeeded: perSourceResults.length,
      sources_failed: errorRecords.length,
      total_fetched: totalFetched,
      total_inserted: totalInserted,
      total_skipped: totalSkipped,
      bbox,
      days,
      per_source: perSourceResults,
      errors: errorRecords,
    };

    console.log(`FIRMS multi-source ingest complete: attempted=${sources.length} succeeded=${perSourceResults.length} failed=${errorRecords.length} total_fetched=${totalFetched} total_inserted=${totalInserted} total_skipped=${totalSkipped}`);
    return summary;
  }

  private async upsertBatch(records: FIRMSObservation[]): Promise<[number, number]> {
    if (records.length === 0) return [0, 0];

    const client: PoolClient = await db.connect();
    let inserted = 0;

    try {
      await client.query('BEGIN');

      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

      for (const record of records) {
        let mlType = 'unknown';
        let mlConfidence = 0.0;
        let modelVersion = 'thermalwatch-v1';
        let mlExplanation: any = null;

        try {
          const mlPayload = {
            latitude: record.latitude,
            longitude: record.longitude,
            timestamp: record.timestamp.toISOString(),
            frp: record.frp,
          };
          const mlResp = await axios.post<MLPredictionOutput>(`${mlServiceUrl}/predict`, mlPayload, { timeout: 10000 });
          mlType = mlResp.data.ml_type || mlResp.data.mlType || 'unknown';
          mlConfidence = mlResp.data.ml_confidence !== undefined ? mlResp.data.ml_confidence : (mlResp.data.mlConfidence || 0.0);
          modelVersion = mlResp.data.model_version || mlResp.data.modelVersion || 'thermalwatch-v1';
          mlExplanation = mlResp.data.ml_explanation || mlResp.data.mlExplanation || null;
        } catch (mlErr: any) {
          console.error(`ML inference failed for observation ${record.id} (fallback to unknown):`, mlErr.message);
          mlExplanation = { error: mlErr.message || String(mlErr) };
        }

        const upsertSql = `
          INSERT INTO hotspots (
            id, latitude, longitude, type, brightness, confidence,
            severity, timestamp, facility_id, status,
            country, state, city, district, source, geometry,
            ml_type, ml_confidence, model_version, ml_explanation, frp,
            land_cover_class, land_cover_name
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            ST_SetSRID(ST_MakePoint($16, $17), 4326),
            $18, $19, $20, $21, $22,
            $23, $24
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING id;
        `;

        const values = [
          record.id, record.latitude, record.longitude, record.type, record.brightness, record.confidence,
          record.severity, record.timestamp, record.facility_id, record.status,
          record.country, record.state, record.city, record.district, record.source,
          record.longitude, record.latitude,
          mlType, mlConfidence, modelVersion, mlExplanation ? JSON.stringify(mlExplanation) : null, record.frp,
          null, null // Land cover skipping for parity simplicity unless explicitly required
        ];

        const res = await client.query(upsertSql, values);
        if (res.rowCount && res.rowCount > 0) {
          inserted += 1;

          const sev = record.severity || 'info';
          if (['warning', 'critical'].includes(sev) || ['industrial_thermal_source', 'mining_thermal_source', 'natural_fire'].includes(mlType)) {
            const alertId = `ALT-${record.id}`;
            const titleLabel = mlType === 'industrial_thermal_source' ? 'Predicted Industrial Source' : 'High Thermal Anomaly Detected';
            const stateStr = record.state || 'India';
            const msg = `${titleLabel} at ${stateStr} (${record.latitude}, ${record.longitude}) with confidence ${record.confidence}%.`;

            const alertSql = `
              INSERT INTO alerts (id, hotspot_id, facility_id, severity, title, message, timestamp, acknowledged)
              VALUES ($1, $2, $3, $4, $5, $6, $7, false)
              ON CONFLICT (id) DO NOTHING;
            `;
            const alertValues = [
              alertId, record.id, record.facility_id,
              ['critical', 'warning', 'info'].includes(sev) ? sev : 'warning',
              titleLabel, msg, record.timestamp
            ];
            await client.query(alertSql, alertValues);
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const skipped = records.length - inserted;
    return [inserted, skipped];
  }
}
