import { db } from '../db/postgres';

export interface Facility {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  source: string | null;
}

export interface ListFacilitiesParams {
  page?: number;
  pageSize?: number;
  type?: string;
  state?: string;
  city?: string;
  country?: string;
}

export class FacilityService {
  async list(params: ListFacilitiesParams): Promise<{ items: Facility[]; total: number }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 100;

    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    if (params.type) {
      whereClauses.push(`type = $${paramIndex++}`);
      values.push(params.type);
    }
    if (params.state) {
      whereClauses.push(`state = $${paramIndex++}`);
      values.push(params.state);
    }
    if (params.city) {
      whereClauses.push(`city = $${paramIndex++}`);
      values.push(params.city);
    }
    if (params.country) {
      whereClauses.push(`country = $${paramIndex++}`);
      values.push(params.country);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM facilities ${whereString}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * pageSize;

    // Add pagination values
    const queryValues = [...values, pageSize, offset];

    const query = `
      SELECT id, name, type, latitude, longitude, city, state, country, source
      FROM facilities
      ${whereString}
      ORDER BY name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await db.query(query, queryValues);

    // Format to match exact FastAPI structure (floats instead of strings if pg returns numeric strings)
    const items = result.rows.map(row => ({
      ...row,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude)
    }));

    return { items, total };
  }

  async getSummary(): Promise<{ totalFacilities: number; typeDistribution: Record<string, number> }> {
    const totalQuery = `SELECT COUNT(*) FROM facilities`;
    const totalResult = await db.query(totalQuery);
    const totalFacilities = parseInt(totalResult.rows[0]?.count || '0', 10);

    const typeQuery = `SELECT type, COUNT(*) as count FROM facilities GROUP BY type`;
    const typeResult = await db.query(typeQuery);
    const typeDistribution: Record<string, number> = {};
    for (const row of typeResult.rows) {
      const ftype = row.type || 'Industrial Facility';
      typeDistribution[ftype] = parseInt(row.count, 10);
    }

    return { totalFacilities, typeDistribution };
  }

  async getById(id: string): Promise<Facility | null> {
    const query = `
      SELECT id, name, type, latitude, longitude, city, state, country, source
      FROM facilities
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      source: row.source === null ? 'unknown' : row.source
    };
  }
}

export const facilityService = new FacilityService();
