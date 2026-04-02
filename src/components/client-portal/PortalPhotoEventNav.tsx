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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-between max-w-lg mx-auto px-2 py-2">
        <button
          onClick={isFirst ? onBack : onPrev}
          className="p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900">{current?.label || ''}</span>
          <div className="text-[10px] text-gray-400">{activeIndex + 1} of {tabs.length}</div>
        </div>
        <button
          onClick={onNext}
          disabled={isLast}
          className={cn(
            "p-2 rounded-full transition-colors",
            isLast ? "text-gray-200" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          )}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default PortalPhotoEventNav;
