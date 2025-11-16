import type { Party } from "@shared/schema";

interface ProbabilityBarProps {
  probability: number;
  party: Party;
  confidenceInterval?: { low: number; high: number };
  className?: string;
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

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Win Probability</span>
        <span className="font-mono text-2xl font-bold" data-testid="text-probability">
          {probability.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {confidenceInterval && (
          <div
            className={`absolute h-full ${partyLightColors[party]}`}
            style={{
              left: `${confidenceInterval.low}%`,
              width: `${confidenceInterval.high - confidenceInterval.low}%`,
            }}
          />
        )}
        <div
          className={`h-full ${partyColors[party]} transition-all duration-500`}
          style={{ width: `${probability}%` }}
        />
      </div>
      {confidenceInterval && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>CI: {confidenceInterval.low.toFixed(1)}%</span>
          <span>{confidenceInterval.high.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
