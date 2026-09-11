import { create } from 'zustand';
import api from '../services/api';
import type { HotspotType, ActivityStatus } from '../types/hotspot';
import type { FacilityType } from '../types/facility';
import type { MapStyleId } from '../config/mapStyles';
import { getTodayISTString } from '../utils/dateUtils';

interface MapStoreState {
  // Selection
  selectedHotspotId: string | null;
  selectedFacilityId: string | null;

  // Filters
  activeHotspotTypes: HotspotType[];
  activeActivityStatuses: ActivityStatus[];
  activeFacilityTypes: FacilityType[];
  minimumConfidence: number;

  // Timeline
  selectedDate: string; // ISO date string YYYY-MM-DD
  todayIST: string; // ISO date string for tracking real-time midnight rollovers
  isDateInitialized: boolean;

  // Toggles
  showHeatmap: boolean;
  showFacilities: boolean;
  showRiskZones: boolean;
  rightPanelOpen: boolean;

  // Map style
  mapStyle: MapStyleId;

  // Actions
  selectHotspot: (id: string | null) => void;
  selectFacility: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  fetchAndSetLatestDate: () => Promise<void>;
  setHotspotTypes: (types: HotspotType[]) => void;
  toggleHotspotType: (type: HotspotType) => void;
  setActivityStatuses: (statuses: ActivityStatus[]) => void;
  toggleActivityStatus: (status: ActivityStatus) => void;
  setFacilityTypes: (types: FacilityType[]) => void;
  toggleFacilityType: (type: FacilityType) => void;
  setMinimumConfidence: (confidence: number) => void;
  setShowHeatmap: (show: boolean) => void;
  setShowFacilities: (show: boolean) => void;
  setShowRiskZones: (show: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setMapStyle: (style: MapStyleId) => void;
  resetFilters: () => void;
}

export const useMapStore = create<MapStoreState>((set, get) => ({
  selectedHotspotId: null,
  selectedFacilityId: null,
  activeHotspotTypes: [
    'industrial_thermal_source',
    'mining_thermal_source',
    'natural_fire',
    'unknown',
  ],
  activeActivityStatuses: ['new', 'recurring', 'persistent', 'under_review'],
  activeFacilityTypes: [
    'refinery',
    'power_plant',
    'steel_plant',
    'cement_plant',
    'lng_terminal',
  ],
  minimumConfidence: 0,
  selectedDate: getTodayISTString(),
  todayIST: getTodayISTString(),
  isDateInitialized: false,
  showHeatmap: true,
  showFacilities: true,
  showRiskZones: true,
  rightPanelOpen: false,
  mapStyle: 'satellite',

  selectHotspot: (id) =>
    set({
      selectedHotspotId: id,
      selectedFacilityId: null,
      rightPanelOpen: id !== null,
    }),

  selectFacility: (id) =>
    set({
      selectedFacilityId: id,
      selectedHotspotId: null,
      rightPanelOpen: id !== null,
    }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  fetchAndSetLatestDate: async () => {
    const state = get();
    if (state.isDateInitialized) return;
    try {
      const res = await api.get('/api/v1/hotspots/latest-date');
      if (res.data?.date) {
        set({ selectedDate: res.data.date, isDateInitialized: true });
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch latest date from API, falling back to today IST', e);
    }
    const today = getTodayISTString();
    set({ selectedDate: today, isDateInitialized: true });
  },

  setHotspotTypes: (types) => set({ activeHotspotTypes: types }),

  toggleHotspotType: (type) =>
    set((state) => {
      const current = state.activeHotspotTypes;
      if (current.includes(type)) {
        return { activeHotspotTypes: current.filter((t) => t !== type) };
      }
      return { activeHotspotTypes: [...current, type] };
    }),

  setActivityStatuses: (statuses) => set({ activeActivityStatuses: statuses }),

  toggleActivityStatus: (status) =>
    set((state) => {
      const current = state.activeActivityStatuses;
      if (current.includes(status)) {
        return { activeActivityStatuses: current.filter((s) => s !== status) };
      }
      return { activeActivityStatuses: [...current, status] };
    }),

  setFacilityTypes: (types) => set({ activeFacilityTypes: types }),

  toggleFacilityType: (type) =>
    set((state) => {
      const current = state.activeFacilityTypes;
      if (current.includes(type)) {
        return { activeFacilityTypes: current.filter((t) => t !== type) };
      }
      return { activeFacilityTypes: [...current, type] };
    }),

  setMinimumConfidence: (confidence) =>
    set({ minimumConfidence: confidence }),

  setShowHeatmap: (show) => set({ showHeatmap: show }),
  setShowFacilities: (show) => set({ showFacilities: show }),
  setShowRiskZones: (show) => set({ showRiskZones: show }),

  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  setMapStyle: (style) => set({ mapStyle: style }),

  resetFilters: () =>
    set({
      activeHotspotTypes: [
        'industrial_thermal_source',
        'mining_thermal_source',
        'natural_fire',
        'unknown',
      ],
      activeActivityStatuses: ['new', 'recurring', 'persistent', 'under_review'],
      activeFacilityTypes: [
        'refinery',
        'power_plant',
        'steel_plant',
        'cement_plant',
        'lng_terminal',
      ],
      minimumConfidence: 0,
      showFacilities: true,
      showHeatmap: true,
      showRiskZones: true,
    }),
}));

// Setup automatic midnight rollover
if (typeof window !== 'undefined') {
  setInterval(() => {
    const newToday = getTodayISTString();
    const state = useMapStore.getState();
    if (newToday !== state.todayIST) {
      useMapStore.setState({
        todayIST: newToday,
        selectedDate: state.selectedDate === state.todayIST ? newToday : state.selectedDate,
      });
    }
  }, 60000); // Check every minute
}
