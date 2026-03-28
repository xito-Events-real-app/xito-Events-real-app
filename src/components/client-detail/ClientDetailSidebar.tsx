import { Calendar, FileText, Users, Clock, DollarSign, Activity, MessageSquare, CreditCard, ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, StickyNote, UserCog, FolderOpen, Package, Film, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SectionType = 'dashboard' | 'events' | 'freelancers' | 'clientDetails' | 'registration' | 'inquiry' | 'sales' | 'activity' | 'comments' | 'financials' | 'keepNotes' | 'files' | 'deliverables' | 'edit' | 'album' | 'clientLink';

interface ClientDetailSidebarProps {
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  onBack: () => void;
  clientName: string;
  commentsCount?: number;
  // Navigation props
  showNavigation?: boolean;
  currentPosition?: number;
  totalCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

const sidebarItems: { id: SectionType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events', label: 'Event Details', icon: Calendar },
  { id: 'freelancers', label: 'Freelancers', icon: UserCog },
  { id: 'clientDetails', label: 'Client Details', icon: Users },
  { id: 'registration', label: 'Registration', icon: FileText },
  { id: 'inquiry', label: 'Inquiry', icon: Clock },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'financials', label: 'Financials', icon: CreditCard },
  { id: 'keepNotes', label: 'Benzo Keep', icon: StickyNote },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'deliverables', label: 'Deliverables', icon: Package },
  { id: 'edit', label: 'Edit', icon: Film },
  { id: 'album', label: 'Album', icon: BookOpen },
];

const ClientDetailSidebar = ({
  activeSection,
  onSectionChange,
  onBack,
  clientName,
  commentsCount = 0,
  showNavigation = false,
  currentPosition = 0,
  totalCount = 0,
  onPrev,
  onNext,
  canGoPrev = false,
  canGoNext = false,
}: ClientDetailSidebarProps) => {
  return (
    <div className="w-64 min-h-screen bg-[hsl(220,25%,8%)] text-white border-r border-emerald-900/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(220,20%,15%)]">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10 mb-3"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        {/* Client Name */}
        <div className="px-2">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Client</div>
          <div className="font-semibold text-lg text-white truncate">{clientName}</div>
        </div>

        {/* Navigation Controls */}
        {showNavigation && totalCount > 1 && (
          <div className="flex items-center justify-between mt-3 px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              disabled={!canGoPrev}
              className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white/50">
              {currentPosition} / {totalCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!canGoNext}
              className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'comments' && commentsCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs px-1.5 py-0 min-w-[20px] h-5",
                    isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/70"
                  )}
                >
                  {commentsCount}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer with version */}
      <div className="p-4 border-t border-[hsl(220,20%,15%)]">
        <div className="text-xs text-white/30 text-center">
          Client Detail v2.0
        </div>
      </div>
    </div>
  );
};

export default ClientDetailSidebar;
