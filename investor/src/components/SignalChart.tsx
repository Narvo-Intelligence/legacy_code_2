import { motion } from 'framer-motion';

interface SignalChartProps {
  data: number[];
  label?: string;
}

export function SignalChart({ data, label }: SignalChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const width = 200;
  const height = 80;
  const step = width / data.length;
  return (
    <div className="narvo-border bg-narvo-bg/60 p-3">
      {label && (
        <p className="font-mono text-[10px] text-narvo-secondary uppercase tracking-widest mb-2">
          {label}
        </p>
      )}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="presentation"
        aria-hidden="true"
      >
        {data.map((value, idx) => {
          const barHeight = (value / max) * (height - 8);
          const x = idx * step;
          return (
            <motion.rect
              key={`${idx}-${value}`}
              x={x + step * 0.1}
              y={height - barHeight}
              width={step * 0.8}
              height={barHeight}
              initial={{ height: 0, y: height }}
              animate={{ height: barHeight, y: height - barHeight }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.05 }}
              fill="rgba(235, 213, 171, 0.8)"
              rx="2"
            />
          );
        })}
      </svg>
    </div>
  );
}
