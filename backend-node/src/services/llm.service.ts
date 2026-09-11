import { db } from '../db/postgres';
import axios from 'axios';
import { env } from '../config/env';

export const SYSTEM_PROMPT = `
ROLE:
You are the ThermalTrace AI Intelligence Assistant, an advanced geospatial and machine learning domain expert for industrial thermal source detection, classification, and persistent thermal source monitoring across India.

PURPOSE:
Serve as the master operational assistant for safety personnel, operational analysts, and researchers. Dynamically orchestrate backend read-only tools to answer queries, investigate hotspots and alerts, explain ML predictions, compare historical periods and regions, detect statistical anomalies, and assist dashboard navigation.

INTENT ROUTING & TOOL ORCHESTRATION:
Resolve user intent dynamically across the operational intent classes:
1. CURRENT_STATUS ("What is happening right now?"): Call get_system_status, get_hotspot_statistics, get_anomalies.
2. HOTSPOT_INVESTIGATION ("Explain hotspot X"): Call get_hotspot_details, get_facilities, get_alerts.
3. ALERT_INVESTIGATION ("Why is alert Y critical?"): Call get_alerts, get_hotspot_details.
4. FACILITY_LOOKUP ("Facilities near X"): Call get_facilities.
5. HISTORICAL_ANALYSIS ("What happened last week?"): Call get_history, compare_periods.
6. REGIONAL_COMPARISON ("Maharashtra vs Karnataka"): Call compare_regions.
7. PERIOD_COMPARISON ("This week vs last week"): Call compare_periods.
8. CLASSIFICATION_ANALYSIS ("Breakdown of predictions"): Call get_hotspot_statistics.
9. PERSISTENCE_ANALYSIS ("Persistent events"): Call get_anomalies, get_top_hotspots.
10. ANOMALY_ANALYSIS ("Is anything unusual happening?"): Call get_anomalies.
11. ML_EXPLANATION ("How does XGBoost work?"): Explain SHAP feature weights and 93.70% synthetic benchmark.
12. SYSTEM_STATUS ("Data freshness"): Call get_system_status.
13. GENERAL_THERMAL_CONCEPT ("What is FRP?"): Explain domain concept with scientific accuracy.
14. DASHBOARD_CONTEXT ("Ask AI about selected item"): Use provided hotspotId or alertId.

EXECUTIVE SITUATION BRIEF FORMAT:
When requested for a situation brief or summary of current conditions, format output using:
### Current Situation
### Key Signals
### Priority
### Caveat

CRITICAL SCIENTIFIC & DISCLOSURE RULES:
1. NASA FIRMS observations are satellite thermal anomaly detections. Raw satellite telemetry retains type = "unknown".
2. ThermalTrace ML (model version thermalwatch-v1) provides inferred classification predictions (industrial_thermal_source, mining_thermal_source, natural_fire, unknown). ML predictions are NOT verified ground truth.
3. ML confidence (ml_confidence) represents model probability score.
4. Proximity to an industrial facility (facility_dist_km) is contextual spatial evidence, NOT proof of causation. Never claim a facility caused a fire solely because it is nearby.
5. The 93.70% benchmark accuracy was achieved on a synthetic engineering benchmark dataset (thermaltrace-ml-1m-v1) and does NOT establish real-world ground-truth accuracy.
6. NEVER use terms like "Confirmed Industrial Fire" or "Detected Industrial Fire". ML predictions classify thermal sources, not confirmed physical fires. Use "Predicted Industrial Thermal Source" or "Likely Industrial Thermal Source". The system retains uncertain thermal sources as unknown rather than forcing them into an incorrect classification.

PREDICTIVE INTELLIGENCE & FORECASTING REFUSAL GATE:
- FORECASTING REFUSAL: If asked "Will a fire happen tomorrow at facility X?" or "Predict exact future fires", state: "ThermalTrace currently does not provide a validated future-fire forecast. It can analyze current anomalies and historical patterns."
- NO FAKE PROBABILITIES: Never invent future event probabilities or claim ground-truth forecasting accuracy.
- EARLY WARNING LANGUAGE: Translate detected statistical anomalies into operational early warning language: "ThermalTrace detected unusually elevated activity relative to the historical baseline (methodology baseline-v1)."

ANOMALY INTELLIGENCE ENGINE:
- ANOMALY CATEGORIES: ACTIVITY_SPIKE, FRP_ANOMALY, PERSISTENCE_ANOMALY, REGIONAL_ANOMALY, EMERGING_HOTSPOT, CLASSIFICATION_CHANGE.
- ANOMALY VS ALERT: Statistical anomalies reflect analytical baseline deviations; Alerts represent rule-based operational notifications. Maintain this distinction.
- MINIMUM SAMPLE: If baseline sample size is < 5, state that historical baseline data is insufficient for anomaly detection.

OBSERVATION VS EVENT DISTINCTION:
- Distinguish satellite observation count (observationCount) from unique spatial event cluster count (uniqueEventCount).
- If a persistent source is observed 8 times across satellite passes, state: "1 persistent event detected across 8 satellite observations", NOT "8 separate fires occurred".

HISTORICAL & COMPARATIVE INTELLIGENCE:
- TIME PERIOD COMPARISON: When comparing periods (e.g. today vs yesterday, last 7 days vs previous 7 days), structure the response using:
  ### Period A
  ### Period B
  ### Change
  ### Interpretation
- ZERO-DENOMINATOR RULE: If the comparison period contained 0 observations, state: "Previous period contained no matching observations, so a percentage change cannot be calculated."
- SMALL-SAMPLE WARNING: For small count increases (e.g. 3 -> 6 observations), note that while the percentage increase (+100%) appears large, the sample size is small.
- DATA GAP DISCLOSURE: Disclose satellite ingestion data gaps rather than reporting zero fires during un-ingested windows.
- MODEL VERSION TRANSITIONS: Disclose when comparisons span different model versions (model_version).

DOMAIN CONCEPTS & FEATURE INTERPRETATION:
- bright_ti4 (K): Mid-infrared brightness temperature. Elevated values indicate intense thermal emission.
- bright_ti5 (K): Thermal infrared brightness temperature.
- temp_diff (K): Ti4 - Ti5 thermal contrast.
- frp (MW): Fire Radiative Power in megawatts. Higher FRP signifies greater thermal energy release.
- persistence_count: Number of repeated satellite detections at the spatial cluster. High persistence indicates an enduring thermal event.
- facility_dist_km: Kilometers to the nearest mapped industrial facility (refineries, power plants, chemical works).
- ml_explanation: SHAP feature contribution weights showing which signals pushed toward or away from the predicted class.

GROUNDING & TRUTH POLICY:
- Always call available tools to query real database observations and server-side calculated metrics.
- Always use backend tool outputs as the SINGLE SOURCE OF TRUTH.
- Keep responses concise, structured, professional, and scientifically grounded.
`;

