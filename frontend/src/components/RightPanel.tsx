import React, { useMemo, useState } from 'react';
import { X, Flame, Building2, Compass, MapPin, Clock, Activity, Eye, Info } from 'lucide-react';
import { useMapStore } from '../store/mapStore';
import { useHotspotsQuery } from '../services/queries/useHotspotsQuery';
import { useFacilitiesQuery } from '../services/queries/useFacilitiesQuery';
import {
  HOTSPOT_LABELS,
  HOTSPOT_SUB_LABELS,
  HOTSPOT_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
} from '../types/hotspot';
import type { HotspotType, ActivityStatus, Severity } from '../types/hotspot';
import { FACILITY_LABELS } from '../types/facility';
import type { FacilityType } from '../types/facility';
import type { Hotspot } from '../types/hotspot';
import type { Facility } from '../types/facility';
import { getDistance } from '../utils/geo';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDetected(ts: string | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function getDotColor(h: Hotspot): string {
  const t = (h.mlType || h.type) as HotspotType;
  return HOTSPOT_COLORS[t] || '#64748B';
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ActivityBadge({ status }: { status?: ActivityStatus }) {
  const st = status || 'new';
  const label = ACTIVITY_STATUS_LABELS[st];
  const color = ACTIVITY_STATUS_COLORS[st];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
      style={{ backgroundColor: `${color}18`, color, borderColor: `${color}35` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
    low: { bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: 'rgba(16,185,129,0.4)', label: 'LOW' },
    medium: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', border: 'rgba(245,158,11,0.4)', label: 'MED' },
    high: { bg: 'rgba(249,115,22,0.15)', text: '#FB923C', border: 'rgba(249,115,22,0.4)', label: 'HIGH' },
    critical: { bg: 'rgba(239,68,68,0.2)', text: '#F87171', border: '#EF4444', label: 'CRIT' },
  };
  const s = cfg[severity] || cfg.low;
  return (
    <span
      className="text-[8px] font-mono font-bold uppercase rounded border px-1.5 py-0.5"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#0E1825] last:border-0">
      <div className="flex items-center gap-2 text-[#4A5D78]">
        {icon}
        <span className="text-[10px] text-[#5A7090]">{label}</span>
      </div>
      <span
        className="text-[11px] font-mono font-semibold text-right"
        style={{ color: valueColor || '#C8D4E3' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-1.5 text-xs font-medium transition-colors cursor-pointer border-b-2 ${
        active
          ? 'text-[#2D7DD2] border-[#2D7DD2]'
          : 'text-[#3B5070] border-transparent hover:text-[#7A8FA8]'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'infrastructure' | 'history';

export default function RightPanel(): React.JSX.Element | null {
  const selectedHotspotId = useMapStore((s) => s.selectedHotspotId);
  const selectedFacilityId = useMapStore((s) => s.selectedFacilityId);
  const selectHotspot = useMapStore((s) => s.selectHotspot);
  const selectFacility = useMapStore((s) => s.selectFacility);
  const minimumConfidence = useMapStore((s) => s.minimumConfidence);
  const selectedDate = useMapStore((s) => s.selectedDate);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const { data: hotspots } = useHotspotsQuery(selectedDate, minimumConfidence);
  const { data: facilities } = useFacilitiesQuery();

  const isUserSelected = selectedHotspotId !== null || selectedFacilityId !== null;

  // ── Resolve active hotspot ──────────────────────────────────────────────
  const mostCritical = useMemo<Hotspot | null>(() => {
    if (!hotspots || hotspots.length === 0) return null;
    const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (
      [...hotspots].sort((a, b) => {
        if ((rank[b.severity] || 0) !== (rank[a.severity] || 0))
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        return b.brightness - a.brightness;
      })[0] || null
    );
  }, [hotspots]);

  const activeHotspot = useMemo<Hotspot | null>(() => {
    if (selectedHotspotId && hotspots) {
      return hotspots.find((h) => h.id === selectedHotspotId) ?? null;
    }
    if (!selectedFacilityId) return mostCritical;
    return null;
  }, [selectedHotspotId, selectedFacilityId, hotspots, mostCritical]);

  const selectedFacility = useMemo<Facility | null>(() => {
    if (!selectedFacilityId || !facilities) return null;
    return facilities.find((f) => f.id === selectedFacilityId) ?? null;
  }, [selectedFacilityId, facilities]);

  const relatedFacility = useMemo<Facility | null>(() => {
    if (!activeHotspot?.facilityId || !facilities) return null;
    return facilities.find((f) => f.id === activeHotspot.facilityId) ?? null;
  }, [activeHotspot, facilities]);

  const facilityDistance = useMemo<number | null>(() => {
    if (!activeHotspot || !relatedFacility) return null;
    return getDistance(
      activeHotspot.latitude,
      activeHotspot.longitude,
      relatedFacility.latitude,
      relatedFacility.longitude,
    );
  }, [activeHotspot, relatedFacility]);

  const nearbyHistory = useMemo<Hotspot[]>(() => {
    if (!activeHotspot || !hotspots) return [];
    return hotspots
      .filter(
        (h) =>
          h.id !== activeHotspot.id &&
          (h.facilityId === activeHotspot.facilityId ||
            getDistance(h.latitude, h.longitude, activeHotspot.latitude, activeHotspot.longitude) < 25),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [activeHotspot, hotspots]);

  const parsedExplanation = useMemo(() => {
    if (!activeHotspot?.mlExplanation) return null;
    let exp = activeHotspot.mlExplanation;
    if (typeof exp === 'object') return exp;
    try {
      let parsed = JSON.parse(exp);
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // ignore double parse error
        }
      }
      return parsed;
    } catch {
      return activeHotspot.mlExplanation;
    }
  }, [activeHotspot?.mlExplanation]);

  const handleClose = () => {
    selectHotspot(null);
    selectFacility(null);
  };

  // ── Panel Header ──────────────────────────────────────────────────────────
  const PanelHeader = ({
    title,
    subtitle,
    showClose,
  }: {
    title: string;
    subtitle?: string;
    showClose?: boolean;
  }) => (
    <div className="px-3.5 py-2 border-b border-[#111A26] shrink-0 bg-[#06090F] flex items-center justify-between">
      <div className="flex items-center gap-1.5 min-w-0">
        <Info className="w-3 h-3 text-[#2D7DD2] shrink-0" />
        <span className="text-[10px] font-bold tracking-widest text-[#5A6E8A] uppercase truncate">
          {title}
        </span>
        {subtitle && (
          <span className="text-[9px] text-[#4A5D78] truncate">({subtitle})</span>
        )}
      </div>
      {showClose && (
        <button
          type="button"
          aria-label="Deselect"
          onClick={handleClose}
          className="text-[#3B4D63] hover:text-[#2D7DD2] p-1 rounded transition-colors cursor-pointer hover:bg-[#0F1A2B] shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  // ── Empty / No selection state ─────────────────────────────────────────────
  if (!activeHotspot && !selectedFacility) {
    return (
      <aside className="w-full h-full flex flex-col bg-[#080C14] overflow-hidden select-none border-l border-[#111A26]">
        <PanelHeader title="Intelligence Panel" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0C1520] border border-[#1A2535] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#2D7DD2]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#7A8FA8] leading-snug">
              Select a thermal source
            </p>
            <p className="text-[11px] text-[#3B4D63] mt-1 leading-relaxed max-w-[200px]">
              Click any point on the map to inspect its activity, classification, and nearby infrastructure.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // ── Facility selected ──────────────────────────────────────────────────────
  if (selectedFacility) {
    const nearbyHotspots = hotspots
      ? hotspots.filter(
          (h) =>
            h.facilityId === selectedFacility.id ||
            getDistance(h.latitude, h.longitude, selectedFacility.latitude, selectedFacility.longitude) < 10,
        )
      : [];

    return (
      <aside className="w-full h-full flex flex-col bg-[#080C14] overflow-hidden select-none border-l border-[#111A26]">
        <PanelHeader title="Selected Facility" showClose />

        <div className="px-4 py-3 border-b border-[#111A26] shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0C1A2E] border border-[#1A2D47] flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-4 h-4 text-[#2D7DD2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#D0DAE8] leading-snug">
                {selectedFacility.name}
              </h2>
              <p className="text-[11px] text-[#5A7090] mt-0.5">
                {selectedFacility.city}, {selectedFacility.state}
              </p>
              <p className="font-mono text-[9px] text-[#3B4D63] mt-1">
                {selectedFacility.latitude.toFixed(4)}°N, {selectedFacility.longitude.toFixed(4)}°E
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0C1520] p-2.5 rounded-lg border border-[#111A26]">
              <span className="text-[8px] font-bold text-[#3B5070] uppercase block mb-1">Type</span>
              <span className="text-xs font-semibold text-[#C8D4E3]">
                {FACILITY_LABELS[selectedFacility.type as FacilityType] || 'Industrial'}
              </span>
            </div>
            <div className="bg-[#0C1520] p-2.5 rounded-lg border border-[#111A26]">
              <span className="text-[8px] font-bold text-[#3B5070] uppercase block mb-1">
                Nearby Detections
              </span>
              <span className="text-base font-bold text-[#C8D4E3]">{nearbyHotspots.length}</span>
            </div>
          </div>

          {nearbyHotspots.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider block mb-2">
                Associated Detections
              </span>
              <div className="space-y-1.5">
                {nearbyHotspots.slice(0, 6).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => selectHotspot(h.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0C1520] border border-[#111A26] rounded-lg hover:bg-[#0F1D2E] transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getDotColor(h) }}
                      />
                      <span className="text-[10px] text-[#7A8FA8]">
                        {HOTSPOT_LABELS[(h.mlType || h.type) as HotspotType]}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#C8D4E3]">
                      {h.brightness} K
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (!activeHotspot) return null;

  // ── Hotspot selected ──────────────────────────────────────────────────────
  const rawType = (activeHotspot.mlType || activeHotspot.type || 'unknown') as HotspotType;
  const isUnknown = rawType === 'unknown';
  const typeColor = HOTSPOT_COLORS[rawType];
  const mlLabel = HOTSPOT_LABELS[rawType];
  const mlSubLabel = HOTSPOT_SUB_LABELS[rawType];

  return (
    <aside className="w-full h-full flex flex-col bg-[#080C14] overflow-hidden select-none border-l border-[#111A26]">
      {/* Upper Panel Header */}
      <PanelHeader title="Hotspot Intelligence" showClose={isUserSelected} />

      {/* Header Info Block */}
      <div className="px-3.5 py-2.5 border-b border-[#111A26] shrink-0 bg-[#06090F]">
        {/* Top row: badges */}
        <div className="flex items-center justify-between mb-2">
          <ActivityBadge status={activeHotspot.activityStatus} />
          <SeverityBadge severity={activeHotspot.severity} />
        </div>

        {/* Classification block */}
        <div className="flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${typeColor}18`, border: `1px solid ${typeColor}35` }}
          >
            <Flame className="w-4 h-4" style={{ color: typeColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-[#D0DAE8] leading-tight truncate">{mlLabel}</h2>
            <p className="text-[9px] font-mono text-[#4A5D78] mt-0.5 truncate">{mlSubLabel}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[8px] font-bold text-[#10B981] bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 rounded border border-[rgba(16,185,129,0.2)]">
                FIRMS {activeHotspot.confidence}%
              </span>
              {activeHotspot.mlConfidence != null && (
                <span className="text-[8px] font-mono text-[#38BDF8] bg-[rgba(56,189,248,0.1)] px-1.5 py-0.5 rounded border border-[rgba(56,189,248,0.2)]">
                  ML {(activeHotspot.mlConfidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Under review note */}
        {isUnknown && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-[rgba(100,116,139,0.1)] border border-[rgba(100,116,139,0.2)] flex items-start gap-1.5">
            <Info className="w-3 h-3 text-[#64748B] mt-0.5 shrink-0" />
            <p className="text-[9px] text-[#64748B] leading-relaxed">
              Insufficient evidence for confident classification. Will update as additional FIRMS passes observe this location.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-[#0E1825]">
          <Tab label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <Tab label="Nearby" active={activeTab === 'infrastructure'} onClick={() => setActiveTab('infrastructure')} />
          <Tab
            label={`History${nearbyHistory.length > 0 ? ` (${nearbyHistory.length})` : ''}`}
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-8 space-y-2.5">
        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-2.5">
            {/* 1. THERMAL SIGNAL */}
            <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider">
                  THERMAL SIGNAL
                </span>
                <span className="text-[8px] font-mono text-[#EF4444] font-semibold">FIRMS SATELLITE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#080C14] p-2 rounded border border-[#111A26]">
                  <span className="text-[8px] font-semibold text-[#5A7090] uppercase block mb-0.5">
                    FRP Intensity
                  </span>
                  <span className="text-xs font-mono font-bold text-[#EF4444]">
                    {activeHotspot.frp ? `${activeHotspot.frp} MW` : '—'}
                  </span>
                </div>
                <div className="bg-[#080C14] p-2 rounded border border-[#111A26]">
                  <span className="text-[8px] font-semibold text-[#5A7090] uppercase block mb-0.5">
                    Brightness
                  </span>
                  <span className="text-xs font-mono font-bold text-[#F97316]">
                    {activeHotspot.brightness} K
                  </span>
                </div>
              </div>
              <StatRow
                icon={<Eye className="w-3 h-3 text-[#2D7DD2]" />}
                label="Observation Count"
                value={`${activeHotspot.sourceObsCount || 1}`}
              />
            </div>

            {/* 2. ACTIVITY */}
            <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
              <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider block mb-2">
                ACTIVITY
              </span>
              <StatRow
                icon={<Clock className="w-3 h-3 text-[#5A7090]" />}
                label="First Seen"
                value={formatDetected(activeHotspot.firstSeen || activeHotspot.timestamp)}
              />
              <StatRow
                icon={<Clock className="w-3 h-3 text-[#5A7090]" />}
                label="Last Seen"
                value={formatDetected(activeHotspot.lastSeen || activeHotspot.timestamp)}
              />
              <StatRow
                icon={<Activity className="w-3 h-3 text-[#38BDF8]" />}
                label="Source Persistence"
                value={
                  (activeHotspot.sourceObsCount || 1) === 1
                    ? 'New / Single observation'
                    : (activeHotspot.sourceObsCount || 1) >= 3
                    ? 'Persistent Source'
                    : 'Recurring / Active'
                }
                valueColor={(activeHotspot.sourceObsCount || 1) === 1 ? '#38BDF8' : '#F59E0B'}
              />
            </div>

            {/* 3. LOCATION */}
            <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider">
                  LOCATION
                </span>
                <span className="text-[8px] font-mono text-[#2D7DD2]">EPSG:4326</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#080C14] p-2 rounded border border-[#111A26]">
                  <span className="text-[8px] font-semibold text-[#5A7090] uppercase block mb-0.5">Latitude</span>
                  <span className="text-[11px] font-mono font-bold text-[#C8D4E3]">
                    {activeHotspot.latitude.toFixed(5)}°N
                  </span>
                </div>
                <div className="bg-[#080C14] p-2 rounded border border-[#111A26]">
                  <span className="text-[8px] font-semibold text-[#5A7090] uppercase block mb-0.5">Longitude</span>
                  <span className="text-[11px] font-mono font-bold text-[#C8D4E3]">
                    {activeHotspot.longitude.toFixed(5)}°E
                  </span>
                </div>
              </div>
              {relatedFacility && (
                <p className="text-[9px] text-[#5A7090] mt-2 border-t border-[#0E1825] pt-1.5">
                  Near <span className="text-[#C8D4E3] font-semibold">{relatedFacility.name}</span>
                  {facilityDistance != null && ` (${facilityDistance.toFixed(1)} km)`}
                </p>
              )}
            </div>

            {/* 4. ENVIRONMENT / LAND COVER */}
            <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
              <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider block mb-1.5">
                ENVIRONMENT / LAND COVER
              </span>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#10B981] border border-white/10" />
                <div>
                  <span className="text-[11px] font-semibold text-[#C8D4E3] block">
                    {activeHotspot.landCoverName || 'Unknown Land Cover'}
                  </span>
                  <span className="text-[8px] text-[#3B4D63] font-mono">
                    ESA WorldCover 2021 • 10m
                  </span>
                </div>
              </div>
            </div>

            {/* 5. OSM CONTEXT SUMMARY CARD */}
            {activeHotspot.osmContext && activeHotspot.osmContext.length > 0 && (
              <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-[#38BDF8] uppercase tracking-wider">
                    OSM CONTEXT
                  </span>
                  <span className="text-[8px] font-mono text-[#5A7090]">
                    {activeHotspot.osmContext[0].distanceKm > 15 ? 'NEAREST MAPPED' : 'LOCAL'}
                  </span>
                </div>
                <div className="bg-[#080C14] p-2 rounded border border-[#111A26] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[8px] font-semibold text-[#5A7090] uppercase block">
                      Nearest Mapped Facility
                    </span>
                    <span className="text-xs font-semibold text-[#C8D4E3] block capitalize truncate">
                      {activeHotspot.osmContext[0].name || activeHotspot.osmContext[0].featureType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#38BDF8] bg-[#0C1520] px-2 py-1 rounded border border-[#1E2D45] shrink-0">
                    {activeHotspot.osmContext[0].distanceKm.toFixed(1)} km
                  </span>
                </div>
              </div>
            )}

            {/* 6. MODEL EVIDENCE / EXPLANATION CARD */}
            {parsedExplanation && (
              <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-[#38BDF8] uppercase tracking-wider">
                    MODEL DECISION FACTORS
                  </span>
                  <span className="text-[8px] font-mono text-[#5A7090]">
                    {activeHotspot.modelVersion || 'thermalwatch-v1'}
                  </span>
                </div>
                {typeof parsedExplanation === 'object' && !Array.isArray(parsedExplanation) ? (
                  <div className="space-y-1">
                    {Object.entries(parsedExplanation).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-[10px] py-0.5 border-b border-[#0E1825] last:border-0 gap-2">
                        <span className="text-[#5A7090] font-mono capitalize truncate shrink-0 max-w-[65%]">{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono font-bold text-[#38BDF8] text-right truncate">
                          {typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(2) : val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-[#7A8FA8] leading-relaxed break-words overflow-hidden whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {String(parsedExplanation)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NEAREST INFRASTRUCTURE TAB ─────────────────────────────────── */}
        {activeTab === 'infrastructure' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Compass className="w-3.5 h-3.5 text-[#2D7DD2]" />
              <span className="text-[9.5px] font-bold text-[#D0DAE8] uppercase tracking-wider">
                NEAREST INFRASTRUCTURE (OSM)
              </span>
            </div>

            {activeHotspot.osmContext && activeHotspot.osmContext.length > 0 ? (
              <div className="space-y-2">
                {activeHotspot.osmContext.map((osm, idx) => {
                  const isDistant = osm.distanceKm > 15;
                  return (
                    <div
                      key={osm.id || idx}
                      className="bg-[#0C1520] p-3 rounded-lg border border-[#111A26] flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#E8EDF5] block capitalize">
                            {osm.name || osm.featureType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] font-mono text-[#5A7090] uppercase tracking-wider">
                            {osm.featureType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#38BDF8] bg-[#080C14] px-2 py-1 rounded border border-[#1E2D45] shrink-0">
                          {osm.distanceKm.toFixed(1)} km away
                        </span>
                      </div>

                      {isDistant && (
                        <div className="text-[8.5px] font-mono text-[#7A8FA8] bg-[#080C14] px-2 py-1 rounded border border-[#111A26]">
                          Nearest mapped facility — {osm.distanceKm.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="p-2.5 rounded-lg bg-[#06090F] border border-[#111A26]">
                  <p className="text-[8.5px] text-[#5A7090] italic leading-relaxed">
                    Nearest mapped feature in available dataset — does not confirm physical ownership or direct association.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-6 text-center">
                <Compass className="w-6 h-6 text-[#2A3D55] mx-auto mb-2" />
                <p className="text-[11px] font-medium text-[#7A8FA8]">
                  No mapped infrastructure available.
                </p>
                <p className="text-[9px] text-[#4A5D78] mt-1">
                  No matching feature found in the current OpenStreetMap dataset.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="p-3 space-y-1.5">
            <span className="text-[9px] font-bold text-[#3B5070] uppercase tracking-wider block mb-2">
              Nearby Detections ({nearbyHistory.length})
            </span>
            {nearbyHistory.length === 0 ? (
              <div className="bg-[#0C1520] rounded-lg border border-[#111A26] p-4 text-center">
                <p className="text-[10px] text-[#3B4D63]">No prior detections recorded nearby.</p>
              </div>
            ) : (
              nearbyHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectHotspot(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#0C1520] border border-[#111A26] rounded-lg hover:bg-[#0F1D2E] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getDotColor(item) }}
                    />
                    <span className="font-mono text-[9px] text-[#7A8FA8]">
                      {formatDetected(item.timestamp)}
                    </span>
                  </div>
                  <SeverityBadge severity={item.severity} />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
