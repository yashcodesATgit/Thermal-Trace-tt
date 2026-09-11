import axios from 'axios';

export const INDIA_BBOX = '68.0,6.0,98.0,38.0';
const FIRMS_BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export class FIRMSClient {
  private mapKey: string;
  private timeoutMs: number;

  constructor(mapKey?: string, timeoutSeconds = 30.0) {
    const key = mapKey || process.env.FIRMS_MAP_KEY;
    if (!key) {
      throw new Error('FIRMS_MAP_KEY is required but not set');
    }
    this.mapKey = key;
    this.timeoutMs = timeoutSeconds * 1000;
  }

  async fetchCsv(
    source = 'VIIRS_SNPP_NRT',
    bbox = INDIA_BBOX,
    days = 1
  ): Promise<string> {
    const safeDays = Math.max(1, Math.min(days, 5));
    const url = `${FIRMS_BASE_URL}/${this.mapKey}/${source}/${bbox}/${safeDays}`;

    console.log(`FIRMS fetch: source=${source} bbox=${bbox} days=${safeDays}`);

    try {
      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        responseType: 'text',
      });

      const body = response.data;
      const lineCount = (body.match(/\n/g) || []).length;
      console.log(`FIRMS response: ${lineCount} lines`);

      return body;
    } catch (error) {
      console.error('FIRMS fetch failed:', error);
      throw error;
    }
  }
}
