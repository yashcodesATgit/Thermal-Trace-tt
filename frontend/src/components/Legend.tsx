import React, { useMemo } from 'react';
import { Info, RotateCcw, Check, Flame, Layers, Activity, ShieldAlert } from 'lucide-react';
import { useMapStore } from '../store/mapStore';
import { useHotspotsQuery } from '../services/queries/useHotspotsQuery';
import type { HotspotType, ActivityStatus } from '../types/hotspot';
import {
  HOTSPOT_COLORS,
  HOTSPOT_LABELS,
  HOTSPOT_SUB_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS
} from '../types/hotspot';
import type { FacilityType } from '../types/facility';
import { FACILITY_LABELS } from '../types/facility';

interface HotspotTypeItem {
  type: HotspotType;
  label: string;
  subLabel: string;
  color: string;
}

interface ActivityStatusItem {
  status: ActivityStatus;
  label: string;
  color: string;
}

interface FacilityTypeItem {
  type: FacilityType;
  label: string;
  icon: string;
}

export default function Legend(): React.JSX.Element {
  const activeHotspotTypes = useMapStore((s) => s.activeHotspotTypes);
  const toggleHotspotType = useMapStore((s) => s.toggleHotspotType);
  const activeActivityStatuses = useMapStore((s) => s.activeActivityStatuses);
  const toggleActivityStatus = useMapStore((s) => s.toggleActivityStatus);
  const selectedDate = useMapStore((s) => s.selectedDate);
  const activeFacilityTypes = useMapStore((s) => s.activeFacilityTypes);
  const toggleFacilityType = useMapStore((s) => s.toggleFacilityType);
  const minimumConfidence = useMapStore((s) => s.minimumConfidence);
  const setMinimumConfidence = useMapStore((s) => s.setMinimumConfidence);
  const resetFilters = useMapStore((s) => s.resetFilters);

  const { data: hotspots } = useHotspotsQuery(selectedDate, minimumConfidence);

  // Compute dynamic top metrics & category counts directly from real telemetry
  const metrics = useMemo(() => {
    const counts = {
      industrial_thermal_source: 0,
      mining_thermal_source: 0,
      natural_fire: 0,
      unknown: 0,
    };

    const statusCounts = {
      new: 0,
      recurring: 0,
      persistent: 0,
      under_review: 0,
    };

    const uniqueSourceIds = new Set<string>();

    if (hotspots) {
      hotspots.forEach((h) => {
        const type = (h.mlType || h.type || 'unknown') as HotspotType;
        if (counts[type] !== undefined) counts[type]++;
        else counts.unknown++;

        const latR = h.latitude.toFixed(3);
        const lngR = h.longitude.toFixed(3);
        uniqueSourceIds.add(`${latR}_${lngR}`);

        const actStatus = h.activityStatus || 'new';
        if (statusCounts[actStatus] !== undefined) {
          statusCounts[actStatus]++;
        }
      });
    }

    return {
      totalDetections: hotspots?.length || 0,
      uniqueSources: uniqueSourceIds.size,
      persistentSources: statusCounts.persistent,
      underReviewSources: statusCounts.under_review + counts.unknown,
      classCounts: counts,
      statusCounts,
    };
  }, [hotspots]);

  const legendItems: HotspotTypeItem[] = [
    { type: 'industrial_thermal_source', label: HOTSPOT_LABELS.industrial_thermal_source, subLabel: HOTSPOT_SUB_LABELS.industrial_thermal_source, color: HOTSPOT_COLORS.industrial_thermal_source },
    { type: 'mining_thermal_source', label: HOTSPOT_LABELS.mining_thermal_source, subLabel: HOTSPOT_SUB_LABELS.mining_thermal_source, color: HOTSPOT_COLORS.mining_thermal_source },
    { type: 'natural_fire', label: HOTSPOT_LABELS.natural_fire, subLabel: HOTSPOT_SUB_LABELS.natural_fire, color: HOTSPOT_COLORS.natural_fire },
    { type: 'unknown', label: HOTSPOT_LABELS.unknown, subLabel: HOTSPOT_SUB_LABELS.unknown, color: HOTSPOT_COLORS.unknown },
  ];

  const activityStatusItems: ActivityStatusItem[] = [
    { status: 'new', label: ACTIVITY_STATUS_LABELS.new, color: ACTIVITY_STATUS_COLORS.new },
    { status: 'recurring', label: ACTIVITY_STATUS_LABELS.recurring, color: ACTIVITY_STATUS_COLORS.recurring },
    { status: 'persistent', label: ACTIVITY_STATUS_LABELS.persistent, color: ACTIVITY_STATUS_COLORS.persistent },
    { status: 'under_review', label: ACTIVITY_STATUS_LABELS.under_review, color: ACTIVITY_STATUS_COLORS.under_review },
  ];

  const facilityTypes: FacilityTypeItem[] = [
    { type: 'refinery', label: FACILITY_LABELS.refinery, icon: '⚗️' },
    { type: 'power_plant', label: FACILITY_LABELS.power_plant, icon: '⚡' },
    { type: 'steel_plant', label: FACILITY_LABELS.steel_plant, icon: '🏭' },
    { type: 'cement_plant', label: FACILITY_LABELS.cement_plant, icon: '🏗️' },
    { type: 'lng_terminal', label: FACILITY_LABELS.lng_terminal, icon: '💧' },
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-[#0D121F] overflow-hidden select-none border-r border-[#1e293b]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e293b] shrink-0 bg-[#090D16]">
        <span className="text-[11px] font-bold tracking-widest text-[#E8EDF5] uppercase flex items-center gap-1.5">
          LEGEND & FILTERS
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Reset Filters"
            onClick={resetFilters}
            className="text-[#6B7280] hover:text-[#2D7DD2] transition-colors p-1 rounded cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="text-[9px] font-mono font-bold text-[#10B981] bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] px-1.5 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
            LIVE
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs custom-scrollbar">
        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-[#090D16] border border-[#1E293B] rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[9px] font-semibold uppercase tracking-wider">FIRMS Detections</span>
              <Flame className="w-3 h-3 text-[#EF4444]" />
            </div>
            <span className="text-sm font-mono font-bold text-[#EF4444] mt-1">
              {metrics.totalDetections.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#090D16] border border-[#1E293B] rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[9px] font-semibold uppercase tracking-wider">Unique Sources</span>
              <Layers className="w-3 h-3 text-[#38BDF8]" />
            </div>
            <span className="text-sm font-mono font-bold text-white mt-1">
              {metrics.uniqueSources.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#090D16] border border-[#1E293B] rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[9px] font-semibold uppercase tracking-wider">Persistent</span>
              <Activity className="w-3 h-3 text-[#F59E0B]" />
            </div>
            <span className="text-sm font-mono font-bold text-[#F59E0B] mt-1">
              {metrics.persistentSources.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#090D16] border border-[#1E293B] rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-[9px] font-semibold uppercase tracking-wider">Under Review</span>
              <ShieldAlert className="w-3 h-3 text-[#38BDF8]" />
            </div>
            <span className="text-sm font-mono font-bold text-[#38BDF8] mt-1">
              {metrics.underReviewSources.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Operational Banner */}
        <div className="bg-[rgba(56,189,248,0.06)] border border-[rgba(56,189,248,0.2)] rounded-lg p-2.5 text-[10px] text-[#94A3B8] leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-[#38BDF8] mb-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Operator Guidance</span>
          </div>
          New thermal detections may initially remain unclassified because confidence depends partly on source history. ThermalTrace combines FIRMS activity, source persistence, OSM context, and satellite imagery for review.
        </div>

        {/* Operational Activity Status Filters */}
        <div className="pt-2 border-t border-[#1e293b]">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
            Activity Status <span className="text-[8.5px] text-[#38BDF8] lowercase font-normal">(Telemetry History)</span>
          </span>
          <div className="space-y-1">
            {activityStatusItems.map((item) => {
              const isActive = activeActivityStatuses.includes(item.status);
              const count = metrics.statusCounts[item.status] || 0;
              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => toggleActivityStatus(item.status)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded-md border transition-all cursor-pointer hover:bg-[#162032]"
                  style={{
                    backgroundColor: isActive ? 'rgba(30, 45, 69, 0.5)' : 'transparent',
                    borderColor: isActive ? '#1e293b' : 'transparent',
                    opacity: isActive ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-[#E8EDF5] font-medium">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8B9BB4]">{count}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'bg-[#2D7DD2] border-[#2D7DD2] shadow-sm shadow-[#2D7DD2]/40 ring-1 ring-[#2D7DD2]/30'
                          : 'bg-[#111827] border-[#374151] hover:border-[#6B7280]'
                      }`}
                    >
                      {isActive && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ML Classification Breakdown Filters */}
        <div className="pt-2 border-t border-[#1e293b]">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
            ML Classification <span className="text-[8.5px] text-[#8B9BB4] lowercase font-normal">(4-Class Model)</span>
          </span>
          <div className="space-y-1">
            {legendItems.map((item) => {
              const isActive = activeHotspotTypes.includes(item.type);
              const count = metrics.classCounts[item.type] || 0;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleHotspotType(item.type)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded-md border transition-all cursor-pointer hover:bg-[#162032]"
                  style={{
                    backgroundColor: isActive ? 'rgba(30, 45, 69, 0.5)' : 'transparent',
                    borderColor: isActive ? '#1e293b' : 'transparent',
                    opacity: isActive ? 1 : 0.4,
                  }}
                >
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] text-[#E8EDF5] font-medium">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-[#6B7280] ml-3 font-mono">
                      {item.subLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8B9BB4]">{count}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'bg-[#2D7DD2] border-[#2D7DD2] shadow-sm shadow-[#2D7DD2]/40 ring-1 ring-[#2D7DD2]/30'
                          : 'bg-[#111827] border-[#374151] hover:border-[#6B7280]'
                      }`}
                    >
                      {isActive && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence Filter */}
        <div className="pt-2 border-t border-[#1e293b]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
              MINIMUM CONFIDENCE
            </span>
            <span className="font-mono text-[10px] font-bold text-[#2D7DD2] bg-[#162033] px-1.5 py-0.5 rounded">
              ≥ {minimumConfidence}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minimumConfidence}
            onChange={(e) => setMinimumConfidence(Number(e.target.value))}
            className="w-full cursor-pointer accent-[#2D7DD2]"
            style={{ height: 4, background: '#1e293b', borderRadius: 4 }}
          />
        </div>

        {/* Facility Types */}
        <div className="pt-2 border-t border-[#1e293b]">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
            FACILITY LAYERS
          </span>
          <div className="space-y-0.5">
            {facilityTypes.map((item) => {
              const isActive = activeFacilityTypes.includes(item.type);
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleFacilityType(item.type)}
                  className="flex items-center justify-between w-full px-2 py-0.5 text-left text-[11px] text-[#9CA3AF] rounded hover:bg-[#162032] transition-colors cursor-pointer"
                  style={{ opacity: isActive ? 1 : 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">{item.icon}</span>
                    <span className={isActive ? 'text-[#E8EDF5] font-medium' : 'text-[#6B7280]'}>
                      {item.label}
                    </span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all duration-200 shrink-0 ${
                      isActive
                        ? 'bg-[#2D7DD2] border-[#2D7DD2] shadow-sm shadow-[#2D7DD2]/40 ring-1 ring-[#2D7DD2]/30'
                        : 'bg-[#111827] border-[#374151] hover:border-[#6B7280]'
                    }`}
                  >
                    {isActive && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
