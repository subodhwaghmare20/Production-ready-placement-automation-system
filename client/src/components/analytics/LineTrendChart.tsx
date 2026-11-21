import React, { useState } from 'react';
import { CampaignTrendItem } from '../../types';

interface LineTrendChartProps {
  data: CampaignTrendItem[];
  height?: number;
}

export const LineTrendChart: React.FC<LineTrendChartProps> = ({ data, height = 240 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200"
        style={{ height }}
      >
        No trend activity recorded for the selected date range.
      </div>
    );
  }

  const padding = { top: 20, right: 24, bottom: 32, left: 36 };
  const width = 600; // SVG viewBox coordinate width
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.recipientsCount || 0, d.messagesConfirmed || 0, d.campaignsCreated || 0)),
    5
  );

  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + chartW / 2;
    return padding.left + (idx / (data.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padding.top + chartH - (val / maxVal) * chartH;
  };

  // Build SVG path strings
  const recipientsPoints = data.map((d, i) => `${getX(i)},${getY(d.recipientsCount)}`).join(' ');
  const confirmedPoints = data.map((d, i) => `${getX(i)},${getY(d.messagesConfirmed)}`).join(' ');

  const recipientsArea =
    data.length > 1
      ? `M ${getX(0)},${getY(data[0].recipientsCount)} ` +
        data.slice(1).map((d, i) => `L ${getX(i + 1)},${getY(d.recipientsCount)}`).join(' ') +
        ` L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`
      : '';

  const confirmedArea =
    data.length > 1
      ? `M ${getX(0)},${getY(data[0].messagesConfirmed)} ` +
        data.slice(1).map((d, i) => `L ${getX(i + 1)},${getY(d.messagesConfirmed)}`).join(' ') +
        ` L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`
      : '';

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="recipientsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + chartH * (1 - pct);
          const valLabel = Math.round(maxVal * pct);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Shaded Areas */}
        {recipientsArea && <path d={recipientsArea} fill="url(#recipientsGrad)" />}
        {confirmedArea && <path d={confirmedArea} fill="url(#confirmedGrad)" />}

        {/* Lines */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={recipientsPoints}
        />
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={confirmedPoints}
        />

        {/* Data points & X-Labels */}
        {data.map((d, i) => {
          const x = getX(i);
          const yRec = getY(d.recipientsCount);
          const yConf = getY(d.messagesConfirmed);
          const isHovered = hoveredIdx === i;

          return (
            <g key={i}>
              {/* Vertical Guide on hover */}
              {isHovered && (
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartH}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Data dots */}
              <circle
                cx={x}
                cy={yRec}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth="2.5"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <circle
                cx={x}
                cy={yConf}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* X-axis Label */}
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-medium"
              >
                {d.period.length > 7 ? d.period.slice(5) : d.period}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-10 p-2 text-xs bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((getX(hoveredIdx) - padding.left) / chartW) * 85 + 7}%`,
            top: `${getY(data[hoveredIdx].recipientsCount) - 10}px`,
          }}
        >
          <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">
            Period: {data[hoveredIdx].period}
          </p>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Recipients Volume:
            </span>
            <span className="font-mono font-bold">{data[hoveredIdx].recipientsCount}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Confirmed Sends:
            </span>
            <span className="font-mono font-bold">{data[hoveredIdx].messagesConfirmed}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pt-0.5">
            <span>Campaigns:</span>
            <span className="font-mono font-semibold">{data[hoveredIdx].campaignsCreated}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-blue-500 rounded-full" />
          <span>Recipients Volume</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-emerald-500 rounded-full" />
          <span>Confirmed Sends</span>
        </div>
      </div>
    </div>
  );
};
