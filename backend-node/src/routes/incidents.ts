import { db } from '../db/postgres';
import { Request, Response, Router } from 'express';

export const incidentsRouter = Router();

class IncidentService {
  async getById(id: string) {
    const query = `
      SELECT
        h.id,
        h.id as hotspot_id,
        h.latitude,
        h.longitude,
        h.type,
        h.brightness,
        h.confidence,
        h.severity,
        h.timestamp,
        h.status,
        h.facility_id,
        f.name as facility_name
      FROM hotspots h
      LEFT JOIN facilities f ON h.facility_id = f.id
      WHERE h.id = $1
    `;
    const result = await db.query(query, [id]);
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async list(filters: any) {
    let query = `
      SELECT
        h.id,
        h.id as hotspot_id,
        h.latitude,
        h.longitude,
        h.type,
        h.brightness,
        h.confidence,
        h.severity,
        h.timestamp,
        h.status,
        h.facility_id,
        f.name as facility_name
      FROM hotspots h
      LEFT JOIN facilities f ON h.facility_id = f.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT count(*) as total
      FROM hotspots h
      WHERE 1=1
    `;

    const values: any[] = [];
    const countValues: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      countQuery += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      values.push(value);
      countValues.push(value);
      paramIndex++;
    };

    if (filters.type) addFilter('h.type = $1', filters.type);
    if (filters.severity) addFilter('h.severity = $1', filters.severity);
    if (filters.min_confidence !== undefined && filters.min_confidence !== null) addFilter('h.confidence >= $1', filters.min_confidence);
    if (filters.state) addFilter('h.state = $1', filters.state);
    if (filters.start_date) addFilter('h.timestamp >= $1', filters.start_date);
    if (filters.end_date) addFilter('h.timestamp <= $1', filters.end_date);

    query += ` ORDER BY h.timestamp DESC`;

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
      items: itemsResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].total, 10)
    };
  }

  private mapRow(row: any) {
    let facilityName = row.facility_name;
    if (facilityName === null && row.facility_id !== null) {
      facilityName = "Unknown Facility";
    }

    return {
      id: row.id,
      hotspotId: row.hotspot_id,
      facilityId: row.facility_id,
      facilityName: facilityName,
      type: row.type,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      brightness: parseFloat(row.brightness),
      confidence: parseFloat(row.confidence),
      severity: row.severity,
      timestamp: row.timestamp,
      status: row.status,
    };
  }
}

const incidentService = new IncidentService();

incidentsRouter.get('/incidents', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const page_size = parseInt(req.query.page_size as string || '100', 10);
    const filters = {
      page, page_size,
      type: req.query.type,
      severity: req.query.severity,
      min_confidence: req.query.min_confidence ? parseFloat(req.query.min_confidence as string) : null,
      state: req.query.state,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const { items, total } = await incidentService.list(filters);

    res.json({
      data: items,
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

incidentsRouter.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await incidentService.getById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(incident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
