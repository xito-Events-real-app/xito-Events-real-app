import { AppLayout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, User, Phone, MapPin } from "lucide-react";
import { useState } from "react";

export default function Search() {
  const [query, setQuery] = useState("");

  return (
    <AppLayout>
      <PageHeader 
        title="Search Clients" 
        subtitle="Find by name or phone"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Results */}
        {!query && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl gradient-secondary flex items-center justify-center mx-auto mb-4 opacity-50">
              <SearchIcon className="w-8 h-8 text-white" />
            </div>
            <p className="text-muted-foreground">
              Start typing to search clients
            </p>
          </div>
        )}

        {query && (
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Connect to Google Sheets to enable search
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
