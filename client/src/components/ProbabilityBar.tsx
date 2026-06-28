import type { Party } from "@shared/schema";

interface ProbabilityBarProps {
  probability: number;
  party: Party;
  confidenceInterval?: { low: number; high: number };
  className?: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function ProbabilityBar({ probability, party, confidenceInterval, className = "" }: ProbabilityBarProps) {
  const partyColors = {
    Democratic: "bg-democrat",
    Republican: "bg-republican",
    Independent: "bg-independent",
  };

  const partyLightColors = {
    Democratic: "bg-democrat/20",
    Republican: "bg-republican/20",
    Independent: "bg-independent/20",
  };

  const safeProbability = clampPercent(probability);
  const safeLow = confidenceInterval ? clampPercent(confidenceInterval.low) : null;
  const safeHighRaw = confidenceInterval ? clampPercent(confidenceInterval.high) : null;
  const safeHigh = safeLow != null && safeHighRaw != null ? Math.max(safeLow, safeHighRaw) : null;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Win Probability</span>
        <span className="font-mono text-2xl font-bold" data-testid="text-probability">
          {safeProbability.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {safeLow != null && safeHigh != null && (
          <div
            className={`absolute h-full ${partyLightColors[party]}`}
            style={{
              left: `${safeLow}%`,
              width: `${safeHigh - safeLow}%`,
            }}
          />
        )}
        <div
          className={`h-full ${partyColors[party]} transition-all duration-500`}
          style={{ width: `${safeProbability}%` }}
        />
      </div>
      {safeLow != null && safeHigh != null && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>CI: {safeLow.toFixed(1)}%</span>
          <span>{safeHigh.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
