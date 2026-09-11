import { db } from '../db/postgres';
import { redisClient } from '../redis/redis';

export interface RegionalAnalyticsState {
  state: string;
  totalObservations: number;
  industrialObservations: number;
  miningObservations: number;
  naturalFires: number;
  persistentEvents: number;
}

export class AnalyticsService {
  async getRegionalAnalytics(): Promise<{ totalStatesRepresented: number; states: RegionalAnalyticsState[] }> {
    const canonicalKey = "analytics:regional:all";

    // Check Redis Cache (TTL matching FastAPI's settings.analytics_cache_ttl_seconds default of 300)
    try {
      const cached = await redisClient.get(`thermalwatch:cache:${canonicalKey}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("Redis cache GET error (bypass)", error);
    }

    // Equivalent aggregation logic to FastAPI's memory loop, translated to efficient SQL
    const query = `
      SELECT
        COALESCE(state, 'Unknown State') as state,
        COUNT(*)::int as "totalObservations",
        SUM(CASE WHEN ml_type = 'industrial_thermal_source' THEN 1 ELSE 0 END)::int as "industrialObservations",
        SUM(CASE WHEN ml_type = 'mining_thermal_source' THEN 1 ELSE 0 END)::int as "miningObservations",
        SUM(CASE WHEN ml_type = 'natural_fire' THEN 1 ELSE 0 END)::int as "naturalFires",
        0 as "persistentEvents"
      FROM hotspots
      GROUP BY COALESCE(state, 'Unknown State')
      ORDER BY "totalObservations" DESC
    `;

    const result = await db.query(query);
    const states: RegionalAnalyticsState[] = result.rows;

    const payload = {
      totalStatesRepresented: states.length,
      states
    };

    try {
      await redisClient.setEx(`thermalwatch:cache:${canonicalKey}`, 300, JSON.stringify(payload));
    } catch (error) {
      console.warn("Redis cache SET error", error);
    }

    return payload;
  }

  async getAnalyticsSummary(filters: any): Promise<any> {
    const canonicalKey = `analytics:summary:state=${filters.state || 'all'}:class=${filters.classification || 'all'}:sev=${filters.severity || 'all'}:days=${filters.days}`;

    try {
      const cached = await redisClient.get(`thermalwatch:cache:${canonicalKey}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn("Redis GET error", e);
    }

    let query = `
      SELECT
        id, latitude, longitude, type, brightness, confidence, severity, timestamp, facility_id, status,
        ml_type, ml_confidence, model_version, ml_explanation, land_cover_class, land_cover_name
      FROM hotspots
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      values.push(value);
      paramIndex++;
    };

    if (filters.state) addFilter('state = $1', filters.state);
    if (filters.classification) addFilter('ml_type = $1', filters.classification);
    if (filters.severity) addFilter('severity = $1', filters.severity);

    const result = await db.query(query, values);
    const hotspots = result.rows;

    const totalObservations = hotspots.length;
    const uniqueSourcesSeen = new Set<string>();
    const classCounts = {
      industrial_thermal_source: 0,
      mining_thermal_source: 0,
      natural_fire: 0,
      unknown: 0,
    };
    const sevCounts: Record<string, number> = {};
    let highFrpCount = 0;
    let anomalousCount = 0;

    const sourceObsCounts: Record<string, number> = {};
    const sourceMlType: Record<string, string> = {};
    const sourceMaxFrp: Record<string, number> = {};

    for (const h of hotspots) {
      const lat = parseFloat(h.latitude).toFixed(3);
      const lng = parseFloat(h.longitude).toFixed(3);
      const sourceId = `${lat}_${lng}`;

      sourceObsCounts[sourceId] = (sourceObsCounts[sourceId] || 0) + 1;
      const mlT = h.ml_type || "unknown";
      if (!sourceMlType[sourceId]) {
        sourceMlType[sourceId] = mlT;
      }

      const frp = parseFloat(h.frp || '0');
      if (frp > (sourceMaxFrp[sourceId] || 0)) {
        sourceMaxFrp[sourceId] = frp;
      }

      const sev = h.severity || "medium";
      sevCounts[sev] = (sevCounts[sev] || 0) + 1;
    }

    const totalUnique = Object.keys(sourceObsCounts).length;
    let persistentCount = 0;
    let recurringCount = 0;
    let newCount = 0;
    let underReviewCount = 0;

    for (const [sourceId, count] of Object.entries(sourceObsCounts)) {
      const mlT = sourceMlType[sourceId] || "unknown";
      classCounts[mlT as keyof typeof classCounts] = (classCounts[mlT as keyof typeof classCounts] || 0) + 1;

      if (count >= 3) {
        persistentCount += 1;
      } else if (count === 2) {
        recurringCount += 1;
      } else {
        newCount += 1;
      }

      if (mlT === 'unknown') {
        underReviewCount += 1;
      }

      if ((sourceMaxFrp[sourceId] || 0) >= 35.0) {
        highFrpCount += 1;
      }
    }

    const industrialTotal = classCounts["industrial_thermal_source"];
    const industrialPct = totalUnique > 0 ? parseFloat((industrialTotal / totalUnique * 100).toFixed(1)) : 0.0;

    const alertResult = await db.query(`SELECT count(*) as total FROM alerts WHERE severity IN ('high', 'critical')`);
    const highCriticalAlerts = parseInt(alertResult.rows[0].total, 10);

    const payload = {
      totalObservations,
      uniqueSources: totalUnique,
      persistentSources: persistentCount,
      recurringSources: recurringCount,
      newSources: newCount,
      underReviewSources: underReviewCount,
      classificationDistribution: classCounts,
      severityDistribution: sevCounts,
      industrialSourcePercentage: industrialPct,
      highCriticalAlerts,
      persistentEvents: persistentCount,
      highFrpEvents: highFrpCount,
      anomalousEvents: persistentCount + highFrpCount,
      modelVersion: "thermalwatch-v1",
      benchmarkDisclosure: "Validated 4-class taxonomy. OpenStreetMap industrial infrastructure and ESA WorldCover land-use data provide corroborating geospatial evidence for spatial classification context.",
      psCategoryCoverage: {
        industrial_fires: {
          psCategory: "Industrial Fires / Heat",
          modelClass: "industrial_thermal_source",
          coverageType: "classified",
          description: "High temporal persistence (≥9 months/yr incl. monsoon) & OSM industrial proximity (≤2 km)"
        },
        gas_flares: {
          psCategory: "Gas Flares",
          modelClass: "industrial_thermal_source",
          coverageType: "grouped",
          description: "Subsumed under industrial process heat; persistent flaring at oil refineries & petrochemical complexes"
        },
        mining_activity: {
          psCategory: "Mining Activity",
          modelClass: "mining_thermal_source",
          coverageType: "classified",
          description: "High temporal persistence & spatial proximity (≤2 km) to OSM quarry features"
        },
        agricultural_burning: {
          psCategory: "Agricultural Burning",
          modelClass: "natural_fire",
          coverageType: "grouped",
          description: "Seasonal non-industrial open fires in agricultural zones (crop residue / stubble burning)"
        },
        wildfire_forest_fire: {
          psCategory: "Wildfire / Forest Fire",
          modelClass: "natural_fire",
          coverageType: "grouped",
          description: "Seasonal non-industrial open vegetation fires in forested & woodland regions"
        },
        other_natural_fires: {
          psCategory: "Other Natural Fires",
          modelClass: "natural_fire",
          coverageType: "grouped",
          description: "Seasonal open fires across grasslands, shrublands, and non-crop vegetation"
        }
      }
    };

    try {
      await redisClient.setEx(`thermalwatch:cache:${canonicalKey}`, 300, JSON.stringify(payload));
    } catch (e) {}

    return payload;
  }

  async getTemporalAnalytics(filters: any): Promise<any> {
    const canonicalKey = `analytics:temporal:state=${filters.state || 'all'}:class=${filters.classification || 'all'}:interval=${filters.interval}`;

    try {
      const cached = await redisClient.get(`thermalwatch:cache:${canonicalKey}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    let query = `
      SELECT
        to_char(timezone('UTC', timestamp), 'YYYY-MM-DD') as day,
        COALESCE(ml_type, type) as type,
        count(*) as count
      FROM hotspots
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      values.push(value);
      paramIndex++;
    };

    if (filters.state) addFilter('state = $1', filters.state);
    if (filters.classification) addFilter('ml_type = $1', filters.classification);

    query += `
      GROUP BY day, COALESCE(ml_type, type)
      ORDER BY day ASC
    `;

    const result = await db.query(query, values);

    const buckets: Record<string, Record<string, number>> = {};
    for (const row of result.rows) {
      if (!row.day) continue;
      const dateStr = row.day;
      if (!buckets[dateStr]) {
        buckets[dateStr] = {
          industrial_thermal_source: 0,
          mining_thermal_source: 0,
          natural_fire: 0,
          unknown: 0,
          total: 0
        };
      }
      const t = row.type || "unknown";
      const count = parseInt(row.count, 10);
      buckets[dateStr][t] = (buckets[dateStr][t] || 0) + count;
      buckets[dateStr].total += count;
    }

    const series = Object.keys(buckets).sort().map(date => ({
      date,
      ...buckets[date]
    }));

    const payload = {
      interval: filters.interval,
      totalDataPoints: series.length,
      series
    };

    try {
      await redisClient.setEx(`thermalwatch:cache:${canonicalKey}`, 300, JSON.stringify(payload));
    } catch (e) {}

    return payload;
  }
}

export const analyticsService = new AnalyticsService();
