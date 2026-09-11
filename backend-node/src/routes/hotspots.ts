import { db } from '../db/postgres';
import { Request, Response, Router } from 'express';

export const hotspotsRouter = Router();

class HotspotService {
  async getById(id: string) {
    const query = `
      SELECT
        h.id, h.latitude, h.longitude, h.type, h.brightness, h.confidence, h.severity, h.timestamp, h.facility_id, h.status,
        h.ml_type, h.ml_confidence, h.model_version, h.ml_explanation, h.land_cover_class, h.land_cover_name, h.frp,
        COUNT(*) OVER(PARTITION BY round(h.latitude::numeric, 3), round(h.longitude::numeric, 3)) as source_obs_count,
        MIN(h.timestamp) OVER(PARTITION BY round(h.latitude::numeric, 3), round(h.longitude::numeric, 3)) as first_seen,
        MAX(h.timestamp) OVER(PARTITION BY round(h.latitude::numeric, 3), round(h.longitude::numeric, 3)) as last_seen,
        MAX(h.frp) OVER(PARTITION BY round(h.latitude::numeric, 3), round(h.longitude::numeric, 3)) as max_frp
      FROM hotspots h
      WHERE h.id = $1
    `;
    const result = await db.query(query, [id]);
    const row = result.rows[0];
    if (!row) return null;

    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);

    try {
      const osmQuery = `
        SELECT id, feature_type, name, latitude, longitude,
          ROUND((sqrt(power(latitude - $1, 2) + power(longitude - $2, 2)) * 111.0)::numeric, 2) as dist_km
        FROM osm_features
        ORDER BY (power(latitude - $1, 2) + power(longitude - $2, 2)) ASC
        LIMIT 3
      `;
      const osmResult = await db.query(osmQuery, [lat, lon]);
      row.osm_context = osmResult.rows.map((r: any) => ({
        id: r.id,
        featureType: r.feature_type,
        name: r.name,
        distanceKm: parseFloat(r.dist_km)
      }));
    } catch (e) {
      row.osm_context = [];
    }

