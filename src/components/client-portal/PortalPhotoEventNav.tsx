import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventTab {
  id: string;
  label: string;
}

interface PortalPhotoEventNavProps {
  tabs: EventTab[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}

const PortalPhotoEventNav = ({ tabs, activeIndex, onPrev, onNext, onBack }: PortalPhotoEventNavProps) => {
  const current = tabs[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === tabs.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(220,25%,6%)] border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-between max-w-lg mx-auto px-2 py-2">
        <button
          onClick={isFirst ? onBack : onPrev}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-white">{current?.label || ''}</span>
          <div className="text-[10px] text-white/40">{activeIndex + 1} of {tabs.length}</div>
        </div>
        <button
          onClick={onNext}
          disabled={isLast}
          className={cn(
            "p-2 rounded-full transition-colors",
            isLast ? "text-white/20" : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default PortalPhotoEventNav;
