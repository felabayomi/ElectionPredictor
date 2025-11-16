import { Badge } from "@/components/ui/badge";
import type { Party } from "@shared/schema";

interface PartyBadgeProps {
  party: Party;
  className?: string;
}

export function PartyBadge({ party, className = "" }: PartyBadgeProps) {
  const partyColors = {
    Democratic: "bg-democrat text-democrat-foreground",
    Republican: "bg-republican text-republican-foreground",
    Independent: "bg-independent text-independent-foreground",
  };

  return (
    <Badge className={`${partyColors[party]} ${className}`} data-testid={`badge-party-${party.toLowerCase()}`}>
      {party.charAt(0)}
    </Badge>
  );
}
