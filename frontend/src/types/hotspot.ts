export type HotspotType =
  | 'industrial_thermal_source'
  | 'mining_thermal_source'
  | 'natural_fire'
  | 'unknown';

export type ActivityStatus = 'new' | 'recurring' | 'persistent' | 'under_review';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type HotspotStatus = 'active' | 'resolved' | 'monitoring';

export interface OSMContextFeature {
  id: string;
  featureType: string;
  name: string | null;
  distanceKm: number;
}

export interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  type: HotspotType;  // Raw FIRMS telemetry type
  brightness: number;
  confidence: number; // NASA FIRMS confidence
  severity: Severity;
  timestamp: string;
  facilityId: string | null;
  status: HotspotStatus;
  // Phase 6 ML Prediction fields
  mlType?: HotspotType;
  mlConfidence?: number;
  modelVersion?: string;
  mlExplanation?: string | Record<string, number>;
  // ESA WorldCover 10m land-cover context
  landCoverClass?: number;
  landCoverName?: string;
  frp?: number | null;
  // Source Persistence & Operational Context
  sourceObsCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  maxFrp?: number | null;
  activityStatus?: ActivityStatus;
  osmContext?: OSMContextFeature[];
}

export const HOTSPOT_COLORS: Record<HotspotType, string> = {
  industrial_thermal_source: '#FF4444',
  mining_thermal_source: '#FF8C00',
  natural_fire: '#10B981',
  unknown: '#A855F7',
};

export const HOTSPOT_LABELS: Record<HotspotType, string> = {
  industrial_thermal_source: 'Industrial Thermal Source',
  mining_thermal_source: 'Mining Thermal Source',
  natural_fire: 'Natural Fire',
  unknown: 'Under Review',
};

export const HOTSPOT_SUB_LABELS: Record<HotspotType, string> = {
  industrial_thermal_source: 'ML: Confirmed Industrial',
  mining_thermal_source: 'ML: Confirmed Mining',
  natural_fire: 'ML: Natural Vegetation Fire',
  unknown: 'ML: Unknown / Unclassified',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  new: 'New Detection',
  recurring: 'Active / Recurring',
  persistent: 'Persistent Source',
  under_review: 'Under Review',
};

export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  new: '#38BDF8',       // Light Sky Blue
  recurring: '#F59E0B', // Amber
  persistent: '#EF4444',// Red
  under_review: '#64748B' // Slate Grey
};