    return row;
  }

  async getLatestDate() {
    const query = `
      SELECT MAX(timestamp) as max_ts
      FROM hotspots
      WHERE source != 'DEMO' OR source IS NULL
    `;
    const result = await db.query(query);
    return result.rows[0]?.max_ts || null;
  }

  async list(filters: any) {
    let query = `
      SELECT
        id, latitude, longitude, type, brightness, confidence, severity, timestamp, facility_id, status,
        ml_type, ml_confidence, model_version, ml_explanation, land_cover_class, land_cover_name, frp,
        COUNT(*) OVER(PARTITION BY round(latitude::numeric, 3), round(longitude::numeric, 3)) as source_obs_count,
        MIN(timestamp) OVER(PARTITION BY round(latitude::numeric, 3), round(longitude::numeric, 3)) as first_seen,
        MAX(timestamp) OVER(PARTITION BY round(latitude::numeric, 3), round(longitude::numeric, 3)) as last_seen,
        MAX(frp) OVER(PARTITION BY round(latitude::numeric, 3), round(longitude::numeric, 3)) as max_frp
      FROM hotspots
      WHERE (source != 'DEMO' OR source IS NULL)
    `;
    let countQuery = `
      SELECT count(*) as total
      FROM hotspots
      WHERE (source != 'DEMO' OR source IS NULL)
    `;

    const values: any[] = [];
    const countValues: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace(/\$\d+/g, `$${paramIndex}`)}`;
      countQuery += ` AND ${condition.replace(/\$\d+/g, `$${paramIndex}`)}`;
      values.push(value);
      countValues.push(value);
      paramIndex++;
    };

    if (filters.type) addFilter('type = $1', filters.type);
    if (filters.min_confidence) addFilter('confidence >= $1', filters.min_confidence);
    if (filters.severity) addFilter('severity = $1', filters.severity);
    if (filters.state) addFilter('state = $1', filters.state);
    if (filters.city) addFilter('city = $1', filters.city);
    if (filters.country) addFilter('country = $1', filters.country);

    if (filters.start_date) {
      const startDay = (filters.start_date as string).slice(0, 10);
      addFilter("DATE(timezone('Asia/Kolkata', timestamp)) >= $1::date", startDay);
    }
    if (filters.end_date) {
      const endDay = (filters.end_date as string).slice(0, 10);
      addFilter("DATE(timezone('Asia/Kolkata', timestamp)) <= $1::date", endDay);
    }

    if (filters.near_lat && filters.near_lng && filters.radius_km) {
      const radiusMeters = filters.radius_km * 1000.0;
      query += ` AND ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2})`;
      countQuery += ` AND ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2})`;
      values.push(filters.near_lng, filters.near_lat, radiusMeters);
      countValues.push(filters.near_lng, filters.near_lat, radiusMeters);
      paramIndex += 3;
    }

    query += ` ORDER BY timestamp DESC`;

    const page = filters.page || 1;
    const pageSize = filters.page_size || 100;
    const offset = (page - 1) * pageSize;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(pageSize, offset);

    const [itemsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, countValues)
    ]);

    return {
      items: itemsResult.rows,
      total: parseInt(countResult.rows[0].total, 10)
    };
  }

  async getActivity(filters: any) {
    const endStr = filters.end_date.split('T')[0];
    const endDate = new Date(`${endStr}T23:59:59.999Z`);
    const startDate = new Date(`${endStr}T00:00:00.000Z`);
    startDate.setUTCDate(startDate.getUTCDate() - 6);

    let query = `
      SELECT
        to_char(timezone('Asia/Kolkata', timestamp), 'YYYY-MM-DD') as day,
        COALESCE(ml_type, type) as type,
        count(*) as count,
        count(distinct concat(round(latitude::numeric, 3), '_', round(longitude::numeric, 3))) as unique_source_count
      FROM hotspots
      WHERE (source != 'DEMO' OR source IS NULL)
    `;
    const values: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      values.push(value);
      paramIndex++;
    };

    if (filters.min_confidence) addFilter('confidence >= $1', filters.min_confidence);
    if (filters.state) addFilter('state = $1', filters.state);
    if (filters.city) addFilter('city = $1', filters.city);
    if (filters.country) addFilter('country = $1', filters.country);

    addFilter("timezone('Asia/Kolkata', timestamp) >= $1", `${startDate.toISOString().split('T')[0]} 00:00:00`);
    addFilter("timezone('Asia/Kolkata', timestamp) <= $1", `${endDate.toISOString().split('T')[0]} 23:59:59`);

    query += `
      GROUP BY day, COALESCE(ml_type, type)
      ORDER BY day ASC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDt = new Date(startDate.getTime());
      dayDt.setUTCDate(dayDt.getUTCDate() + i);
      const dayStr = dayDt.toISOString().split('T')[0];
      days.push({
        date: dayStr,
        total: 0,
        uniqueSources: 0,
        byType: { industrialThermalSource: 0, miningThermalSource: 0, naturalFire: 0, unknown: 0 },
        byTypeUnique: { industrialThermalSource: 0, miningThermalSource: 0, naturalFire: 0, unknown: 0 }
      });
    }

    const dayMap = Object.fromEntries(days.map(d => [d.date, d]));

    for (const row of rows) {
      if (!row.day) continue;
      const dayStr = row.day;
      if (dayMap[dayStr]) {
        const count = parseInt(row.count, 10);
        const uniqueCount = parseInt(row.unique_source_count, 10);
        const t = row.type;
        const camelType = t === 'industrial_thermal_source' ? 'industrialThermalSource' :
                          t === 'mining_thermal_source' ? 'miningThermalSource' :
                          t === 'natural_fire' ? 'naturalFire' : 'unknown';

        dayMap[dayStr].byType[camelType] += count;
        dayMap[dayStr].total += count;
        dayMap[dayStr].byTypeUnique[camelType] += uniqueCount;
        dayMap[dayStr].uniqueSources += uniqueCount;
      }
    }

    return { days };
  }
}

const hotspotService = new HotspotService();

