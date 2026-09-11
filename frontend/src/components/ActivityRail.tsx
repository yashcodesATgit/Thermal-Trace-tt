import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { useMapStore } from '../store/mapStore';
import { useHotspotsQuery } from '../services/queries/useHotspotsQuery';
import type { HotspotType, ActivityStatus } from '../types/hotspot';
import {
  HOTSPOT_COLORS,
  HOTSPOT_LABELS,
  HOTSPOT_SUB_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
} from '../types/hotspot';
import type { FacilityType } from '../types/facility';
import { FACILITY_LABELS } from '../types/facility';
import { useMemo } from 'react';

// ─── Collapsible Section ────────────────────────────────────────────────────
interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#161F2E]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#0F1623]/80 transition-colors cursor-pointer"
      >
        <span className="text-[9px] font-bold tracking-widest text-[#4A5D78] uppercase">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-[#4A5D78]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[#4A5D78]" />
        )}
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

// ─── Checkbox Row ────────────────────────────────────────────────────────────
interface CheckRowProps {
  label: string;
  subLabel?: string;
  color?: string;
  count?: number;
  active: boolean;
  onToggle: () => void;
}

function CheckRow({ label, subLabel, color, count, active, onToggle }: CheckRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-1.5 py-1 rounded-md transition-all cursor-pointer hover:bg-[#0F1A2B]"
      style={{ opacity: active ? 1 : 0.45 }}
    >
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center gap-1.5">
          {color && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="text-[11px] text-[#C8D4E3] font-medium truncate">{label}</span>
        </div>
        {subLabel && (
          <span className="text-[8.5px] text-[#3B4D63] font-mono pl-3.5 mt-0.5">{subLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {count !== undefined && (
          <span className="text-[9px] font-mono text-[#4A5D78]">{count}</span>
        )}
        <div
          className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all ${
            active
              ? 'bg-[#2D7DD2] border-[#2D7DD2]'
              : 'bg-[#0D1525] border-[#2A3A52]'
          }`}
        >
          {active && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
        </div>
      </div>
    </button>
  );
}

// ─── ActivityRail ────────────────────────────────────────────────────────────
export default function ActivityRail(): React.JSX.Element {
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

  const metrics = useMemo(() => {
    const classCounts: Record<HotspotType, number> = {
      industrial_thermal_source: 0,
      mining_thermal_source: 0,
      natural_fire: 0,
      unknown: 0,
    };
    const statusCounts: Record<ActivityStatus, number> = {
      new: 0,
      recurring: 0,
      persistent: 0,
      under_review: 0,
    };

    if (hotspots) {
      hotspots.forEach((h) => {
        const type = (h.mlType || h.type || 'unknown') as HotspotType;
        if (classCounts[type] !== undefined) classCounts[type]++;
        else classCounts.unknown++;

        const st = h.activityStatus || 'new';
        if (statusCounts[st] !== undefined) statusCounts[st]++;
      });
    }

    return { classCounts, statusCounts };
  }, [hotspots]);

  const activityStatuses: ActivityStatus[] = ['new', 'recurring', 'persistent', 'under_review'];
  const hotspotTypes: HotspotType[] = [
    'industrial_thermal_source',
    'mining_thermal_source',
    'natural_fire',
    'unknown',
  ];
  const facilityTypes: Array<{ type: FacilityType; icon: string }> = [
    { type: 'refinery', icon: '⚗️' },
    { type: 'power_plant', icon: '⚡' },
    { type: 'steel_plant', icon: '🏭' },
    { type: 'cement_plant', icon: '🏗️' },
    { type: 'lng_terminal', icon: '💧' },
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-[#080C14] overflow-hidden select-none">
      {/* Rail Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#161F2E] shrink-0 bg-[#06090F]">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3 text-[#2D7DD2]" />
          <span className="text-[10px] font-bold tracking-widest text-[#5A6E8A] uppercase">
            Filters
          </span>
        </div>
        <button
          type="button"
          title="Reset all filters"
          onClick={resetFilters}
          className="text-[#3B4D63] hover:text-[#2D7DD2] transition-colors p-1 rounded cursor-pointer"
          aria-label="Reset filters"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Activity Status */}
        <Section title="Activity" defaultOpen>
          <div className="space-y-0.5 mt-0.5">
            {activityStatuses.map((s) => (
              <CheckRow
                key={s}
                label={ACTIVITY_STATUS_LABELS[s]}
                color={ACTIVITY_STATUS_COLORS[s]}
                count={metrics.statusCounts[s]}
                active={activeActivityStatuses.includes(s)}
                onToggle={() => toggleActivityStatus(s)}
              />
            ))}
          </div>
        </Section>

        {/* ML Classification */}
        <Section title="ML Classification" defaultOpen>
          <div className="space-y-0.5 mt-0.5">
            {hotspotTypes.map((t) => (
              <CheckRow
                key={t}
                label={HOTSPOT_LABELS[t]}
                subLabel={HOTSPOT_SUB_LABELS[t]}
                color={HOTSPOT_COLORS[t]}
                count={metrics.classCounts[t]}
                active={activeHotspotTypes.includes(t)}
                onToggle={() => toggleHotspotType(t)}
              />
            ))}
          </div>
        </Section>

        {/* Confidence */}
        <Section title="Min. Confidence" defaultOpen>
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#4A5D78]">Threshold</span>
              <span className="text-[10px] font-mono font-bold text-[#2D7DD2]">
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
              style={{ height: 3, background: '#1E2D45', borderRadius: 4 }}
              aria-label="Minimum confidence filter"
            />
          </div>
        </Section>

        {/* Facility Layers */}
        <Section title="Facility Layers" defaultOpen>
          <div className="space-y-0.5 mt-0.5">
            {facilityTypes.map(({ type, icon }) => (
              <CheckRow
                key={type}
                label={`${icon} ${FACILITY_LABELS[type]}`}
                active={activeFacilityTypes.includes(type)}
                onToggle={() => toggleFacilityType(type)}
              />
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}
