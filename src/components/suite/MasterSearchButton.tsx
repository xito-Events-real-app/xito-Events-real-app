import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Clock, ChevronRight, User, Calendar, MapPin, Briefcase, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCachedData } from "@/hooks/useCachedData";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { getClientDetailPath, getClientNavigationId } from "@/lib/client-navigation";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";

// Constants
const STORAGE_KEY = "xito_recent_searches";
const MAX_RECENT = 10;
const MAX_PREVIEW_RESULTS = 5;

// Types
interface RecentSearch {
  query: string;
  timestamp: number;
}

// Helper to get month names from month numbers
function getMonthNamesFromColumn(monthCol: string): string {
  if (!monthCol) return '';
  return monthCol.split('\n')
    .map(m => {
      const num = parseInt(m.trim());
      return num >= 1 && num <= 12 ? nepaliMonthsEnglish[num - 1] : '';
    })
    .filter(Boolean)
    .join(' ');
}

// Find which field matched the search query
function getMatchedField(client: ClientData, query: string): string {
  const searchLower = query.toLowerCase();
  
  if (client.clientName?.toLowerCase().includes(searchLower)) return 'Name';
  if (client.contactNo?.includes(query)) return 'Phone';
  if (client.whatsappNo?.includes(query)) return 'WhatsApp';
  if (client.email?.toLowerCase().includes(searchLower)) return 'Email';
  if (client.events?.toLowerCase().includes(searchLower)) return 'Event';
  if (client.clientHandler?.toLowerCase().includes(searchLower)) return 'Handler';
  if (client.statusLog?.toLowerCase().includes(searchLower)) return 'Status';
  if (client.eventCity?.toLowerCase().includes(searchLower)) return 'City';
  if (client.eventLocation?.toLowerCase().includes(searchLower)) return 'Location';
  if (client.source?.toLowerCase().includes(searchLower)) return 'Source';
  if (client.description?.toLowerCase().includes(searchLower)) return 'Description';
  if (client.comments?.toLowerCase().includes(searchLower)) return 'Comments';
  
  const monthNames = getMonthNamesFromColumn(client.eventMonth || '');
  if (monthNames.toLowerCase().includes(searchLower)) return 'Event Month';
  
  if (client.eventYear?.includes(query)) return 'Event Year';
  if (client.registeredDateBS?.toLowerCase().includes(searchLower)) return 'Registration';
  if (client.inquiryDateBS?.toLowerCase().includes(searchLower)) return 'Inquiry Date';
  
  return 'Match';
}

export function MasterSearchButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { clients } = useCachedData();
  
  // Load recent searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);
  
  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setQuery("");
      }
    };
    
    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);
  
  // Universal search - search ALL client fields
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    
    const searchLower = query.toLowerCase();
    
    const filtered = clients.filter(client => {
      const monthNames = getMonthNamesFromColumn(client.eventMonth || '');
      
      const searchableFields = [
        client.clientName,
        client.contactNo,
        client.whatsappNo,
        client.email,
        client.source,
        client.clientLocation,
        client.currentCountry,
        client.eventLocation,
        client.eventCity,
        client.events,
        client.eventYear,
        monthNames,
        client.eventMonth,
        client.eventDay,
        client.eventDateAD,
        client.registeredDateBS,
        client.registeredDateTimeAD,
        client.inquiryDateBS,
        client.inquiryDateAD,
        client.inquiryTime,
        client.whoAdded,
        client.clientHandler,
        client.statusLog,
        client.description,
        client.comments,
        client.mindset,
        client.quotationData,
        client.finalQuotation,
        client.ourBargainedRates,
        client.clientBargainedRates,
        client.paymentsMade,
        client.remainingPayment,
        client.companyName,
        client.serviceTypes,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableFields.includes(searchLower);
    });
    
    return filtered.slice(0, MAX_PREVIEW_RESULTS);
  }, [query, clients]);
  
  // Save search to history
  const saveSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newSearch = { query: searchQuery.trim(), timestamp: Date.now() };
    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase())
    ].slice(0, MAX_RECENT);
    
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };
  
  // Handle result click
  const handleResultClick = (client: ClientData) => {
    saveSearch(query);
    navigate(getClientDetailPath(client), {
      state: {
        from: 'search',
        searchQuery: query,
        resultIds: results.map(r => getClientNavigationId(r)),
        currentIndex: results.indexOf(client)
      }
    });
    setIsExpanded(false);
    setQuery("");
  };
  
  // Handle recent search click
  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery);
  };
  
  // Clear a single recent search
  const clearRecentSearch = (e: React.MouseEvent, searchQuery: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s.query !== searchQuery);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };
  
  // Render collapsed button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "w-full h-14 rounded-2xl font-semibold flex items-center justify-center gap-3",
          "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600",
          "text-white shadow-lg transition-all",
          "hover:scale-[1.02] active:scale-[0.98]",
          "animate-glow-pulse"
        )}
      >
        <Search className="w-5 h-5 animate-pulse-soft" />
        Master Search
      </button>
    );
  }
  
  // Render expanded input
  return (
    <div ref={containerRef} className="relative">
      {/* Inline Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients, events, handlers..."
          className={cn(
            "h-14 pl-12 pr-12 rounded-2xl text-base bg-white",
            "border-2 border-violet-400 focus:border-violet-500",
            "animate-border-glow"
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsExpanded(false);
              setQuery("");
            }
          }}
        />
        <button
          onClick={() => { setIsExpanded(false); setQuery(""); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      
      {/* Dropdown: Recent Searches or Results */}
      {(query.trim().length < 2 && recentSearches.length > 0) || (query.trim().length >= 2 && results.length > 0) ? (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
          {/* Recent Searches */}
          {query.trim().length < 2 && recentSearches.length > 0 && (
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1 px-2">
                <Clock className="w-3 h-3" /> Recent Searches
              </p>
              <div className="space-y-1">
                {recentSearches.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(item.query)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Search className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{item.query}</span>
                    </div>
                    <button
                      onClick={(e) => clearRecentSearch(e, item.query)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Search Results */}
          {query.trim().length >= 2 && results.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-500 mb-2 px-2">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-1">
                {results.map((client, i) => {
                  const currentStatus = getCurrentStatus(client.statusLog || "");
                  const matchedField = getMatchedField(client, query);
                  const firstEvent = client.events?.split('\n')[0] || '';
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleResultClick(client)}
                      className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-gray-900 truncate">
                            {client.clientName}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-violet-50 text-violet-700 border-violet-200">
                            {matchedField}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          {client.contactNo && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.contactNo}
                            </span>
                          )}
                          {firstEvent && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {firstEvent}
                            </span>
                          )}
                          {client.eventCity && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {client.eventCity}
                            </span>
                          )}
                          {client.clientHandler && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {client.clientHandler}
                            </span>
                          )}
                        </div>
                        
                        {currentStatus && (
                          <span className="inline-block mt-1 text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                            {currentStatus}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : query.trim().length >= 2 && results.length === 0 ? (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 p-6 text-center">
          <p className="text-sm text-gray-500">No results found for "{query}"</p>
        </div>
      ) : null}
    </div>
  );
}
