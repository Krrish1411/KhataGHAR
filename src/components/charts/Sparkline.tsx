import React from 'react';

export interface SparklineProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: 'emerald' | 'rose' | 'amber' | 'sky' | 'auto';
  strokeWidth?: number;
  showGradient?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 28,
  color = 'auto',
  strokeWidth = 1.75,
  showGradient = true,
  className = '',
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={`inline-block ${className}`} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 2;
  const h = height - padding * 2;
  const w = 100; // Normalized coordinate width

  // Determine color based on trend if auto
  const isPositive = data[data.length - 1] >= data[0];
  const activeColor =
    color === 'auto'
      ? isPositive
        ? 'emerald'
        : 'rose'
      : color;

  const colorConfig = {
    emerald: {
      stroke: '#10B981',
      fillStart: 'rgba(16, 185, 129, 0.25)',
      fillEnd: 'rgba(16, 185, 129, 0.0)',
    },
    rose: {
      stroke: '#F43F5E',
      fillStart: 'rgba(244, 63, 94, 0.25)',
      fillEnd: 'rgba(244, 63, 94, 0.0)',
    },
    amber: {
      stroke: '#F59E0B',
      fillStart: 'rgba(245, 158, 11, 0.25)',
      fillEnd: 'rgba(245, 158, 11, 0.0)',
    },
    sky: {
      stroke: '#0EA5E9',
      fillStart: 'rgba(14, 165, 233, 0.25)',
      fillEnd: 'rgba(14, 165, 233, 0.0)',
    },
  }[activeColor];

  // Generate coordinates
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = height - padding - ((val - min) / range) * h;
    return { x, y };
  });

  // Generate smooth SVG curve using Catmull-Rom or cubic bezier
  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const gradId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div style={{ width, height }} className={`inline-block overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorConfig.fillStart} />
            <stop offset="100%" stopColor={colorConfig.fillEnd} />
          </linearGradient>
        </defs>

        {showGradient && <path d={areaD} fill={`url(#${gradId})`} />}
        <path
          d={pathD}
          fill="none"
          stroke={colorConfig.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
