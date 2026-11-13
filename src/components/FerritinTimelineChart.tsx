import React, { useState } from 'react';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import type { LabResult, TrendAnalysis } from '../shared/types';

interface FerritinTimelineChartProps {
  labs: LabResult[];
  trend: TrendAnalysis;
}

type ChartMode = 'line' | 'bar' | 'pie';

function describeDonutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);

  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);

  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export const FerritinTimelineChart: React.FC<FerritinTimelineChartProps> = ({
  labs,
  trend,
}) => {
  const sorted = [...labs].sort(
    (a, b) => a.year - b.year || a.dateLabel.localeCompare(b.dateLabel)
  );
  const [chartMode, setChartMode] = useState<ChartMode>('line');
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
  const padLeft = 46;
  const padRight = 34;
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

  const getPointColor = (value: number, idx: number) => {
    if (value < trend.thresholds.whoDeficiencyThreshold) return '#B3534B';
    if (value < trend.thresholds.suboptimalStoreThreshold) return '#BA7D32';
    const healthyColors = ['#466B56', '#68455A', '#5C7B69', '#4A2D3C'];
    return healthyColors[idx % healthyColors.length];
  };

  // Bar geometry
  const barSlotW = plotW / Math.max(sorted.length, 1);
  const barW = Math.min(54, Math.max(26, barSlotW * 0.52));

  // Pie / Donut geometry
  const totalFerritin = sorted.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const slicePalette = ['#466B56', '#8E5E77', '#BA7D32', '#B3534B', '#5A6D82', '#6C5B63'];
  let runningAngle = -Math.PI / 2;
  const pieSlices = sorted.map((item, idx) => {
    const val = Math.max(0, item.value);
    const share = totalFerritin > 0 ? val / totalFerritin : 1 / sorted.length;
    const sweep = share * Math.PI * 2;
    const startAngle = runningAngle;
    const endAngle = runningAngle + sweep;
    const midAngle = startAngle + sweep / 2;
    runningAngle = endAngle;
    const isLow = item.value < trend.thresholds.whoDeficiencyThreshold;
    const isWatch = !isLow && item.value < trend.thresholds.suboptimalStoreThreshold;
    const color = isLow
      ? '#B3534B'
      : isWatch
      ? '#BA7D32'
      : slicePalette[idx % slicePalette.length];
    return {
      ...item,
      sharePercent: Math.round(share * 1000) / 10,
      startAngle,
      endAngle,
      midAngle,
      color,
    };
  });

  const activeSlice =
    pieSlices.find((s) => s.id === activePoint?.id) ?? pieSlices[pieSlices.length - 1];

  return (
    <div className="rounded-2xl border border-[#ECE0D7] bg-white/85 backdrop-blur-sm p-4 sm:p-5 min-w-0 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-medium text-[#2E1E26]">
            Ferritin Visuals (ng/mL)
          </h3>
          <p className="text-xs text-[#73636A]">
            {chartMode === 'pie'
              ? 'Tap or hover any slice to compare recorded years'
              : 'Tap or hover any year to inspect lab context'}
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums font-semibold text-[#4A2D3C]">
          {trend.annualSlope > 0 ? `+${trend.annualSlope}` : trend.annualSlope} ng/mL/yr
        </span>
      </div>

      {/* Interactive Chart Type Switcher (Line / Bar / Pie) */}
      <div
        role="group"
        aria-label="Chart visual type"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-[#FAF5EF] border border-[#EAE2D8] mb-3"
      >
        {(
          [
            { id: 'line', label: 'Line', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'bar', label: 'Bar', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'pie', label: 'Pie', icon: <PieChartIcon className="w-3.5 h-3.5" /> },
          ] as const
        ).map((mode) => {
          const isActive = chartMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setChartMode(mode.id)}
              aria-pressed={isActive}
              className={`min-h-[38px] rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isActive
                  ? 'bg-[#2B1810] text-[#FAF5EF] shadow-xs'
                  : 'text-[#5C4D44] hover:text-[#2B1810]'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* LINE CHART */}
      {chartMode === 'line' && (
        <div className="w-full min-w-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Ferritin lab values line chart"
          >
            <defs>
              <linearGradient id="ferritinPlumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8E5E77" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8E5E77" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            <rect
              x={padLeft}
              y={yWho}
              width={plotW}
              height={padTop + plotH - yWho}
              fill="#FBF1F1"
              opacity="0.9"
            />

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
                  onMouseEnter={() => setSelectedId(pt.id)}
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
                    className="fill-[#4A3B42] text-[11px] font-mono font-medium"
                  >
                    {pt.dateLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* BAR CHART */}
      {chartMode === 'bar' && (
        <div className="w-full min-w-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Ferritin lab values bar chart"
          >
            <rect
              x={padLeft}
              y={yWho}
              width={plotW}
              height={padTop + plotH - yWho}
              fill="#FBF1F1"
              opacity="0.75"
            />

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

            {sorted.map((item, idx) => {
              const cx = padLeft + barSlotW * idx + barSlotW / 2;
              const barY = getY(item.value);
              const barH = Math.max(4, padTop + plotH - barY);
              const isSelected = item.id === activePoint?.id;
              const fill = getPointColor(item.value, idx);

              return (
                <g
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onMouseEnter={() => setSelectedId(item.id)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.dateLabel}: ${item.value} ng/mL`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                >
                  <rect
                    x={cx - barW / 2 - 6}
                    y={padTop}
                    width={barW + 12}
                    height={plotH}
                    fill="transparent"
                  />
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx="8"
                    fill={fill}
                    fillOpacity={isSelected ? 0.95 : 0.72}
                    stroke={isSelected ? '#2B1810' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                  <text
                    x={cx}
                    y={barY - 8}
                    textAnchor="middle"
                    className="fill-[#2E1E26] text-[13px] font-mono font-semibold"
                  >
                    {item.value}
                  </text>
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-[#4A3B42] text-[11px] font-mono font-medium"
                  >
                    {item.year}
                  </text>
                </g>
              );
            })}

            <line
              x1={padLeft}
              y1={ySuboptimal}
              x2={width - padRight}
              y2={ySuboptimal}
              stroke="#9A6A1E"
              strokeWidth="1.25"
              strokeDasharray="5 4"
            />
            <line
              x1={padLeft}
              y1={yWho}
              x2={width - padRight}
              y2={yWho}
              stroke="#A63838"
              strokeWidth="1.25"
              strokeDasharray="4 3"
            />
          </svg>
        </div>
      )}

      {/* PIE / DONUT CHART */}
      {chartMode === 'pie' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-[190px] h-[190px] shrink-0">
              <svg
                viewBox="0 0 210 210"
                className="w-full h-full block"
                role="img"
                aria-label="Ferritin recorded values proportional pie chart"
              >
                {pieSlices.length === 1 ? (
                  <circle
                    cx={105}
                    cy={105}
                    r={62}
                    fill="none"
                    stroke={pieSlices[0].color}
                    strokeWidth={32}
                    onClick={() => setSelectedId(pieSlices[0].id)}
                    className="cursor-pointer"
                  />
                ) : (
                  pieSlices.map((slice) => {
                    const isSelected = slice.id === activeSlice?.id;
                    const offset = isSelected ? 5 : 0;
                    const tx = Math.cos(slice.midAngle) * offset;
                    const ty = Math.sin(slice.midAngle) * offset;
                    return (
                      <path
                        key={slice.id}
                        d={describeDonutArc(
                          105,
                          105,
                          78,
                          44,
                          slice.startAngle,
                          slice.endAngle
                        )}
                        transform={`translate(${tx}, ${ty})`}
                        fill={slice.color}
                        fillOpacity={isSelected ? 1 : 0.78}
                        stroke="#FAF5EF"
                        strokeWidth="2.5"
                        className="cursor-pointer transition-all"
                        onClick={() => setSelectedId(slice.id)}
                        onMouseEnter={() => setSelectedId(slice.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${slice.year}: ${slice.value} ng/mL (${slice.sharePercent}%)`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(slice.id);
                          }
                        }}
                      />
                    );
                  })
                )}

                {activeSlice && (
                  <g className="pointer-events-none">
                    <text
                      x="105"
                      y="96"
                      textAnchor="middle"
                      className="fill-[#73636A] text-[11px] font-mono font-semibold"
                    >
                      {activeSlice.year}
                    </text>
                    <text
                      x="105"
                      y="115"
                      textAnchor="middle"
                      className="fill-[#2E1E26] text-[17px] font-mono font-bold"
                    >
                      {activeSlice.value}
                    </text>
                    <text
                      x="105"
                      y="130"
                      textAnchor="middle"
                      className="fill-[#73636A] text-[10px]"
                    >
                      {activeSlice.sharePercent}% share
                    </text>
                  </g>
                )}
              </svg>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-1 gap-1.5 min-w-0">
              {pieSlices.map((slice) => {
                const isSelected = slice.id === activeSlice?.id;
                return (
                  <button
                    key={slice.id}
                    type="button"
                    onClick={() => setSelectedId(slice.id)}
                    onMouseEnter={() => setSelectedId(slice.id)}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#FAF5EF] border-[#2B1810] shadow-xs'
                        : 'bg-[#FAF5EF]/70 border-[#EAE2D8]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-[11px] font-mono font-semibold text-[#2B1810]">
                        {slice.year}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono text-[#594C44] shrink-0">
                      {slice.value} <span className="text-[#73636A]">({slice.sharePercent}%)</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-[#73636A] leading-snug">
            Pie view compares each recorded year&apos;s share of total measured ferritin across your
            logged results; switch to Line or Bar to view clinical threshold lines.
          </p>
        </div>
      )}

      {activePoint && (
        <div className="mt-3 pt-3 border-t border-[#ECE0D7] space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[#2E1E26]">
            <span className="font-semibold">{activePoint.dateLabel}</span>
            <span aria-hidden="true" className="text-[#73636A]">
              ·
            </span>
            <span className="font-mono tabular-nums font-semibold text-[#4A2D3C]">
              {activePoint.value} {activePoint.unit}
            </span>
            <span aria-hidden="true" className="text-[#73636A]">
              ·
            </span>
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