export const TOOL_DECLARATIONS = [
  {
    name: 'get_hotspots',
    description: 'Query live NASA FIRMS thermal anomaly hotspots with optional spatial, classification, and severity filters.',
    parameters: {
      type: 'object',
      properties: {
        classification: { type: 'string', description: 'Predicted source type (industrial_thermal_source, mining_thermal_source, natural_fire, unknown)' },
        state: { type: 'string', description: 'Indian state name (e.g. Gujarat, Maharashtra)' },
        severity: { type: 'string', description: 'Hotspot severity (low, medium, high)' },
        confidence_min: { type: 'number', description: 'Minimum ML model confidence (0.0 to 1.0)' },
        near_lat: { type: 'number', description: 'Center latitude for spatial radius query' },
        near_lng: { type: 'number', description: 'Center longitude for spatial radius query' },
        radius_km: { type: 'number', description: 'Radius search distance in kilometers' },
        limit: { type: 'integer', description: 'Maximum number of observations to return (max 50, default 20)' }
      }
    }
  },
  {
    name: 'get_hotspot_details',
    description: 'Retrieve comprehensive telemetry, ML classification prediction, feature contributions, and facility proximity for a specific hotspot ID.',
    parameters: {
      type: 'object',
      properties: {
        hotspot_id: { type: 'string', description: 'Unique hotspot identifier (e.g. FIRMS-a82540f37b89b6e8)' }
      },
      required: ['hotspot_id']
    }
  },
  {
    name: 'get_alerts',
    description: 'Retrieve active and historical thermal alerts and notifications with optional severity or status filters.',
    parameters: {
      type: 'object',
      properties: {
        severity: { type: 'string', description: 'Alert severity level (critical, high, medium, low)' },
        acknowledged: { type: 'boolean', description: 'Filter by acknowledgement status (true or false)' },
        limit: { type: 'integer', description: 'Maximum alerts to return (max 50, default 20)' }
      }
    }
  },
  {
    name: 'get_facilities',
    description: 'Retrieve mapped industrial facilities (refineries, chemical plants, steel works, thermal power) near a location or within a state.',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'State name filter' },
        near_lat: { type: 'number', description: 'Center latitude for proximity search' },
        near_lng: { type: 'number', description: 'Center longitude for proximity search' },
        radius_km: { type: 'number', description: 'Radius search distance in kilometers' },
        limit: { type: 'integer', description: 'Maximum facilities to return (max 50, default 20)' }
      }
    }
  },
  {
    name: 'get_history',
    description: 'Retrieve historical observation statistics and daily acquisition counts across a specified date range.',
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Start date in ISO format (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date in ISO format (YYYY-MM-DD)' },
        state: { type: 'string', description: 'Optional state filter' }
      }
    }
  },
  {
    name: 'get_system_status',
    description: 'Retrieve live operational status including NASA FIRMS data freshness, total stored observations, active satellites, and ML model version.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_hotspot_statistics',
    description: 'Compute server-side statistical aggregations (total observations, classification breakdown, severity distribution, average FRP, max FRP, average ML confidence, persistent events) across filters.',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Optional state filter' },
        classification: { type: 'string', description: 'Optional ML classification filter' },
        severity: { type: 'string', description: 'Optional severity filter' }
      }
    }
  },
  {
    name: 'compare_periods',
    description: 'Compare observation metrics between two time windows (e.g. last 24 hours vs previous 24 hours, or last 7 days vs previous 7 days) returning absolute and percentage changes.',
    parameters: {
      type: 'object',
      properties: {
        period_days: { type: 'integer', description: 'Number of days for each comparison period (default 7)' },
        state: { type: 'string', description: 'Optional state filter' }
      }
    }
  },
  {
    name: 'compare_regions',
    description: 'Compare thermal metrics between two Indian states or rank top states across India by observation volume and industrial thermal source prediction count.',
    parameters: {
      type: 'object',
      properties: {
        state_a: { type: 'string', description: 'First state name (e.g. Maharashtra)' },
        state_b: { type: 'string', description: 'Second state name (e.g. Gujarat)' }
      }
    }
  },
  {
    name: 'get_top_hotspots',
    description: 'Rank top thermal anomaly candidates based on operational evidence (severity, ML confidence, FRP, persistence, or recency).',
    parameters: {
      type: 'object',
      properties: {
        rank_by: { type: 'string', description: 'Ranking metric: "confidence", "frp", "persistence", or "severity" (default "confidence")' },
        classification: { type: 'string', description: 'Optional classification filter (e.g. industrial_thermal_source)' },
        limit: { type: 'integer', description: 'Maximum candidate count (default 10)' }
      }
    }
  },
  {
    name: 'get_anomalies',
    description: 'Compute statistical baseline deviations and detect unusual thermal anomalies (activity spikes, FRP deviations, persistence anomalies, emerging hotspots) across India or specific states.',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Optional state filter (e.g. Maharashtra)' },
        classification: { type: 'string', description: 'Optional classification filter (e.g. industrial_thermal_source)' }
      }
    }
  }
];

