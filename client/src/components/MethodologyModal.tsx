import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, Briefcase, Users, MapPin } from "lucide-react";

interface MethodologyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MethodologyModal({ open, onOpenChange }: MethodologyModalProps) {
  const factors = [
    {
      icon: TrendingUp,
      name: "Polling",
      weight: "Most Predictive",
      description: "Public polls, poll aggregations, and internal polls if publicly released. The most direct indicator of voter preference at any stage of the race.",
    },
    {
      icon: MapPin,
      name: "Demographics / Partisan Lean",
      weight: "Extremely Important",
      description: "Underlying voting tendencies based on race/ethnicity, education, urban/suburban/rural splits, Partisan Voting Index (PVI), and past statewide results. Especially predictive early in races.",
    },
    {
      icon: Users,
      name: "Name Recognition / Public Awareness",
      weight: "High Impact",
      description: "Media mentions, Google Trends, social media following, public familiarity surveys, and endorsement visibility—all from publicly available sources.",
    },
    {
      icon: Briefcase,
      name: "Candidate Experience / Background",
      weight: "Structural Factor",
      description: "Incumbent vs. challenger status, elected offices held, government/military background, and candidate quality indicators. Based entirely on public records.",
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
              Our model evaluates candidate performance across four key public-information factors. These factors require no campaign finance data and rely entirely on publicly available information such as polls, census data, media coverage, and public records.
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
              Predictions are based entirely on publicly available data: poll aggregators, census demographics, media coverage metrics, social media analytics, and public official records. No campaign fundraising data is required or used.
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
