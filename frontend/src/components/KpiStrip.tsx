import React, { useMemo } from 'react';
import { Flame, Layers, Activity, Factory, Pickaxe, TreePine, HelpCircle } from 'lucide-react';
import { useHotspotsQuery } from '../services/queries/useHotspotsQuery';
import { useMapStore } from '../store/mapStore';
import type { HotspotType } from '../types/hotspot';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  isPrimary?: boolean;
  subLabel?: string;
}

function KpiCard({ label, value, icon, color, isPrimary = false, subLabel }: KpiCardProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors select-none ${
        isPrimary
          ? 'bg-[#0F1623] border-[#1E2D45]'
          : 'bg-[#090D16] border-[#161F2E]'
      }`}
    >
      <div
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div
          className={`font-mono font-bold leading-none ${
            isPrimary ? 'text-base text-[#E8EDF5]' : 'text-sm text-[#C8D4E3]'
          }`}
          style={{ color: isPrimary ? color : undefined }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className={`truncate mt-0.5 ${isPrimary ? 'text-[10px] text-[#7A8FA8]' : 'text-[9px] text-[#4A5D78]'}`}>
          {label}
        </div>
        {subLabel && (
          <div className="text-[8px] text-[#3B4D63] font-mono truncate mt-0.5">{subLabel}</div>
        )}
      </div>
    </div>
  );
}

export default function KpiStrip(): React.JSX.Element {
  const selectedDate = useMapStore((s) => s.selectedDate);
  const minimumConfidence = useMapStore((s) => s.minimumConfidence);

  const { data: hotspots } = useHotspotsQuery(selectedDate, minimumConfidence);

  const metrics = useMemo(() => {
    const counts: Record<HotspotType, number> = {
      industrial_thermal_source: 0,
      mining_thermal_source: 0,
      natural_fire: 0,
      unknown: 0,
    };

    const uniqueSourceIds = new Set<string>();
    let persistentCount = 0;

    if (hotspots) {
      hotspots.forEach((h) => {
        const type = (h.mlType || h.type || 'unknown') as HotspotType;
        if (counts[type] !== undefined) counts[type]++;
        else counts.unknown++;

        const latR = h.latitude.toFixed(3);
        const lngR = h.longitude.toFixed(3);
        uniqueSourceIds.add(`${latR}_${lngR}`);

        if (h.activityStatus === 'persistent') persistentCount++;
      });
    }

    return {
      total: hotspots?.length || 0,
      unique: uniqueSourceIds.size,
      persistent: persistentCount,
      industrial: counts.industrial_thermal_source,
      mining: counts.mining_thermal_source,
      naturalFire: counts.natural_fire,
      underReview: counts.unknown,
    };
  }, [hotspots]);

  return (
    <div className="shrink-0 bg-[#080C14] border-b border-[#1E2D45] px-3 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {/* Primary KPIs */}
        <KpiCard
          label="FIRMS Detections"
          value={metrics.total}
          icon={<Flame className="w-3.5 h-3.5" />}
          color="#EF4444"
          isPrimary
          subLabel="Raw thermal obs."
        />
        <div className="w-px h-8 bg-[#1E2D45] shrink-0" />
        <KpiCard
          label="Unique Sources"
          value={metrics.unique}
          icon={<Layers className="w-3.5 h-3.5" />}
          color="#38BDF8"
          isPrimary
          subLabel="Spatial grid"
        />
        <KpiCard
          label="Persistent"
          value={metrics.persistent}
          icon={<Activity className="w-3.5 h-3.5" />}
          color="#F59E0B"
          isPrimary
          subLabel="Sustained sources"
        />

        {/* Divider */}
        <div className="w-px h-8 bg-[#1E2D45] shrink-0" />

        {/* Secondary KPIs */}
        <KpiCard
          label="Industrial"
          value={metrics.industrial}
          icon={<Factory className="w-3 h-3" />}
          color="#FF4444"
          subLabel="ML: Industrial"
        />
        <KpiCard
          label="Mining"
          value={metrics.mining}
          icon={<Pickaxe className="w-3 h-3" />}
          color="#FF8C00"
          subLabel="ML: Mining"
        />
        <KpiCard
          label="Natural Fire"
          value={metrics.naturalFire}
          icon={<TreePine className="w-3 h-3" />}
          color="#10B981"
          subLabel="ML: Natural fire"
        />
        <KpiCard
          label="Under Review"
          value={metrics.underReview}
          icon={<HelpCircle className="w-3 h-3" />}
          color="#64748B"
          subLabel="ML: Unclassified"
        />
      </div>
    </div>
  );
}
