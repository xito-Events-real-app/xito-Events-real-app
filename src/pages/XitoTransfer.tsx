import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XitoTransferContent } from "@/components/xito-transfer/XitoTransferContent";

export default function XitoTransfer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <ArrowUpDown className="h-5 w-5 text-orange-400" />
          <h1 className="text-lg font-bold">XITO TRANSFER</h1>
        </div>
        <XitoTransferContent />
      </div>
    </div>
  );
}