function mapHotspotRow(row: any) {
  const sourceObsCount = row.source_obs_count ? parseInt(row.source_obs_count, 10) : 1;
  const firstSeen = row.first_seen || row.timestamp;
  const lastSeen = row.last_seen || row.timestamp;
  const maxFrp = row.max_frp !== null && row.max_frp !== undefined ? parseFloat(row.max_frp) : (row.frp !== null ? parseFloat(row.frp) : null);

  const durationMs = new Date(lastSeen).getTime() - new Date(firstSeen).getTime();
  const durationDays = durationMs / (1000 * 3600 * 24);

  let activityStatus: 'new' | 'recurring' | 'persistent' | 'under_review' = 'new';
  if (sourceObsCount >= 3 || durationDays >= 2) {
    activityStatus = 'persistent';
  } else if (sourceObsCount >= 2) {
    activityStatus = 'recurring';
  } else if (!row.ml_type || row.ml_type === 'unknown') {
    activityStatus = 'under_review';
  } else {
    activityStatus = 'new';
  }

  return {
    id: row.id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    type: row.type,
    brightness: parseFloat(row.brightness),
    confidence: parseFloat(row.confidence),
    severity: row.severity,
    timestamp: row.timestamp,
    facilityId: row.facility_id,
    status: row.status,
    mlType: row.ml_type,
    mlConfidence: row.ml_confidence !== null ? parseFloat(row.ml_confidence) : null,
    modelVersion: row.model_version,
    mlExplanation: row.ml_explanation
      ? (typeof row.ml_explanation === 'string' ? (() => { try { return JSON.parse(row.ml_explanation); } catch { return row.ml_explanation; } })() : row.ml_explanation)
      : null,
    landCoverClass: row.land_cover_class,
    landCoverName: row.land_cover_name,
    frp: row.frp !== null ? parseFloat(row.frp) : null,
    sourceObsCount,
    firstSeen,
    lastSeen,
    maxFrp,
    activityStatus,
    osmContext: row.osm_context || []
  };
}

hotspotsRouter.get('/hotspots', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const page_size = parseInt(req.query.page_size as string || '100', 10);
    const filters = {
      page, page_size,
      type: req.query.type,
      min_confidence: req.query.min_confidence ? parseFloat(req.query.min_confidence as string) : null,
      severity: req.query.severity,
      state: req.query.state,
      city: req.query.city,
      country: req.query.country,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      near_lat: req.query.near_lat ? parseFloat(req.query.near_lat as string) : null,
      near_lng: req.query.near_lng ? parseFloat(req.query.near_lng as string) : null,
      radius_km: req.query.radius_km ? parseFloat(req.query.radius_km as string) : null
    };

    const { items, total } = await hotspotService.list(filters);

    res.json({
      data: items.map(mapHotspotRow),
      pagination: {
        page,
        page_size,
        total
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

hotspotsRouter.get('/hotspots/latest-date', async (req: Request, res: Response) => {
  try {
    const latestDate = await hotspotService.getLatestDate();
    if (latestDate) {
      const istDate = new Date(new Date(latestDate).getTime() + 5.5 * 60 * 60 * 1000);
      res.json({ date: istDate.toISOString().split('T')[0] });
    } else {
      const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      res.json({ date: nowIst.toISOString().split('T')[0] });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

hotspotsRouter.get('/hotspots/activity', async (req: Request, res: Response) => {
  try {
    if (!req.query.end_date) {
      return res.status(422).json({ error: "Missing required query param: end_date" });
    }
    const filters = {
      end_date: req.query.end_date,
      min_confidence: req.query.min_confidence ? parseFloat(req.query.min_confidence as string) : null,
      state: req.query.state,
      city: req.query.city,
      country: req.query.country
    };

    const activity = await hotspotService.getActivity(filters);
    res.json(activity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

hotspotsRouter.get('/hotspots/:id', async (req: Request, res: Response) => {
  try {
    const hotspot = await hotspotService.getById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({ error: "Hotspot not found" });
    }
    res.json(mapHotspotRow(hotspot));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
