import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Briefcase, Users, Award, Target, TrendingUp } from "lucide-react";

interface MethodologyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MethodologyModal({ open, onOpenChange }: MethodologyModalProps) {
  const factors = [
    {
      icon: MapPin,
      name: "Partisan Lean / Demographics",
      weight: "30%",
      description: "The strongest predictor without polling. Includes Partisan Voting Index (PVI), past statewide results, urban/rural split, and demographic composition (race, education, age, religion).",
    },
    {
      icon: Briefcase,
      name: "Candidate Experience / Incumbency",
      weight: "20%",
      description: "Most powerful candidate-specific predictor: incumbent advantage, previous elected offices, military/government background, and candidate quality used by professional forecasters.",
    },
    {
      icon: Users,
      name: "Name Recognition / Public Visibility",
      weight: "15%",
      description: "Purely public-based metrics: media coverage volume, Google Trends, social media following, and public familiarity. No fundraising data required.",
    },
    {
      icon: Award,
      name: "Endorsements / Party Support",
      weight: "15%",
      description: "Best early predictor in primaries: state party organization backing, major local/state officials, unions & advocacy groups, and high-profile national endorsements.",
    },
    {
      icon: Target,
      name: "Issue Alignment / Ideology Fit",
      weight: "10%",
      description: "Measures how well the candidate's positions match the district's political ideology, key local issues, and party base expectations. High alignment = higher early probability.",
    },
    {
      icon: TrendingUp,
      name: "Momentum / Public Engagement",
      weight: "10%",
      description: "Structural, non-fundraising signals: volunteer activity, event attendance, organic social media growth, public enthusiasm markers, and local news coverage trajectory.",
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
              Our early-cycle prediction model evaluates candidate performance across six key public-information factors. This system requires no polling or campaign finance data, making it ideal for early-stage race analysis before comprehensive polling is available.
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
              Predictions are based entirely on publicly available data: census demographics, Partisan Voting Index (PVI), media coverage metrics, social media analytics, public official records, and endorsement announcements. No polling or campaign fundraising data is required or used.
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
