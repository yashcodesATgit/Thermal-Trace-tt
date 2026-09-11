import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HOTSPOT_COLORS } from '../types/hotspot';
import type { HotspotType } from '../types/hotspot';
import { FACILITY_LABELS } from '../types/facility';
import type { FacilityType } from '../types/facility';

const CLASSIFICATION_ITEMS: Array<{ type: HotspotType }> = [
  { type: 'industrial_thermal_source' },
  { type: 'mining_thermal_source' },
  { type: 'natural_fire' },
  { type: 'unknown' },
];

const FACILITY_ITEMS: Array<{ type: FacilityType }> = [
  { type: 'refinery' },
  { type: 'power_plant' },
  { type: 'steel_plant' },
  { type: 'cement_plant' },
  { type: 'lng_terminal' },
];

// Short display labels for the compact legend
const SHORT_LABELS: Record<HotspotType, string> = {
  industrial_thermal_source: 'Industrial',
  mining_thermal_source: 'Mining',
  natural_fire: 'Natural Fire',
  unknown: 'Under Review',
};

export default function MapLegend(): React.JSX.Element {
  const [isThermalOpen, setIsThermalOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  return (
    <div
      className="absolute bottom-3 right-3 z-20 select-none rounded-xl border border-[#1E2D45] bg-[#0C1520] shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col max-h-[50vh] sm:max-h-none overflow-y-auto custom-scrollbar"
      style={{ minWidth: 160 }}
      aria-label="Map legend"
    >
      <button
        type="button"
        onClick={() => setIsThermalOpen(!isThermalOpen)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 border-b border-[#161F2E] shrink-0 sticky top-0 bg-[#0C1520] z-10 hover:bg-[#0F1623] transition-colors cursor-pointer"
      >
        <span className="text-[8px] font-bold tracking-widest text-[#5A7090] uppercase">
          Thermal Sources
        </span>
        {isThermalOpen ? <ChevronDown className="w-3 h-3 text-[#5A7090]" /> : <ChevronRight className="w-3 h-3 text-[#5A7090]" />}
      </button>

      {isThermalOpen && (
        <div className="px-2.5 py-1.5 space-y-1.5 shrink-0">
          {CLASSIFICATION_ITEMS.map(({ type }) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: HOTSPOT_COLORS[type] }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-[#C8D4E3] font-medium">
                {SHORT_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsContextOpen(!isContextOpen)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 border-t border-b border-[#161F2E] shrink-0 sticky top-0 bg-[#0C1520] z-10 mt-1 hover:bg-[#0F1623] transition-colors cursor-pointer"
      >
        <span className="text-[8px] font-bold tracking-widest text-[#5A7090] uppercase">
          Map Context
        </span>
        {isContextOpen ? <ChevronDown className="w-3 h-3 text-[#5A7090]" /> : <ChevronRight className="w-3 h-3 text-[#5A7090]" />}
      </button>

      {isContextOpen && (
        <div className="px-2.5 py-1.5 space-y-1.5 shrink-0">
          {FACILITY_ITEMS.map(({ type }) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
                <span
                  className="text-[14px] leading-none text-[#06B6D4] font-black"
                  style={{ transform: 'translateY(-1px)' }}
                  aria-hidden="true"
                >
                  ◇
                </span>
              </div>
              <span className="text-[10px] text-[#C8D4E3] font-medium">
                {FACILITY_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
