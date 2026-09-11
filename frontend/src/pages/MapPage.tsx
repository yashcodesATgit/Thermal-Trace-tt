import React, { useRef, useState, useEffect } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import Navbar from '../components/Navbar';
import KpiStrip from '../components/KpiStrip';
import Map from '../components/Map';
import MapControls from '../components/MapControls';
import MapLegend from '../components/MapLegend';
import ActivityRail from '../components/ActivityRail';
import RightPanel from '../components/RightPanel';
import BottomAnalytics from '../components/BottomAnalytics';
import { SlidersHorizontal, Info, X } from 'lucide-react';
import { useMapStore } from '../store/mapStore';

export default function MapPage(): React.JSX.Element {
  const mapRef = useRef<MapRef>(null!);
  const fetchAndSetLatestDate = useMapStore((s) => s.fetchAndSetLatestDate);
  const selectedHotspotId = useMapStore((s) => s.selectedHotspotId);
  const selectedFacilityId = useMapStore((s) => s.selectedFacilityId);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPanelDrawerOpen, setIsPanelDrawerOpen] = useState(false);

  useEffect(() => {
    fetchAndSetLatestDate();
  }, [fetchAndSetLatestDate]);

  // Auto-open panel drawer on mobile when something is selected
  useEffect(() => {
    if (selectedHotspotId || selectedFacilityId) {
      if (window.innerWidth < 1024) {
        setIsPanelDrawerOpen(true);
      }
    }
  }, [selectedHotspotId, selectedFacilityId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060912] text-[#D0DAE8] select-none">
      {/* ── 1. TOP NAVIGATION ─────────────────────────────────────────── */}
      <Navbar />

      {/* ── 2. KPI STRIP ──────────────────────────────────────────────── */}
      <KpiStrip />

      {/* ── 3. MAIN WORKSPACE ─────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 flex w-full overflow-hidden relative">
        {/* ── LEFT: Activity/Filter Rail (desktop only - Full Height) ─── */}
        <div className="hidden lg:block w-[220px] xl:w-[240px] shrink-0 h-full overflow-hidden border-r border-[#111A26]">
          <ActivityRail />
        </div>

        {/* ── CENTER: Map & Thermal Activity Trend Chart ────────────── */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative bg-[#060912]">
          {/* Map view area */}
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            <Map mapRef={mapRef} />
            <MapControls mapRef={mapRef} />
            <MapLegend />

            {/* Mobile floating buttons */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                aria-label="Open filters"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#080C14]/90 border border-[#1E2D45] text-[#D0DAE8] shadow-lg backdrop-blur-md hover:bg-[#0F1A2B] transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D7DD2]" />
                <span>Filters</span>
              </button>
            </div>

            <div className="absolute top-3 right-24 z-30 flex items-center gap-2 xl:hidden">
              <button
                type="button"
                onClick={() => setIsPanelDrawerOpen(true)}
                aria-label="Open intelligence panel"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#080C14]/90 border border-[#1E2D45] text-[#D0DAE8] shadow-lg backdrop-blur-md hover:bg-[#0F1A2B] transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-[#2D7DD2]" />
                <span className="hidden sm:inline">Intelligence</span>
              </button>
            </div>
          </div>

          {/* Thermal Activity Trend / Bottom Analytics Strip (100% width of center column) */}
          <div className="h-[140px] sm:h-[152px] shrink-0 w-full border-t border-[#111A26] overflow-hidden">
            <BottomAnalytics />
          </div>
        </div>

        {/* ── RIGHT: Intelligence Panel (desktop xl+ - Full Height) ──── */}
        <div className="hidden xl:block w-[300px] 2xl:w-[320px] shrink-0 h-full overflow-hidden border-l border-[#111A26]">
          <RightPanel />
        </div>
      </main>

      {/* ── FILTER DRAWER (< lg) ──────────────────────────────────────── */}
      {isFilterDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-start lg:hidden"
          onClick={() => setIsFilterDrawerOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Filter panel"
        >
          <div
            className="w-[240px] h-full bg-[#080C14] border-r border-[#1E2D45] flex flex-col relative shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-[#1E2D45] flex items-center justify-between bg-[#06090F] shrink-0">
              <span className="text-[10px] font-bold text-[#3B5070] uppercase tracking-widest">
                Filters
              </span>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                aria-label="Close filter panel"
                className="p-1 text-[#3B5070] hover:text-[#D0DAE8] rounded-md bg-[#0C1520] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ActivityRail />
            </div>
          </div>
        </div>
      )}

      {/* ── INTELLIGENCE PANEL DRAWER (< xl) ──────────────────────────── */}
      {isPanelDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end xl:hidden"
          onClick={() => setIsPanelDrawerOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Intelligence panel"
        >
          <div
            className="w-[300px] max-w-[calc(100vw-2rem)] h-full bg-[#080C14] border-l border-[#1E2D45] flex flex-col relative shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-[#1E2D45] flex items-center justify-between bg-[#06090F] shrink-0">
              <span className="text-[10px] font-bold text-[#3B5070] uppercase tracking-widest">
                Intelligence Panel
              </span>
              <button
                onClick={() => setIsPanelDrawerOpen(false)}
                aria-label="Close intelligence panel"
                className="p-1 text-[#3B5070] hover:text-[#D0DAE8] rounded-md bg-[#0C1520] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RightPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
