import { useState, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BookedStatusPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: () => void;
}

const BOOKED_PASSWORD = "984124";

const BookedStatusPasswordDialog = ({
  open,
  onOpenChange,
  clientName,
  onConfirm,
}: BookedStatusPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [shakeError, setShakeError] = useState(false);

  const handleSubmit = useCallback(() => {
    if (password === BOOKED_PASSWORD) {
      setPassword("");
      onOpenChange(false);
      onConfirm();
    } else {
      setShakeError(true);
      toast.error("Wrong password. Access denied.");
      setTimeout(() => setShakeError(false), 600);
    }
  }, [password, onConfirm, onOpenChange]);

  const handleClose = () => {
    setPassword("");
    setShakeError(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-0 p-0 overflow-hidden max-w-md bg-slate-900">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Booked Client Protected</h3>
              <p className="text-sm text-white/50">
                <span className="font-semibold text-amber-300">{clientName}</span> is BOOKED
              </p>
            </div>
          </div>

          <p className="text-sm text-white/60 leading-relaxed">
            This client's status is locked. Enter the admin password to change it.
          </p>

          <div className={`transition-transform ${shakeError ? "animate-shake" : ""}`}>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-white/30 h-12 text-center text-lg tracking-widest"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-700 text-white/70 hover:bg-slate-800"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSubmit}
            >
              Unlock & Change
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default BookedStatusPasswordDialog;
