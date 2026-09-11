import { Router } from 'express';
import { z } from 'zod';
import { facilityService } from '../services/facilities.service';

const router = Router();

const listFacilitiesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(500).default(100),
  type: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

router.get('/facilities', async (req, res, next) => {
  try {
    const queryResult = listFacilitiesSchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(422).json({ detail: queryResult.error.errors });
      return;
    }

    const { page, page_size, type, state, city, country } = queryResult.data;

    const { items, total } = await facilityService.list({
      page,
      pageSize: page_size,
      type,
      state,
      city,
      country
    });

    res.json({
      data: items.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        latitude: f.latitude,
        longitude: f.longitude,
        city: f.city,
        state: f.state,
        country: f.country,
        source: f.source === null ? 'unknown' : f.source // Match Pydantic optional default="unknown"
      })),
      pagination: {
        page,
        page_size,
        total
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/facilities/summary', async (req, res, next) => {

  try {
    const summary = await facilityService.getSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.get('/facilities/:facility_id', async (req, res, next) => {
  try {
    const { facility_id } = req.params;
    const facility = await facilityService.getById(facility_id);
    if (!facility) {
      res.status(444).json({ detail: `Facility ${facility_id} not found` });
      return;
    }
    res.json({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      latitude: facility.latitude,
      longitude: facility.longitude,
      city: facility.city,
      state: facility.state,
      country: facility.country,
      source: facility.source === null ? 'unknown' : facility.source
    });
  } catch (error) {
    next(error);
  }
});

export { router as facilitiesRouter };
