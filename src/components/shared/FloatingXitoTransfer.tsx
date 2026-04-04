import { useXitoTransferPopup } from "@/contexts/XitoTransferPopupContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { XitoTransferContent } from "@/components/xito-transfer/XitoTransferContent";

export function FloatingXitoTransfer() {
  const { isOpen, close } = useXitoTransferPopup();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 bg-white border-slate-200 rounded-2xl [&>button]:hidden flex flex-col">
        <XitoTransferContent onClose={close} />
      </DialogContent>
    </Dialog>
  );
}
