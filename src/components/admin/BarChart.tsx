"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  max?: number;
  color?: string;
  currency?: boolean;
}

export function BarChart({ data, max, color = "#b85c38", currency }: BarChartProps) {
  const maxValue = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = (item.value / maxValue) * 100;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-16 sm:w-20 flex-shrink-0 text-xs text-mocha truncate">
              {item.label}
            </span>
            <div className="flex-1 h-6 bg-latte/10 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-espresso">
                {currency ? `$${(item.value / 100).toFixed(0)}` : item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
