import { db } from '../db/postgres';
import { Request, Response, Router } from 'express';

export const alertsRouter = Router();

class AlertService {
  async getById(id: string) {
    const query = `
      SELECT id, hotspot_id, facility_id, severity, title, message, timestamp, acknowledged
      FROM alerts
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async list(filters: any) {
    let query = `
      SELECT id, hotspot_id, facility_id, severity, title, message, timestamp, acknowledged
      FROM alerts
      WHERE 1=1
    `;
    let countQuery = `
      SELECT count(*) as total
      FROM alerts
      WHERE 1=1
    `;
    let unackCountQuery = `
      SELECT count(*) as unack_total
      FROM alerts
      WHERE 1=1 AND acknowledged = false
    `;

    const values: any[] = [];
    const countValues: any[] = [];
    let paramIndex = 1;

    const addFilter = (condition: string, value: any) => {
      query += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      countQuery += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      unackCountQuery += ` AND ${condition.replace('$1', `$${paramIndex}`)}`;
      values.push(value);
      countValues.push(value);
      paramIndex++;
    };

    if (filters.severity) addFilter('severity = $1', filters.severity);
    if (filters.acknowledged !== undefined && filters.acknowledged !== null) {
      addFilter('acknowledged = $1', filters.acknowledged);
    }
    if (filters.date_str) {
      addFilter("date_trunc('day', timezone('Asia/Kolkata', timestamp)) = $1::date", filters.date_str);
    }

    query += ` ORDER BY timestamp DESC`;

    const page = filters.page || 1;
    const pageSize = filters.page_size || 100;
    const offset = (page - 1) * pageSize;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(pageSize, offset);

    const [itemsResult, countResult, unackResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, countValues),
      db.query(unackCountQuery, countValues)
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const unacknowledged_total = parseInt(unackResult.rows[0].unack_total, 10);
    const total_pages = Math.ceil(total / pageSize);

    return {
      items: itemsResult.rows,
      total,
      unacknowledged_total,
      total_pages
    };
  }
}

const alertService = new AlertService();

function mapAlertRow(row: any) {
  return {
    id: row.id,
    hotspotId: row.hotspot_id,
    facilityId: row.facility_id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    timestamp: row.timestamp,
    acknowledged: row.acknowledged
  };
}

alertsRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const page_size = parseInt(req.query.page_size as string || '100', 10);
    let acknowledged: boolean | null = null;
    if (req.query.acknowledged === 'true') acknowledged = true;
    else if (req.query.acknowledged === 'false') acknowledged = false;

    const filters = {
      page,
      page_size,
      severity: req.query.severity,
      acknowledged: acknowledged,
      date_str: req.query.date_str
    };

    const { items, total, unacknowledged_total, total_pages } = await alertService.list(filters);

    res.json({
      data: items.map(mapAlertRow),
      pagination: {
        page,
        page_size,
        total,
        unacknowledged_total,
        total_pages
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.get('/alerts/:id', async (req: Request, res: Response) => {
  try {
    const alert = await alertService.getById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(mapAlertRow(alert));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
