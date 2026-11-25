import React from 'react';

interface BarItem {
  label: string;
  value: number;
  sublabel?: string;
}

interface LineItem {
  label: string;
  score: number;
  date: string;
}

export const ClassroomBarChart: React.FC<{
  title: string;
  items: BarItem[];
  unit?: string;
}> = ({ title, items, unit = '%' }) => {
  const maxVal = Math.max(100, ...items.map((i) => i.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">مقياس حتى {maxVal}{unit}</span>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          لا توجد بيانات كافية لعرض الرسم البياني بعد.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                    {item.value}{unit}
                    {item.sublabel ? ` · ${item.sublabel}` : ''}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-700 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProgressLineChart: React.FC<{
  title: string;
  series: LineItem[];
}> = ({ title, series }) => {
  const width = 580;
  const height = 240;
  const padLeft = 48;
  const padRight = 28;
  const padY = 30;
  const plotInset = 24;
  const innerW = width - padLeft - padRight;
  const innerH = height - padY * 2;
  const spanW = Math.max(1, innerW - plotInset * 2);

  const points = series.map((pt, idx) => {
    const x =
      series.length <= 1
        ? padLeft + innerW / 2
        : padLeft + plotInset + (idx / (series.length - 1)) * spanW;
    const y = padY + ((100 - Math.min(100, Math.max(0, pt.score))) / 100) * innerH;
    return { ...pt, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">تطور النسبة المئوية (%)</span>
      </div>

      {series.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          لا توجد محاولات مسجلة لعرض المنحنى.
        </p>
      ) : (
        <div className="overflow-x-auto" dir="ltr">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
            className="w-full min-w-[360px]"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padY + ((100 - tick) / 100) * innerH;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polylinePoints}
              />
            )}

            {points.map((pt, idx) => (
              <g key={`${pt.date}-${idx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#1d4ed8"
                  strokeWidth="2.5"
                />
                <text
                  x={pt.x}
                  y={pt.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#0f172a"
                >
                  {pt.score}%
                </text>
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  #{idx + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
