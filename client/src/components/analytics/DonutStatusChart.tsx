import React, { useState } from 'react';
import { RecipientStatusDistribution } from '../../types';

interface DonutStatusChartProps {
  data: RecipientStatusDistribution | null;
  size?: number;
}

interface Segment {
  label: string;
  count: number;
  pct: number;
  color: string;
  key: string;
}

export const DonutStatusChart: React.FC<DonutStatusChartProps> = ({ data, size = 180 }) => {
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);

  if (!data || data.total === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200"
        style={{ height: size }}
      >
        No recipient status data available.
      </div>
    );
  }

  const segments: Segment[] = [
    {
      label: 'Confirmed Sent',
      count: data.sentManuallyConfirmed,
      pct: data.percentages.sentManuallyConfirmed,
      color: '#10b981', // emerald-500
      key: 'confirmed',
    },
    {
      label: 'Chat Opened',
      count: data.chatOpened,
      pct: data.percentages.chatOpened,
      color: '#f59e0b', // amber-500
      key: 'opened',
    },
    {
      label: 'Ready / Pending',
      count: data.ready + data.pending,
      pct: Math.round((data.percentages.ready + data.percentages.pending) * 10) / 10,
      color: '#3b82f6', // blue-500
      key: 'ready',
    },
    {
      label: 'Skipped',
      count: data.skipped,
      pct: data.percentages.skipped,
      color: '#94a3b8', // slate-400
      key: 'skipped',
    },
    {
      label: 'Failed to Open',
      count: data.failedToOpen,
      pct: data.percentages.failedToOpen,
      color: '#ef4444', // red-500
      key: 'failed',
    },
  ];

  // SVG Donut calculation
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      {/* Radial Donut SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {/* Base circle background */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg) => {
            if (seg.pct <= 0) return null;
            const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePct / 100) * circumference);
            cumulativePct += seg.pct;

            return (
              <circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={activeSegment?.key === seg.key ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setActiveSegment(seg)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-bold font-mono text-slate-800 leading-tight">
            {activeSegment ? activeSegment.count : data.total}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {activeSegment ? activeSegment.label : 'Recipients'}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-2 flex-1 w-full max-w-xs text-xs">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSegment?.key === seg.key ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
            }`}
            onMouseEnter={() => setActiveSegment(seg)}
            onMouseLeave={() => setActiveSegment(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-slate-700">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-900 font-bold">{seg.count}</span>
              <span className="text-slate-400 text-[11px]">({seg.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
