import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import ComparePage from "@/pages/ComparePage";
import PresidentialPrimaryCompare from "@/pages/PresidentialPrimaryCompare";
import NYSenateCompare from "@/pages/NYSenateCompare";
import RaceDetail from "@/pages/RaceDetail";
import CustomPrediction from "@/pages/CustomPrediction";
import NaturalLanguageAnalysis from "@/pages/NaturalLanguageAnalysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/compare/presidential-primary" component={PresidentialPrimaryCompare} />
      <Route path="/compare/ny-senate" component={NYSenateCompare} />
      <Route path="/custom-prediction" component={CustomPrediction} />
      <Route path="/natural-language" component={NaturalLanguageAnalysis} />
      <Route path="/race/:id" component={RaceDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
