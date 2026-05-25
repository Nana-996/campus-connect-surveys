import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description?: string;
  benefits?: string[];
};

const DEFAULT_BENEFITS = [
  "Branded PDF reports ready to share",
  "Subgroup comparison & cross-tab analysis",
  "Live read-only dashboards via shareable link",
  "Saved report views for repeat analysis",
];

export function UpgradeDialog({ open, onOpenChange, feature, description, benefits = DEFAULT_BENEFITS }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent">
            <Lock className="h-5 w-5 text-accent-foreground" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">
            {feature} is a premium feature
          </DialogTitle>
          <DialogDescription className="text-center">
            {description ??
              "Upgrade this survey to Boosted or Pro, or top up paid credits, to unlock advanced reporting."}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 rounded-2xl border border-foreground/10 bg-muted/40 p-4 text-sm">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link to="/buy" className="w-full">
            <Button className="h-11 w-full rounded-full bg-primary text-sm">
              <Sparkles className="mr-1 h-4 w-4" />
              Upgrade survey or top up credits
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 w-full rounded-full text-xs text-muted-foreground"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
