import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XitoTransferContent } from "@/components/xito-transfer/XitoTransferContent";

export default function XitoTransfer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto">
        <XitoTransferContent />
      </div>
    </div>
  );
}
