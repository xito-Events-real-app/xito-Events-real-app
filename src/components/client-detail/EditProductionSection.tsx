import { Film } from "lucide-react";

interface Props {
  registeredDateTimeAD: string;
  clientName: string;
}

export default function EditProductionSection({ }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Film className="w-5 h-5 text-emerald-400" />
        Edit & Production
      </h2>
      <div className="text-center py-16 text-slate-500">
        <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-semibold text-slate-400 mb-1">Coming Soon</p>
        <p className="text-sm">Edit & Production features will appear here.</p>
      </div>
    </div>
  );
}
