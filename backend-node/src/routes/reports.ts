import { db } from '../db/postgres';
import { Request, Response, Router } from 'express';

export const reportsRouter = Router();

class ReportService {
  async generateReport(filters: any, format: string) {
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

    query += ` LIMIT 500`;

    const result = await db.query(query, values);
    const hotspots = result.rows;

    const totalObs = hotspots.length;
    const classCounts = {
      industrial_thermal_source: 0,
      mining_thermal_source: 0,
      natural_fire: 0,
      unknown: 0
    };
    let highFrp = 0;
    let persistent = 0;

    const incidentsList: any[] = [];

    for (const h of hotspots) {
      const mlT = h.ml_type || "unknown";
      classCounts[mlT as keyof typeof classCounts] = (classCounts[mlT as keyof typeof classCounts] || 0) + 1;

      const frp = parseFloat(h.frp || '0');
      const persistenceCount = parseInt(h.persistence_count || '0', 10);

      if (frp >= 35.0) highFrp += 1;
      if (persistenceCount >= 3) persistent += 1;

      incidentsList.push({
        id: h.id,
        latitude: parseFloat(h.latitude),
        longitude: parseFloat(h.longitude),
        timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : null,
        rawTelemetryType: h.type || "unknown",
        rawConfidence: h.confidence !== null ? parseFloat(h.confidence) : 65.0,
        predictedClassification: mlT,
        mlConfidence: h.ml_confidence !== null ? parseFloat(h.ml_confidence) : 0.0,
        frpMw: frp || null,
        severity: h.severity,
        persistenceCount: persistenceCount,
        facilityDistanceKm: h.facility_dist_km !== null ? parseFloat(h.facility_dist_km) : null
      });
    }

    const alertResult = await db.query(`SELECT severity FROM alerts LIMIT 50`);
    const alerts = alertResult.rows;
    const alertSummary = {
      critical: alerts.filter(a => a.severity === "critical").length,
      high: alerts.filter(a => a.severity === "high").length,
      medium: alerts.filter(a => a.severity === "medium").length,
      low: alerts.filter(a => a.severity === "low").length,
      total: alerts.length
    };

    const reportPayload = {
      reportMetadata: {
        title: "ThermalTrace Operational Intelligence Report",
        generatedAt: new Date().toISOString(),
        scope: filters.state || "India-Wide",
        appliedFilters: {
          dateFrom: filters.date_from || null,
          dateTo: filters.date_to || null,
          state: filters.state || null,
          classification: filters.classification || null,
          severity: filters.severity || null,
          facilityId: filters.facility_id || null
        }
      },
      executiveSummary: {
        totalObservations: totalObs,
        predictedIndustrialThermalSources: classCounts.industrial_thermal_source,
        predictedMiningThermalSources: classCounts.mining_thermal_source,
        predictedNaturalFires: classCounts.natural_fire,
        unknownObservations: classCounts.unknown,
        persistentThermalEvents: persistent,
        highFrpEvents: highFrp,
        totalActiveAlerts: alertSummary.total
      },
      thermalActivityBreakdown: {
        classificationDistribution: classCounts,
        alertSeverityBreakdown: alertSummary
      },
      scientificDisclosures: {
        satelliteSource: "NASA FIRMS Satellite Thermal Anomaly Telemetry",
        modelInformation: "ThermalTrace ML (model version thermalwatch-v1)",
        benchmarkAccuracy: "Finalized 4-class taxonomy. OpenStreetMap industrial infrastructure provides corroborating geospatial evidence, not ground truth.",
        nonCausationNotice: "Industrial facility proximity represents contextual spatial evidence, NOT proof of causation."
      },
      incidentRecords: incidentsList.slice(0, 50)
    };

    if (format.toLowerCase() === "csv") {
      let csvStr = "Incident ID,Latitude,Longitude,Timestamp,ML Prediction,ML Confidence,FRP (MW),Severity,Facility Distance (km)\n";
      for (const inc of incidentsList) {
        csvStr += `${inc.id},${inc.latitude},${inc.longitude},${inc.timestamp},${inc.predictedClassification},${inc.mlConfidence},${inc.frpMw},${inc.severity},${inc.facilityDistanceKm}\n`;
      }
      return { type: 'csv', data: csvStr };
    }

    return { type: 'json', data: reportPayload };
  }
}

const reportService = new ReportService();

reportsRouter.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const filters = {
      date_from: req.body.date_from,
      date_to: req.body.date_to,
      state: req.body.state,
      classification: req.body.classification,
      severity: req.body.severity,
      facility_id: req.body.facility_id
    };
    const format = req.body.format || 'json';

    const result = await reportService.generateReport(filters, format);

    if (result.type === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.attachment('thermaltrace_report.csv');
      return res.send(result.data);
    }

    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
