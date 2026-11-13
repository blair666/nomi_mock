import React, { useState } from 'react';
import type { LabResult, TrendAnalysis } from '../shared/types';

interface FerritinTimelineChartProps {
  labs: LabResult[];
  trend: TrendAnalysis;
}

export const FerritinTimelineChart: React.FC<FerritinTimelineChartProps> = ({
  labs,
  trend,
}) => {
  const sorted = [...labs].sort((a, b) => a.year - b.year);
  const [selectedId, setSelectedId] = useState<string | null>(
    sorted.length > 0 ? sorted[sorted.length - 1].id : null
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ECE0D7] bg-white/85 p-5 text-center text-sm text-[#73636A]">
        Load the Demo Patient or add ferritin lab values to visualize the longitudinal trend.
      </div>
    );
  }

  const width = 560;
  const height = 250;
  const padLeft = 42;
  const padRight = 22;
  const padTop = 26;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(70, ...sorted.map((d) => d.value + 12));
  const minVal = 0;

  const getX = (index: number) => {
    if (sorted.length === 1) return padLeft + plotW / 2;
    return padLeft + (index / (sorted.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    return padTop + plotH - ratio * plotH;
  };

  const points = sorted.map((item, idx) => ({
    ...item,
    x: getX(idx),
    y: getY(item.value),
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 1
      ? `M ${points[0].x},${padTop + plotH} L ${points
          .map((p) => `${p.x},${p.y}`)
          .join(' L ')} L ${points[points.length - 1].x},${padTop + plotH} Z`
      : '';

  let regressionLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (sorted.length >= 2) {
    const meanX = sorted.reduce((s, d) => s + d.year, 0) / sorted.length;
    const meanY = sorted.reduce((s, d) => s + d.value, 0) / sorted.length;
    const intercept = meanY - trend.annualSlope * meanX;
    const startFit = trend.annualSlope * sorted[0].year + intercept;
    const endFit = trend.annualSlope * sorted[sorted.length - 1].year + intercept;
    regressionLine = {
      x1: points[0].x,
      y1: getY(Math.max(0, startFit)),
      x2: points[points.length - 1].x,
      y2: getY(Math.max(0, endFit)),
    };
  }

  const yWho = getY(trend.thresholds.whoDeficiencyThreshold);
  const ySuboptimal = getY(trend.thresholds.suboptimalStoreThreshold);
  const activePoint = points.find((p) => p.id === selectedId) ?? points[points.length - 1];
  const yTicks = [0, 15, 30, 50, 70].filter((t) => t <= maxVal);

  return (
    <div className="rounded-2xl border border-[#ECE0D7] bg-white/85 backdrop-blur-sm p-4 sm:p-5 min-w-0 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-medium text-[#2E1E26]">
            Ferritin Timeline (ng/mL)
          </h3>
          <p className="text-xs text-[#73636A]">
            Tap any dot to inspect that year&apos;s lab context
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums font-semibold text-[#4A2D3C]">
          {trend.annualSlope > 0 ? `+${trend.annualSlope}` : trend.annualSlope} ng/mL/yr
        </span>
      </div>

      <div className="w-full min-w-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Ferritin lab values timeline chart"
        >
          <defs>
            <linearGradient id="ferritinPlumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8E5E77" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8E5E77" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* WHO < 15 ng/mL depleted zone */}
          <rect
            x={padLeft}
            y={yWho}
            width={plotW}
            height={padTop + plotH - yWho}
            fill="#FBF1F1"
            opacity="0.9"
          />

          {/* Gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#EFE6DF"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#73636A] text-[12px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* 30 ng/mL Low-store watch */}
          <line
            x1={padLeft}
            y1={ySuboptimal}
            x2={width - padRight}
            y2={ySuboptimal}
            stroke="#9A6A1E"
            strokeWidth="1.25"
            strokeDasharray="5 4"
          />
          <text
            x={width - padRight}
            y={ySuboptimal - 6}
            textAnchor="end"
            className="fill-[#9A6A1E] text-[11px] font-medium"
          >
            30 ng/mL · Low-store watch
          </text>

          {/* 15 ng/mL WHO Depleted Stores */}
          <line
            x1={padLeft}
            y1={yWho}
            x2={width - padRight}
            y2={yWho}
            stroke="#A63838"
            strokeWidth="1.25"
            strokeDasharray="4 3"
          />
          <text
            x={width - padRight}
            y={yWho - 6}
            textAnchor="end"
            className="fill-[#A63838] text-[11px] font-medium"
          >
            15 ng/mL · WHO depleted iron stores
          </text>

          {areaPath && <path d={areaPath} fill="url(#ferritinPlumFill)" />}

          {regressionLine && (
            <line
              x1={regressionLine.x1}
              y1={regressionLine.y1}
              x2={regressionLine.x2}
              y2={regressionLine.y2}
              stroke="#8E5E77"
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#4A2D3C"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
          )}

          {points.map((pt) => {
            const isSelected = pt.id === activePoint?.id;
            const isLow = pt.value < trend.thresholds.whoDeficiencyThreshold;
            const isWatch =
              !isLow && pt.value < trend.thresholds.suboptimalStoreThreshold;
            const dotColor = isLow ? '#A63838' : isWatch ? '#9A6A1E' : '#4A2D3C';

            return (
              <g
                key={pt.id}
                onClick={() => setSelectedId(pt.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${pt.dateLabel}: ${pt.value} ng/mL`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(pt.id);
                  }
                }}
              >
                <circle cx={pt.x} cy={pt.y} r="22" fill="transparent" />
                {isSelected && (
                  <circle cx={pt.x} cy={pt.y} r="12" fill={dotColor} fillOpacity="0.16" />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? '6.5' : '5'}
                  fill="#FFFFFF"
                  stroke={dotColor}
                  strokeWidth="2.75"
                />
                <text
                  x={pt.x}
                  y={pt.y - 13}
                  textAnchor="middle"
                  className="fill-[#2E1E26] text-[13px] font-mono font-semibold"
                >
                  {pt.value}
                </text>
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-[#4A3B42] text-[12px] font-medium"
                >
                  {pt.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {activePoint && (
        <div className="mt-3 pt-3 border-t border-[#ECE0D7] space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[#2E1E26]">
            <span className="font-semibold">{activePoint.dateLabel}</span>
            <span aria-hidden="true" className="text-[#73636A]">·</span>
            <span className="font-mono tabular-nums font-semibold text-[#4A2D3C]">
              {activePoint.value} {activePoint.unit}
            </span>
            <span aria-hidden="true" className="text-[#73636A]">·</span>
            <span className="text-[#73636A]">Ref: {activePoint.labReferenceRange}</span>
          </div>
          {activePoint.clinicalContext && (
            <p className="text-[#4A3B42] leading-relaxed">{activePoint.clinicalContext}</p>
          )}
        </div>
      )}
    </div>
  );
};
