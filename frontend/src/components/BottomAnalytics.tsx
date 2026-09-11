import React, { useMemo, useState } from 'react';
import { Activity, BrainCircuit } from 'lucide-react';
import { useMapStore } from '../store/mapStore';
import { useActivityQuery } from '../services/queries/useActivityQuery';
import type { HotspotType } from '../types/hotspot';
import { HOTSPOT_COLORS } from '../types/hotspot';
import { getTodayISTString, formatISTDateLabel } from '../utils/dateUtils';

interface DateItem {
  label: string;
  isoDate: string;
  isToday: boolean;
  counts: Record<HotspotType, number>;
  total: number;
  uniqueSources: number;
}

const CLASSIFICATION_TYPES: HotspotType[] = [
  'industrial_thermal_source',
  'mining_thermal_source',
  'natural_fire',
  'unknown',
];

const CLASSIFICATION_DISPLAY_LABELS: Record<HotspotType, string> = {
  industrial_thermal_source: 'Industrial Thermal Source',
  mining_thermal_source: 'Mining Thermal Source',
  natural_fire: 'Natural Fire',
  unknown: 'Unknown / Unclassified',
};

export default function BottomAnalytics(): React.JSX.Element {
  const selectedDate = useMapStore((s) => s.selectedDate);
  const setSelectedDate = useMapStore((s) => s.setSelectedDate);
  const minimumConfidence = useMapStore((s) => s.minimumConfidence);
  const todayIST = getTodayISTString();

  const [mode, setMode] = useState<'activity' | 'classification'>('activity');

  const { data: activityData } = useActivityQuery(todayIST, minimumConfidence);

  const dates: DateItem[] = useMemo(() => {
    if (!activityData?.days) return [];
    return activityData.days.map((day) => {
      const counts: Record<HotspotType, number> = {
        industrial_thermal_source: day.byType.industrialThermalSource || 0,
        mining_thermal_source: day.byType.miningThermalSource || 0,
        natural_fire: day.byType.naturalFire || 0,
        unknown: day.byType.unknown || 0,
      };
      return {
        label: formatISTDateLabel(day.date, false),
        isoDate: day.date,
        isToday: day.date === todayIST,
        counts,
        total: day.total || 0,
        uniqueSources: day.uniqueSources || 0,
      };
    });
  }, [activityData, todayIST]);

  const maxVal = useMemo(
    () => Math.max(...dates.map((d) => Math.max(d.total, d.uniqueSources)), 10),
    [dates],
  );

  return (
    <footer className="w-full h-full bg-[#0C1520] border-t border-[#111A26] flex flex-col select-none overflow-hidden">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 shrink-0 border-b border-[#161F2E] gap-2">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#E8EDF5] uppercase tracking-wider font-mono">
                {mode === 'activity' ? 'THERMAL ACTIVITY' : 'SOURCE CLASSIFICATION'}
              </span>
            </div>
            <span className="text-[9px] text-[#7A8FA8] truncate hidden sm:block">
              {mode === 'activity'
                ? 'FIRMS detections and unique thermal-source activity'
                : 'Daily distribution of thermal-source classifications'}
            </span>
          </div>
        </div>

        {/* Legend in Header (Desktop >= lg) */}
        <div className="hidden lg:flex items-center gap-3 px-2">
          {mode === 'activity' ? (
            <>
              <div className="flex items-center gap-1.5 text-[9px] text-[#8B9BB4] font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF4444]" />
                <span>FIRMS Detections</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-[#8B9BB4] font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF8C00]" />
                <span>Unique Thermal Sources</span>
              </div>
            </>
          ) : (
            CLASSIFICATION_TYPES.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5 text-[9px] text-[#8B9BB4] font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: HOTSPOT_COLORS[cat] }}
                />
                <span>{CLASSIFICATION_DISPLAY_LABELS[cat]}</span>
              </div>
            ))
          )}
        </div>

        {/* Compact Segmented Toggle */}
        <div className="flex items-center bg-[#06090F] border border-[#1E2D45] rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setMode('activity')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
              mode === 'activity'
                ? 'bg-[#1E2D45] text-[#E8EDF5] border border-[#2D3F5E] shadow-sm'
                : 'text-[#5A7090] hover:text-[#94A3B8]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Activity</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('classification')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
              mode === 'classification'
                ? 'bg-[#1E2D45] text-[#E8EDF5] border border-[#2D3F5E] shadow-sm'
                : 'text-[#5A7090] hover:text-[#94A3B8]'
            }`}
          >
            <BrainCircuit className="w-3 h-3" />
            <span>Classification</span>
          </button>
        </div>
      </div>

      {/* ── CHART AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex items-end gap-2 px-3 pt-1.5 pb-1 w-full overflow-x-auto custom-scrollbar">
        {dates.map((d) => {
          const isSelected = d.isoDate === selectedDate;
          const totalVal = d.total || 0;
          const uniqueVal = d.uniqueSources || 0;

          const totalHeightPct = Math.max(6, Math.min((totalVal / maxVal) * 100, 100));
          const uniqueHeightPct = Math.max(6, Math.min((uniqueVal / maxVal) * 100, 100));

          return (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => setSelectedDate(d.isoDate)}
              className={`flex-1 min-w-[60px] flex flex-col items-center group cursor-pointer h-full justify-end z-10 transition-all rounded-lg p-1.5 ${
                isSelected ? 'bg-[rgba(255,68,68,0.08)] ring-1 ring-[#FF4444]/40' : 'hover:bg-[#080C14]/60'
              }`}
              aria-label={`Select date ${d.label}${d.isToday ? ' (Today)' : ''}`}
            >
              {/* Metric counts label above bar */}
              <div className="flex items-center gap-1 mb-1 font-mono text-[10px] shrink-0">
                {mode === 'activity' ? (
                  <>
                    <span className="font-bold text-[#FF4444]">{totalVal}</span>
                    <span className="text-[#5A7090]">/</span>
                    <span className="font-bold text-[#FF8C00]">{uniqueVal}</span>
                  </>
                ) : (
                  <span className="font-bold text-[#E8EDF5]">{totalVal}</span>
                )}
              </div>

              {/* Bar container consuming full flexible height */}
              <div className="relative w-full flex-1 min-h-0 flex items-end justify-center gap-1.5 px-1 py-0.5">
                {mode === 'activity' ? (
                  /* Activity Mode: Side-by-side bars for FIRMS Detections & Unique Sources */
                  <>
                    {/* FIRMS Detections Bar */}
                    <div className="flex-1 max-w-[32px] h-full flex items-end justify-center">
                      <div
                        className="w-full rounded-t-[4px] bg-[#FF4444] opacity-85 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                        style={{ height: `${totalHeightPct}%` }}
                        title={`FIRMS Detections: ${totalVal}`}
                      />
                    </div>

                    {/* Unique Thermal Sources Bar */}
                    <div className="flex-1 max-w-[32px] h-full flex items-end justify-center">
                      <div
                        className="w-full rounded-t-[4px] bg-[#FF8C00] opacity-85 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                        style={{ height: `${uniqueHeightPct}%` }}
                        title={`Unique Sources: ${uniqueVal}`}
                      />
                    </div>
                  </>
                ) : (
                  /* Classification Mode: Stacked bar showing ML distribution */
                  <div className="w-full max-w-[64px] h-full flex items-end justify-center">
                    <div
                      className="w-full rounded-t-[4px] overflow-hidden flex flex-col-reverse transition-all duration-200 shadow-sm"
                      style={{ height: `${totalHeightPct}%` }}
                    >
                      {totalVal > 0 ? (
                        CLASSIFICATION_TYPES.map((cat) => {
                          const count = d.counts[cat] || 0;
                          if (count === 0) return null;
                          const pct = (count / totalVal) * 100;
                          return (
                            <div
                              key={cat}
                              style={{
                                height: `${pct}%`,
                                backgroundColor: HOTSPOT_COLORS[cat],
                              }}
                              title={`${CLASSIFICATION_DISPLAY_LABELS[cat]}: ${count}`}
                            />
                          );
                        })
                      ) : (
                        <div className="w-full h-full bg-[#1E2D45]" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date label */}
              <div
                className={`text-[10px] mt-1 font-mono px-2 py-0.5 rounded transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'text-[#E8EDF5] font-bold bg-[#1E2D45]'
                    : 'text-[#5A7090] group-hover:text-[#94A3B8]'
                }`}
              >
                {d.label}{d.isToday ? ' ·' : ''}
              </div>
            </button>
          );
        })}

        {dates.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-[#5A7090]">
            Loading activity data…
          </div>
        )}
      </div>

      {/* ── MOBILE LEGEND FOOTER (< lg) ─────────────────────────────────── */}
      <div className="lg:hidden flex items-center justify-center gap-3 px-3 py-1 border-t border-[#111A26] shrink-0 flex-wrap">
        {mode === 'activity' ? (
          <>
            <div className="flex items-center gap-1 text-[8px] text-[#8B9BB4]">
              <span className="w-2 h-2 rounded-sm bg-[#FF4444]" />
              <span>FIRMS Detections</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-[#8B9BB4]">
              <span className="w-2 h-2 rounded-sm bg-[#FF8C00]" />
              <span>Unique Thermal Sources</span>
            </div>
          </>
        ) : (
          CLASSIFICATION_TYPES.map((cat) => (
            <div key={cat} className="flex items-center gap-1 text-[8px] text-[#8B9BB4]">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: HOTSPOT_COLORS[cat] }}
              />
              <span>{CLASSIFICATION_DISPLAY_LABELS[cat]}</span>
            </div>
          ))
        )}
      </div>
    </footer>
  );
}
