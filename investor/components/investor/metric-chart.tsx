interface MetricChartProps {
  values: Array<{ label: string; value: number }>;
}

export function MetricChart({ values }: MetricChartProps) {
  const maxValue = values.reduce((max, item) => Math.max(max, item.value), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-5">
      {values.map((entry) => {
        const height = maxValue === 0 ? 0 : Math.max(12, Math.round((entry.value / maxValue) * 100));

        return (
          <div key={entry.label} className="flex items-end gap-3 sm:flex-col sm:items-start">
            <div className="flex h-40 w-full items-end rounded-3xl border border-line/10 bg-ink-deep/5 p-3">
              <div
                className="w-full rounded-2xl bg-gradient-to-t from-indigo via-indigo to-mint transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-quiet">
                {entry.label}
              </div>
              <div className="text-sm font-semibold text-ink">{entry.value.toLocaleString()}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
