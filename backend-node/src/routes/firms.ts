import { Router, Request, Response } from 'express';
import { FIRMSIngestionService } from '../services/firms/firms.ingestion';
import { firmsSyncManager } from '../services/firms/firms.scheduler';
import { INDIA_BBOX } from '../services/firms/firms.client';

export const firmsRouter = Router();

// Require FIRMS_MAP_KEY
const requireFirmsKey = (req: Request, res: Response, next: Function) => {
  if (!process.env.FIRMS_MAP_KEY) {
    return res.status(503).json({ detail: "FIRMS_MAP_KEY is not configured. Set it in backend/.env" });
  }
  next();
};

firmsRouter.post('/ingestion/firms', requireFirmsKey, async (req: Request, res: Response) => {
  try {
    const source = (req.query.source as string) || 'VIIRS_SNPP_NRT';
    const bbox = (req.query.bbox as string) || INDIA_BBOX;
    let days = process.env.FIRMS_INGESTION_DAYS ? parseInt(process.env.FIRMS_INGESTION_DAYS, 10) : 5;
    if (req.query.days) {
      days = parseInt(req.query.days as string, 10);
    }

    const service = new FIRMSIngestionService();
    const summary = await service.ingest(source, bbox, days);

    await firmsSyncManager.recordSyncSuccess(summary.inserted);

    res.json(summary);
  } catch (error: any) {
    firmsSyncManager.recordSyncFailure(error.message || String(error));
    res.status(502).json({ detail: `FIRMS ingest failed: ${error.message || String(error)}` });
  }
});

firmsRouter.post('/ingestion/firms/all', requireFirmsKey, async (req: Request, res: Response) => {
  try {
    const bbox = (req.query.bbox as string) || INDIA_BBOX;
    let days = process.env.FIRMS_INGESTION_DAYS ? parseInt(process.env.FIRMS_INGESTION_DAYS, 10) : 5;
    if (req.query.days) {
      days = parseInt(req.query.days as string, 10);
    }

    let sourcesStr = req.query.sources as string;
    if (!sourcesStr) {
      sourcesStr = process.env.FIRMS_SOURCES || 'VIIRS_SNPP_NRT,VIIRS_NOAA20_NRT,VIIRS_NOAA21_NRT';
    }

    const sources = sourcesStr.split(',').map(s => s.trim()).filter(Boolean);
    if (sources.length === 0) {
      return res.status(400).json({ detail: "No FIRMS sources configured. Set FIRMS_SOURCES in backend/.env" });
    }

    const service = new FIRMSIngestionService();
    const summary = await service.ingestAllSources(sources, bbox, days);

    if (summary.sources_succeeded > 0 || summary.total_inserted > 0) {
      await firmsSyncManager.recordSyncSuccess(summary.total_inserted);
    } else if (summary.sources_failed > 0) {
      const errMsg = summary.errors.map(e => e.error).join('; ');
      await firmsSyncManager.recordSyncFailure(errMsg);
    }

    res.json(summary);
  } catch (error: any) {
    firmsSyncManager.recordSyncFailure(error.message || String(error));
    res.status(502).json({ detail: `Multi-source FIRMS ingest failed: ${error.message || String(error)}` });
  }
});

firmsRouter.get('/firms/status', async (req: Request, res: Response) => {
  try {
    const payload = await firmsSyncManager.getStatusPayload();
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || String(error) });
  }
});
