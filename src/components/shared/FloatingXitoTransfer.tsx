import { useXitoTransferPopup } from "@/contexts/XitoTransferPopupContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { XitoTransferContent } from "@/components/xito-transfer/XitoTransferContent";

export function FloatingXitoTransfer() {
  const { isOpen, close } = useXitoTransferPopup();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-slate-900 border-orange-500/30">
        <XitoTransferContent onClose={close} />
      </DialogContent>
    </Dialog>
  );
}
