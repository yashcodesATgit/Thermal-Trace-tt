import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { facilitiesRouter } from './routes/facilities';
import { analyticsRouter } from './routes/analytics';
import { hotspotsRouter } from './routes/hotspots';
import { alertsRouter } from './routes/alerts';
import { incidentsRouter } from './routes/incidents';
import { reportsRouter } from './routes/reports';
import { authRouter } from './routes/auth';
import { firmsRouter } from './routes/firms';
import { chatRouter } from './routes/chat';

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
const apiRouter = express.Router();
apiRouter.use(healthRouter);
apiRouter.use(facilitiesRouter);
apiRouter.use(analyticsRouter);
apiRouter.use(hotspotsRouter);
apiRouter.use(alertsRouter);
apiRouter.use(incidentsRouter);
apiRouter.use(reportsRouter);
apiRouter.use(authRouter);
apiRouter.use(firmsRouter);
apiRouter.use(chatRouter);


app.use('/api/v1', apiRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'not_found' });
});

// Error handling
app.use(errorHandler);

export default app;
