/**
 * Certainty Index: visual bar for weighted source authority (0–100).
 * Shown on News Detail to signal broadcast-grade consensus.
 */
const CertaintyMeter = ({ score }: { score: number }) => {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="space-y-1" data-testid="certainty-meter">
      <div className="flex justify-between mono-ui text-[8px] text-forest">
        <span>CERTAINTY_INDEX</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 w-full bg-forest/10 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-out"
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
