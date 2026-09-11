export interface FIRMSSourceSummary {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export interface FIRMSIngestSummary {
  sources_attempted: number;
  sources_succeeded: number;
  sources_failed: number;
  total_fetched: number;
  total_inserted: number;
  total_skipped: number;
  bbox: string;
  days: number;
  per_source: FIRMSSourceSummary[];
  errors: { source: string; error: string }[];
}

export interface FIRMSObservation {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: number;
  type: string;
  severity: string;
  timestamp: Date;
  facility_id: string | null;
  status: string;
  country: string;
  state: string | null;
  city: string | null;
  district: string | null;
  source: string;
  frp: number | null;
}

export interface MLPredictionOutput {
  ml_type?: string;
  mlType?: string;
  ml_confidence?: number;
  mlConfidence?: number;
  model_version?: string;
  modelVersion?: string;
  ml_explanation?: Record<string, any> | null;
  mlExplanation?: Record<string, any> | null;
}