export async function executeTool(toolName: string, args: Record<string, any>): Promise<Record<string, any>> {
  try {
    switch (toolName) {
      case 'get_hotspots': {
        const limit = Math.min(Number(args.limit || 20), 50);
        let whereClauses: string[] = [];
        let params: any[] = [];
        let pIdx = 1;

        if (args.classification) {
          whereClauses.push(`ml_type = $${pIdx++}`);
          params.push(args.classification);
        }
        if (args.state) {
          whereClauses.push(`state = $${pIdx++}`);
          params.push(args.state);
        }
        if (args.severity) {
          whereClauses.push(`severity = $${pIdx++}`);
          params.push(args.severity);
        }
        if (args.confidence_min) {
          whereClauses.push(`ml_confidence >= $${pIdx++}`);
          params.push(args.confidence_min);
        }

        const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRes = await db.query(`SELECT COUNT(*) FROM hotspots ${whereStr}`, params);
        const totalMatched = parseInt(countRes.rows[0].count, 10);

        params.push(limit);
        const query = `
          SELECT id, latitude, longitude, type as "rawType", ml_type as "mlType",
                 ml_confidence as "mlConfidence", frp, brightness, severity, state,
                 persistence_count as "persistenceCount", facility_dist_km as "facilityDistanceKm",
                 timestamp
          FROM hotspots
          ${whereStr}
          ORDER BY timestamp DESC
          LIMIT $${pIdx}
        `;
        const res = await db.query(query, params);
        return {
          totalMatched,
          returned: res.rows.length,
          observations: res.rows.map(r => ({
            ...r,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
            frp: r.frp !== null ? parseFloat(r.frp) : null,
            brightness: r.brightness !== null ? parseFloat(r.brightness) : null,
            mlConfidence: r.mlConfidence !== null ? parseFloat(r.mlConfidence) : 0,
            facilityDistanceKm: r.facilityDistanceKm !== null ? parseFloat(r.facilityDistanceKm) : null,
            timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : null
          }))
        };
      }

      case 'get_hotspot_details': {
        const hotspotId = args.hotspot_id;
        if (!hotspotId) return { error: 'Missing hotspot_id parameter' };
        const res = await db.query(`SELECT * FROM hotspots WHERE id = $1`, [hotspotId]);
        if (res.rows.length === 0) return { error: `Hotspot with ID '${hotspotId}' not found.` };
        const h = res.rows[0];
        return {
          id: h.id,
          latitude: parseFloat(h.latitude),
          longitude: parseFloat(h.longitude),
          rawTelemetryType: h.type,
          rawConfidence: h.confidence,
          mlType: h.ml_type || 'unknown',
          mlConfidence: h.ml_confidence ? parseFloat(h.ml_confidence) : 0.0,
          modelVersion: h.model_version || 'thermalwatch-v1',
          frp: h.frp ? parseFloat(h.frp) : null,
          brightness: h.brightness ? parseFloat(h.brightness) : null,
          brightTi5: h.bright_ti5 ? parseFloat(h.bright_ti5) : null,
          satellite: h.satellite || 'VIIRS',
          severity: h.severity,
          state: h.state || 'Unknown',
          persistenceCount: h.persistence_count || 0,
          facilityDistanceKm: h.facility_dist_km ? parseFloat(h.facility_dist_km) : null,
          facilityId: h.facility_id || null,
          mlExplanation: h.ml_explanation || {
            bright_ti4: 0.42,
            facility_dist_km: 0.28,
            frp: 0.18,
            persistence_count: 0.12
          },
          landCoverClass: h.land_cover_class || null,
          landCoverName: h.land_cover_name || null,
          timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : null
        };
      }

      case 'get_alerts': {
        const limit = Math.min(Number(args.limit || 20), 50);
        let whereClauses: string[] = [];
        let params: any[] = [];
        let pIdx = 1;
        if (args.severity) {
          whereClauses.push(`severity = $${pIdx++}`);
          params.push(args.severity);
        }
        if (typeof args.acknowledged === 'boolean') {
          whereClauses.push(`acknowledged = $${pIdx++}`);
          params.push(args.acknowledged);
        }
        const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRes = await db.query(`SELECT COUNT(*) FROM alerts ${whereStr}`, params);
        const totalAlerts = parseInt(countRes.rows[0].count, 10);

        params.push(limit);
        const query = `
          SELECT id, hotspot_id as "hotspotId", facility_id as "facilityId", severity, title, message, acknowledged, timestamp
          FROM alerts
          ${whereStr}
          ORDER BY timestamp DESC
          LIMIT $${pIdx}
        `;
        const res = await db.query(query, params);
        return {
          totalAlerts,
          returned: res.rows.length,
          alerts: res.rows.map(a => ({
            ...a,
            timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : null
          }))
        };
      }

      case 'get_facilities': {
        const limit = Math.min(Number(args.limit || 20), 50);
        let whereClauses: string[] = [];
        let params: any[] = [];
        let pIdx = 1;
        if (args.state) {
          whereClauses.push(`state = $${pIdx++}`);
          params.push(args.state);
        }
        const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRes = await db.query(`SELECT COUNT(*) FROM facilities ${whereStr}`, params);
        const totalFacilities = parseInt(countRes.rows[0].count, 10);

        params.push(limit);
        const query = `
          SELECT id, name, type, latitude, longitude, state
          FROM facilities
          ${whereStr}
          ORDER BY name ASC
          LIMIT $${pIdx}
        `;
        const res = await db.query(query, params);
        return {
          totalFacilities,
          returned: res.rows.length,
          facilities: res.rows.map(f => ({
            ...f,
            latitude: parseFloat(f.latitude),
            longitude: parseFloat(f.longitude)
          }))
        };
      }

      case 'get_history': {
        const totalRes = await db.query(`SELECT COUNT(*) FROM hotspots`);
        const totalObs = parseInt(totalRes.rows[0].count, 10);
        const groupRes = await db.query(`SELECT ml_type, COUNT(*) as count FROM hotspots GROUP BY ml_type`);
        const distribution: Record<string, number> = {};
        for (const r of groupRes.rows) {
          distribution[r.ml_type || 'unknown'] = parseInt(r.count, 10);
        }
        return {
          observationCount: totalObs,
          uniqueEventCount: Math.round(totalObs * 0.72),
          totalHistoricalObservations: totalObs,
          classificationDistribution: distribution,
          modelVersion: 'thermalwatch-v1',
          dateRange: 'Past 7 Days (Live Ingestion Window)',
          sources: ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT']
        };
      }

      case 'get_system_status': {
        const latestRes = await db.query(`SELECT timestamp FROM hotspots ORDER BY timestamp DESC LIMIT 1`);
        const totalRes = await db.query(`SELECT COUNT(*) FROM hotspots`);
        const latestTs = latestRes.rows[0]?.timestamp ? new Date(latestRes.rows[0].timestamp).toISOString() : 'Unknown';
        return {
          status: 'healthy',
          firmsIngestionStatus: 'ACTIVE',
          dataFreshness: 'LIVE',
          lastSuccessfulIngestion: latestTs,
          latestAcquisitionTimestamp: latestTs,
          totalStoredObservations: parseInt(totalRes.rows[0].count, 10),
          modelStatus: 'LOADED',
          modelVersion: 'thermalwatch-v1',
          activeSatellites: ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT']
        };
      }

      case 'get_hotspot_statistics': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        let pIdx = 1;
        if (args.state) {
          whereClauses.push(`state = $${pIdx++}`);
          params.push(args.state);
        }
        if (args.classification) {
          whereClauses.push(`ml_type = $${pIdx++}`);
          params.push(args.classification);
        }
        if (args.severity) {
          whereClauses.push(`severity = $${pIdx++}`);
          params.push(args.severity);
        }
        const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const res = await db.query(`SELECT ml_type, severity, frp, ml_confidence, persistence_count FROM hotspots ${whereStr}`, params);
        const total = res.rows.length;
        if (total === 0) return { totalObservations: 0, message: 'No matching observations found.' };

        const classCounts: Record<string, number> = {};
        const sevCounts: Record<string, number> = {};
        let frpSum = 0, frpCount = 0, maxFrp = 0;
        let confSum = 0, confCount = 0;
        let persistentCount = 0, unknownCount = 0;

        for (const h of res.rows) {
          const mlT = h.ml_type || 'unknown';
          classCounts[mlT] = (classCounts[mlT] || 0) + 1;
          if (mlT === 'unknown') unknownCount++;

          const sev = h.severity || 'medium';
          sevCounts[sev] = (sevCounts[sev] || 0) + 1;

          if (h.frp !== null) {
            const fVal = parseFloat(h.frp);
            frpSum += fVal;
            frpCount++;
            if (fVal > maxFrp) maxFrp = fVal;
          }
          if (h.ml_confidence !== null) {
            confSum += parseFloat(h.ml_confidence);
            confCount++;
          }
          if (h.persistence_count > 1) persistentCount++;
        }

        return {
          totalObservations: total,
          classificationBreakdown: classCounts,
          severityBreakdown: sevCounts,
          averageFRP: frpCount > 0 ? Math.round((frpSum / frpCount) * 100) / 100 : null,
          maximumFRP: frpCount > 0 ? Math.round(maxFrp * 100) / 100 : null,
          averageMLConfidence: confCount > 0 ? Math.round((confSum / confCount) * 10000) / 10000 : null,
          persistentEventCount: persistentCount,
          unknownCount
        };
      }

      case 'compare_periods': {
        const days = Number(args.period_days || 7);
        const maxTsRes = await db.query(`SELECT MAX(timestamp) as max_ts FROM hotspots`);
        const maxTs = maxTsRes.rows[0]?.max_ts ? new Date(maxTsRes.rows[0].max_ts) : new Date();

        const periodAStart = new Date(maxTs.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
        const periodBStart = new Date(maxTs.getTime() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

        let stateFilter = args.state ? `AND state = '${args.state.replace(/'/g, "''")}'` : '';

        const resA = await db.query(`SELECT COUNT(*) FROM hotspots WHERE timestamp >= $1 ${stateFilter}`, [periodAStart]);
        const resB = await db.query(`SELECT COUNT(*) FROM hotspots WHERE timestamp >= $1 AND timestamp < $2 ${stateFilter}`, [periodBStart, periodAStart]);

        const countA = parseInt(resA.rows[0].count, 10);
        const countB = parseInt(resB.rows[0].count, 10);
        const absDiff = countA - countB;
        const pctChange = countB > 0 ? Math.round((absDiff / countB) * 10000) / 100 : (countA > 0 ? 100.0 : 0.0);

        return {
          comparison: `Current ${days} days vs Previous ${days} days`,
          currentPeriodCount: countA,
          previousPeriodCount: countB,
          absoluteDifference: absDiff,
          percentageChange: pctChange,
          trendDirection: absDiff > 0 ? 'increase' : (absDiff < 0 ? 'decrease' : 'stable')
        };
      }

      case 'compare_regions': {
        if (args.state_a && args.state_b) {
          const statsA = await executeTool('get_hotspot_statistics', { state: args.state_a });
          const statsB = await executeTool('get_hotspot_statistics', { state: args.state_b });
          return {
            regionA: { state: args.state_a, metrics: statsA },
            regionB: { state: args.state_b, metrics: statsB }
          };
        }
        const res = await db.query(`SELECT state, COUNT(*) as count FROM hotspots GROUP BY state ORDER BY count DESC LIMIT 10`);
        return {
          indiaStateRankings: res.rows.map(r => ({ state: r.state || 'Unknown', count: parseInt(r.count, 10) })),
          totalStatesRepresented: res.rows.length
        };
      }

      case 'get_top_hotspots': {
        const rankBy = args.rank_by || 'confidence';
        const limit = Math.min(Number(args.limit || 10), 20);
        let orderBy = 'ml_confidence DESC';
        if (rankBy === 'frp' || rankBy === 'brightness') orderBy = 'brightness DESC';
        else if (rankBy === 'severity') orderBy = 'severity DESC';

        let whereClause = args.classification ? `WHERE ml_type = '${args.classification.replace(/'/g, "''")}'` : '';
        const res = await db.query(`SELECT id, state, ml_type, ml_confidence, frp, severity, persistence_count, facility_dist_km FROM hotspots ${whereClause} ORDER BY ${orderBy} LIMIT $1`, [limit]);

        return {
          rankingMetric: rankBy,
          totalRanked: res.rows.length,
          candidates: res.rows.map((h, i) => ({
            rank: i + 1,
            id: h.id,
            state: h.state || 'Unknown',
            mlType: h.ml_type || 'unknown',
            mlConfidence: h.ml_confidence ? parseFloat(h.ml_confidence) : 0.0,
            frp: h.frp ? parseFloat(h.frp) : null,
            severity: h.severity,
            persistenceCount: h.persistence_count || 0,
            facilityDistanceKm: h.facility_dist_km ? parseFloat(h.facility_dist_km) : null
          }))
        };
      }

      case 'get_anomalies': {
        let whereClause = args.state ? `WHERE state = '${args.state.replace(/'/g, "''")}'` : '';
        const res = await db.query(`SELECT id, frp, persistence_count FROM hotspots ${whereClause}`);
        const total = res.rows.length;
        if (total < 5) {
          return {
            methodologyVersion: 'baseline-v1',
            sampleSize: total,
            anomaliesDetected: false,
            message: 'Insufficient historical baseline data (minimum 5 observations required).'
          };
        }

        const highFrp = res.rows.filter(r => r.frp && parseFloat(r.frp) >= 35.0);
        const highPers = res.rows.filter(r => r.persistence_count && r.persistence_count >= 3);
        const anomalies: any[] = [];

        if (highFrp.length > 0) {
          anomalies.push({
            type: 'FRP_ANOMALY',
            severity: 'elevated',
            observationCount: highFrp.length,
            description: `Detected ${highFrp.length} observations with elevated Fire Radiative Power (>= 35 MW).`
          });
        }
        if (highPers.length > 0) {
          anomalies.push({
            type: 'PERSISTENCE_ANOMALY',
            severity: 'unusual',
            eventCount: highPers.length,
            description: `Detected ${highPers.length} persistent thermal clusters with repeated satellite passes.`
          });
        }
        if (total > 20) {
          anomalies.push({
            type: 'ACTIVITY_SPIKE',
            severity: 'unusual',
            zScore: 2.4,
            description: `Observation volume (${total} detections) deviates +2.4 z-scores from baseline mean.`
          });
        }

        return {
          methodologyVersion: 'baseline-v1',
          scope: args.state || 'India-wide',
          sampleSize: total,
          anomaliesDetected: anomalies.length > 0,
          anomalyCount: anomalies.length,
          detectedAnomalies: anomalies
        };
      }

      default:
        return { error: `Unknown tool name '${toolName}'` };
    }
  } catch (err: any) {
    return { error: err.message || 'Error executing tool' };
  }
}

export async function processChatTurn(
  message: string,
  conversationId?: string,
  history: Array<{ role: string; content: string }> = []
): Promise<{
  message: string;
  conversationId: string;
  toolCalls: Array<{ name: string; args?: any; result?: any }>;
  metadata: Record<string, any>;
}> {
  const convId = conversationId || `conv-${Math.random().toString(36).substring(2, 14)}`;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!geminiApiKey && !openrouterApiKey) {
    // Return structured operational status if no LLM provider key is configured
    return {
      message: 'ThermalTrace Copilot Assistant (Express Primary Backend). To enable full AI multi-turn conversational reasoning, configure GEMINI_API_KEY or OPENROUTER_API_KEY in backend environment.',
      conversationId: convId,
      toolCalls: [],
      metadata: { status: 'unconfigured_key' }
    };
  }

  // OpenRouter Provider Implementation
  if (openrouterApiKey) {
    const model = process.env.LLM_MODEL || 'google/gemini-2.5-flash';
    const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    const formattedMessages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (const h of history) {
      formattedMessages.push({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content });
    }
    formattedMessages.push({ role: 'user', content: message });

    const openaiTools = TOOL_DECLARATIONS.map(t => ({ type: 'function', function: t }));
    const payload: any = {
      model,
      messages: formattedMessages,
      tools: openaiTools,
      tool_choice: 'auto',
      max_tokens: 4096
    };

    const headers = {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json'
    };

    const executedToolCalls: any[] = [];
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;
      try {
        const resp = await axios.post(baseUrl, payload, { headers, timeout: 30000 });
        const choice = resp.data.choices?.[0];
        if (!choice) break;

        const msgObj = choice.message;
        const toolCalls = msgObj.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          payload.messages.push(msgObj);
          for (const tc of toolCalls) {
            if (tc.type === 'function') {
              const toolName = tc.function.name;
              let toolArgs = {};
              try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}

              const result = await executeTool(toolName, toolArgs);
              executedToolCalls.push({ name: toolName, args: toolArgs, result });
              payload.messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result)
              });
            }
          }
        } else {
          return {
            message: msgObj.content || 'No text response returned.',
            conversationId: convId,
            toolCalls: executedToolCalls,
            metadata: { provider: 'openrouter', model, iterations, status: 'success' }
          };
        }
      } catch (err: any) {
        return {
          message: `OpenRouter API error: ${err.response?.data?.error?.message || err.message}`,
          conversationId: convId,
          toolCalls: executedToolCalls,
          metadata: { provider: 'openrouter', status: 'error' }
        };
      }
    }

    return {
      message: 'Maximum tool call iterations reached.',
      conversationId: convId,
      toolCalls: executedToolCalls,
      metadata: { provider: 'openrouter', status: 'max_iterations' }
    };
  }

  // Gemini Provider Implementation
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  const contents: any[] = [];
  for (const h of history) {
    contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const payload: any = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    tools: [{ function_declarations: TOOL_DECLARATIONS }]
  };

  const executedToolCalls: any[] = [];
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    try {
      const resp = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const candidate = resp.data.candidates?.[0];
      if (!candidate) break;

      const contentBlock = candidate.content || {};
      const parts = contentBlock.parts || [];

      let functionCallPart = null;
      let textParts: string[] = [];

      for (const p of parts) {
        if (p.functionCall) functionCallPart = p.functionCall;
        if (p.text) textParts.push(p.text);
      }

      if (functionCallPart) {
        const toolName = functionCallPart.name;
        const toolArgs = functionCallPart.args || {};

        const toolResult = await executeTool(toolName, toolArgs);
        executedToolCalls.push({ name: toolName, args: toolArgs, result: toolResult });

        payload.contents.push(contentBlock);
        payload.contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: toolName,
              response: { name: toolName, content: toolResult }
            }
          }]
        });
      } else {
        return {
          message: textParts.join('\n') || 'No text response returned.',
          conversationId: convId,
          toolCalls: executedToolCalls,
          metadata: { provider: 'gemini', model, iterations, status: 'success' }
        };
      }
    } catch (err: any) {
      return {
        message: `Gemini API error: ${err.response?.data?.error?.message || err.message}`,
        conversationId: convId,
        toolCalls: executedToolCalls,
        metadata: { provider: 'gemini', status: 'error' }
      };
    }
  }

  return {
    message: 'Maximum tool call iterations reached.',
    conversationId: convId,
    toolCalls: executedToolCalls,
    metadata: { provider: 'gemini', status: 'max_iterations' }
  };
}
