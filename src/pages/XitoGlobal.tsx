import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Globe, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function XitoGlobal() {
  const navigate = useNavigate();

  const sections = [
    {
      id: "venues",
      name: "All Venues",
      description: "Single source of truth for every venue across all clients.",
      icon: Building2,
      path: "/xito-global/venues",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      id: "event-details-questions",
      name: "Event Details Questions",
      description: "Master list of questions clients answer about their events.",
      icon: ClipboardList,
      path: "/xito-global/event-details-questions",
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">XITO GLOBAL</h1>
              <p className="text-xs text-muted-foreground">Shared master data for the suite</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <Card
                key={s.id}
                className="p-5 cursor-pointer hover:shadow-lg transition-all group overflow-hidden relative"
                onClick={() => navigate(s.path)}
              >
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 group-hover:opacity-20 transition`} />
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-1">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}