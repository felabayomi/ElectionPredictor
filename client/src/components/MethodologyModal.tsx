import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, DollarSign, Users, MapPin, Award, Clock } from "lucide-react";

interface MethodologyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MethodologyModal({ open, onOpenChange }: MethodologyModalProps) {
  const factors = [
    {
      icon: TrendingUp,
      name: "Polling Average",
      weight: "35%",
      description: "Aggregated polling data from reputable sources, weighted by sample size and recency.",
    },
    {
      icon: DollarSign,
      name: "Fundraising",
      weight: "20%",
      description: "Campaign fundraising totals, indicating financial resources and donor support.",
    },
    {
      icon: Users,
      name: "Name Recognition",
      weight: "15%",
      description: "Public awareness and familiarity with the candidate based on search trends and media coverage.",
    },
    {
      icon: MapPin,
      name: "Demographics",
      weight: "15%",
      description: "Demographic alignment between candidate support base and district/state composition.",
    },
    {
      icon: Award,
      name: "Endorsements",
      weight: "10%",
      description: "Quality and quantity of endorsements from elected officials, organizations, and influential figures.",
    },
    {
      icon: Clock,
      name: "Historical Trends",
      weight: "5%",
      description: "Historical voting patterns in the district/state and similar demographic areas.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Prediction Methodology</DialogTitle>
          <DialogDescription>
            Our AI-powered prediction model analyzes multiple factors to forecast election outcomes with statistical confidence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">How It Works</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our model combines traditional statistical analysis with advanced AI to evaluate candidate performance across six key factors. Each factor is weighted based on its historical correlation with election outcomes. The AI component analyzes complex interactions between factors that simple statistical models might miss.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Prediction Factors</h3>
            <div className="space-y-4">
              {factors.map((factor) => {
                const Icon = factor.icon;
                return (
                  <div key={factor.name} className="flex gap-3">
                    <div className="shrink-0 p-2 rounded-md bg-muted h-fit">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h4 className="font-medium">{factor.name}</h4>
                        <span className="text-sm font-mono text-muted-foreground">{factor.weight}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{factor.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Confidence Intervals</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each prediction includes a confidence interval showing the range within which the actual result is likely to fall. Wider intervals indicate greater uncertainty, while narrow intervals suggest more reliable predictions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Data Sources</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Predictions are based on publicly available data including poll aggregators, FEC filings, census data, and historical election results. Data is updated regularly to reflect the latest information.
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Disclaimer:</strong> These predictions are for informational and analytical purposes only. Election outcomes depend on many factors including voter turnout, campaign events, and other variables that may not be fully captured by the model. Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
