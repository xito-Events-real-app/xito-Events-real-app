import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Trash2, ShieldAlert, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

const DELETE_PASSWORD = "984124";

// Heartbeat sound using Web Audio API
function startHeartbeat(): { stop: () => void } {
  let audioCtx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  try {
    audioCtx = new AudioContext();

    const playThump = (time: number, freq: number, duration: number) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + duration);
    };

    const playBeat = () => {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      playThump(now, 55, 0.15);
      playThump(now + 0.18, 65, 0.12);
    };

    playBeat();
    intervalId = setInterval(playBeat, 850);
  } catch (e) {
    console.warn("Web Audio API not available for heartbeat sound");
  }

  return {
    stop: () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    },
  };
}

const DeleteClientDialog = ({
  open,
  onOpenChange,
  clientName,
  onConfirmDelete,
  isDeleting,
}: DeleteClientDialogProps) => {
  const [stage, setStage] = useState<"password" | "danger">("password");
  const [password, setPassword] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const heartbeatRef = useRef<{ stop: () => void } | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStage("password");
      setPassword("");
      setShakeError(false);
      if (heartbeatRef.current) {
        heartbeatRef.current.stop();
        heartbeatRef.current = null;
      }
    }
  }, [open]);

  // Start heartbeat when danger stage mounts
  useEffect(() => {
    if (stage === "danger" && open) {
      heartbeatRef.current = startHeartbeat();
      return () => {
        if (heartbeatRef.current) {
          heartbeatRef.current.stop();
          heartbeatRef.current = null;
        }
      };
    }
  }, [stage, open]);

  const handlePasswordSubmit = useCallback(() => {
    if (password === DELETE_PASSWORD) {
      setStage("danger");
    } else {
      setShakeError(true);
      toast({
        title: "Wrong Password",
        description: "Access denied. Incorrect password.",
        variant: "destructive",
      });
      setTimeout(() => setShakeError(false), 600);
    }
  }, [password]);

  const handleGoBack = () => {
    if (heartbeatRef.current) {
      heartbeatRef.current.stop();
      heartbeatRef.current = null;
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (heartbeatRef.current) {
      heartbeatRef.current.stop();
      heartbeatRef.current = null;
    }
    await onConfirmDelete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`border-0 p-0 overflow-hidden max-w-md ${
          stage === "danger" ? "bg-transparent" : "bg-slate-900"
        }`}
        style={{ boxShadow: stage === "danger" ? "0 0 80px rgba(220,38,38,0.5)" : undefined }}
      >
        {/* Stage 1: Password Gate */}
        {stage === "password" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Security Check</h3>
                <p className="text-sm text-white/50">Enter password to proceed</p>
              </div>
            </div>

            <div className={`transition-transform ${shakeError ? "animate-shake" : ""}`}>
              <Input
                type="password"
                placeholder="Enter deletion password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-white/30 h-12 text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-white/70 hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handlePasswordSubmit}
              >
                Unlock
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2: Danger Confirmation */}
        {stage === "danger" && (
          <div className="relative">
            {/* Pulsing red border */}
            <div className="absolute inset-0 rounded-lg border-2 border-red-500 animate-pulse pointer-events-none" />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-red-950 via-red-900/95 to-red-950" />

            <div className="relative p-6 space-y-5">
              {/* Animated danger icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-red-600/40 flex items-center justify-center animate-scale-in">
                    <AlertTriangle className="h-10 w-10 text-red-300 animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Warning header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-red-200 tracking-tight">
                  PERMANENT DELETION
                </h2>
                <div className="bg-red-800/50 rounded-lg px-4 py-2 inline-block">
                  <span className="text-white font-bold text-lg">{clientName}</span>
                </div>
              </div>

              {/* Warning text */}
              <div className="bg-red-950/80 border border-red-700/50 rounded-lg p-4 space-y-2">
                <p className="text-red-200/90 text-sm leading-relaxed text-center">
                  This action is <span className="font-black text-red-300 underline">IRREVERSIBLE</span>.
                </p>
                <p className="text-red-300/70 text-xs text-center leading-relaxed">
                  This client will be permanently deleted from ALL systems — 
                  Client Tracker, Event Details, Contact Details, and Crew Assignments.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={handleGoBack}
                  disabled={isDeleting}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-12 text-base font-semibold"
                >
                  <X className="h-4 w-4 mr-2" />
                  Go Back to Safety
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-red-700 hover:bg-red-800 text-white h-12 text-base font-bold border-2 border-red-500 shadow-lg shadow-red-900/50"
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Deleting Forever...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Permanently Delete
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Custom shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </Dialog>
  );
};

export default DeleteClientDialog;
