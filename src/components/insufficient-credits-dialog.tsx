import { useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function InsufficientCreditsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
            <Wallet className="size-7" />
          </div>
          <DialogTitle className="text-center text-xl">
            Vous n'avez plus de crédit.
          </DialogTitle>
          <DialogDescription className="text-center">
            Vous devez disposer d'au moins un crédit pour passer un nouveau test.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            size="lg"
            className="w-full bg-brand-gradient text-primary-foreground"
            onClick={() => navigate({ to: "/achat-credits" })}
          >
            Acheter 1 crédit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
