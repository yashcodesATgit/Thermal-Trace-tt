import { Router } from 'express';
import { analyticsService } from '../services/analytics.service';

const router = Router();

router.get('/analytics/regional', async (req, res, next) => {
  try {
    const result = await analyticsService.getRegionalAnalytics();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/summary', async (req, res, next) => {
  try {
    const filters = {
      state: req.query.state,
      classification: req.query.classification,
      severity: req.query.severity,
      days: parseInt(req.query.days as string || '7', 10)
    };
    const result = await analyticsService.getAnalyticsSummary(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/temporal', async (req, res, next) => {
  try {
    const filters = {
      state: req.query.state,
      classification: req.query.classification,
      interval: req.query.interval || 'day'
    };
    const result = await analyticsService.getTemporalAnalytics(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRouter };
