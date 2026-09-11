const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const BATCH_CONCURRENCY = 5;

async function predictRecord(row) {
  const payload = {
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    timestamp: row.timestamp.toISOString(),
    frp: row.frp ? parseFloat(row.frp) : null,
  };

  const res = await axios.post(`${ML_SERVICE_URL}/predict`, payload, { timeout: 15000 });
  return res.data;
}

async function main() {
  console.log('=== THERMALTRACE HISTORICAL REPROCESSING START ===');
  console.log(`ML Service Target: ${ML_SERVICE_URL}`);

  // Fetch all affected records from Sep 5 to Sep 9 where ml_type = 'unknown'
  const selectQuery = `
    SELECT id, latitude, longitude, timestamp, frp, ml_type, ml_confidence
    FROM hotspots
    WHERE timestamp >= '2026-09-05T00:00:00Z'
      AND timestamp <= '2026-09-09T23:59:59Z'
      AND ml_type = 'unknown'
    ORDER BY timestamp ASC;
  `;

  const { rows } = await pool.query(selectQuery);
  console.log(`Found ${rows.length} affected records with ml_type = 'unknown' from Sep 5-9.`);

  const beforeCounts = {};
  const afterCounts = {};
  let reclassifiedCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_CONCURRENCY) {
    const chunk = rows.slice(i, i + BATCH_CONCURRENCY);

    await Promise.all(
      chunk.map(async (row) => {
        const beforeType = row.ml_type || 'unknown';
        beforeCounts[beforeType] = (beforeCounts[beforeType] || 0) + 1;

        try {
          const pred = await predictRecord(row);
          const newMlType = pred.ml_type || pred.mlType || 'unknown';
          const newConfidence = pred.ml_confidence !== undefined ? pred.ml_confidence : (pred.mlConfidence || 0.0);
          const newModelVersion = pred.model_version || pred.modelVersion || 'thermalwatch-v1';
          const newExplanation = pred.ml_explanation || pred.mlExplanation || null;

          afterCounts[newMlType] = (afterCounts[newMlType] || 0) + 1;

          if (newMlType !== beforeType) {
            reclassifiedCount++;
          } else {
            unchangedCount++;
          }

          // Update row in PostgreSQL with fresh ML inference output
          await pool.query(
            `
            UPDATE hotspots
            SET ml_type = $1,
                ml_confidence = $2,
                model_version = $3,
                ml_explanation = $4
            WHERE id = $5;
          `,
            [newMlType, newConfidence, newModelVersion, newExplanation ? JSON.stringify(newExplanation) : null, row.id]
          );
        } catch (err) {
          errorCount++;
          console.error(`Error reprocessing ID ${row.id}:`, err.message);
        }
      })
    );

    const processedSoFar = Math.min(i + BATCH_CONCURRENCY, rows.length);
    if (processedSoFar % 100 < BATCH_CONCURRENCY || processedSoFar === rows.length) {
      console.log(
        `Processed ${processedSoFar}/${rows.length} records (reclassified: ${reclassifiedCount}, unchanged: ${unchangedCount}, errors: ${errorCount})...`
      );
    }
  }

  console.log('\n=== REPROCESSING SUMMARY ===');
  console.log('Total Processed:', rows.length);
  console.log('Reclassified:', reclassifiedCount);
  console.log('Unchanged:', unchangedCount);
  console.log('Errors:', errorCount);
  console.log('Before Distribution:', beforeCounts);
  console.log('After Distribution:', afterCounts);
  console.log('=== THERMALTRACE HISTORICAL REPROCESSING COMPLETE ===');

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal Reprocessing Error:', err);
  process.exit(1);
});
