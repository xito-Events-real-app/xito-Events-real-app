import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarPlus, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Clients", value: "—", icon: Users, color: "gradient-primary" },
  { label: "This Month", value: "—", icon: CalendarPlus, color: "gradient-secondary" },
  { label: "Today's Inquiries", value: "—", icon: TrendingUp, color: "gradient-accent" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <PageHeader 
        title="WTN Client Tracker" 
        subtitle="Wedding & Event Management"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Quick Action */}
        <Link to="/quick-add">
          <Button 
            className="w-full h-14 text-lg font-semibold gradient-primary text-white shadow-lg press-effect"
            size="lg"
          >
            <CalendarPlus className="w-5 h-5 mr-2" />
            Quick Add Client
          </Button>
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-soft border-0">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity Placeholder */}
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Activity</h2>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-8">
                Connect to Google Sheets to see recent clients
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Setup Notice */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-2">⚡ Setup Required</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Google Sheets API to enable data sync. The Quick Add form is ready for preview!
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
