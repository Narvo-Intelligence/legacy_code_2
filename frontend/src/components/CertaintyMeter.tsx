/**
 * Certainty Index: visual bar for weighted source authority (0–100).
 * Shown on News Detail to signal broadcast-grade consensus.
 */
const CertaintyMeter = ({ score }: { score: number }) => {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="space-y-2" data-testid="certainty-meter">
      <div className="flex justify-between font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
        <span>Certainty</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/8">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Certainty index ${value} percent`}
        />
      </div>
    </div>
  );
};

export default CertaintyMeter;
