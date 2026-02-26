import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, Clock, ChevronRight, User, Calendar, MapPin, Briefcase, Phone, Loader2, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCachedData } from "@/hooks/useCachedData";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { getClientDetailPath, getClientNavigationId } from "@/lib/client-navigation";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { supabase } from "@/integrations/supabase/client";
import { useSaugatSearch } from "@/contexts/SaugatSearchContext";

const MAX_RECENT = 50;
const MAX_PREVIEW_RESULTS = 8;
const MAX_DISPLAY_RECENT = 12;
const SCROLL_AMOUNT = 150;

interface RecentSearch {
  query: string;
  timestamp: number;
}

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

export function SaugatSearch() {
  const { isOpen, close } = useSaugatSearch();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recentRowRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll with click fix
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const startScrollLeft = useRef(0);

  const navigate = useNavigate();
  const { clients, isLoading: isClientsLoading } = useCachedData();

  const updateScrollButtons = useCallback(() => {
    const el = recentRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Load recent searches
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await supabase.functions.invoke("google-sheets", {
          body: { action: "getSearchHistory" },
        });
        if (response.data?.success && Array.isArray(response.data?.data)) {
          setRecentSearches(
            response.data.data.map((query: string) => ({ query, timestamp: Date.now() }))
          );
        }
      } catch (err) {
        console.error('Failed to load search history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => { updateScrollButtons(); }, [recentSearches, updateScrollButtons]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Drag-to-scroll handlers - FIXED: only drag if moved > 5px
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!el) return;
    isDraggingRef.current = false;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    startScrollLeft.current = el.scrollLeft;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = 'grabbing';
      }
      el.scrollLeft = startScrollLeft.current - dx;
      updateScrollButtons();
    }
  }, [updateScrollButtons]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!el) return;
    if (isDraggingRef.current) {
      el.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
    el.style.cursor = 'grab';
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  }, [updateScrollButtons]);

  const scrollLeft = useCallback(() => {
    const el = recentRowRef.current;
    if (!el) return;
    el.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 200);
  }, [updateScrollButtons]);

  const scrollRight = useCallback(() => {
    const el = recentRowRef.current;
    if (!el) return;
    el.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 200);
  }, [updateScrollButtons]);

  const results = useMemo(() => {
    if (isClientsLoading && clients.length === 0) return [];
    if (query.trim().length < 2) return [];
    const searchLower = query.toLowerCase();
    const filtered = clients.filter(client => {
      const monthNames = getMonthNamesFromColumn(client.eventMonth || '');
      const searchableFields = [
        client.clientName, client.contactNo, client.whatsappNo, client.email,
        client.source, client.clientLocation, client.currentCountry,
        client.eventLocation, client.eventCity, client.events, client.eventYear,
        monthNames, client.eventMonth, client.eventDay, client.eventDateAD,
        client.registeredDateBS, client.registeredDateTimeAD, client.inquiryDateBS,
        client.inquiryDateAD, client.inquiryTime, client.whoAdded, client.clientHandler,
        client.statusLog, client.description, client.comments, client.mindset,
        client.quotationData, client.finalQuotation, client.ourBargainedRates,
        client.clientBargainedRates, client.paymentsMade, client.remainingPayment,
        client.companyName, client.serviceTypes,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableFields.includes(searchLower);
    });
    return filtered.slice(0, MAX_PREVIEW_RESULTS);
  }, [query, clients, isClientsLoading]);

  const saveSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const newSearch = { query: searchQuery.trim(), timestamp: Date.now() };
    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase())
    ].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    supabase.functions.invoke("google-sheets", {
      body: { action: "saveSearchQuery", data: { query: searchQuery.trim() } },
    }).catch(err => console.error('Failed to save search:', err));
  };

  const handleResultClick = (client: ClientData) => {
    saveSearch(query);
    navigate(getClientDetailPath(client), {
      state: {
        from: '/',
        searchContext: 'search',
        searchQuery: query,
        resultIds: results.map(r => getClientNavigationId(r)),
        currentIndex: results.indexOf(client)
      }
    });
    close();
  };

  const handleRecentClick = (searchQuery: string) => {
    if (isDraggingRef.current) return; // Don't fire if was dragging
    setQuery(searchQuery);
  };

  const recentToShow = recentSearches.slice(0, MAX_DISPLAY_RECENT);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 saugat-search-backdrop"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-[700px] max-w-[90vw] saugat-search-panel saugat-search-glow rounded-2xl overflow-hidden"
        style={{
          background: '#111',
          border: '2px solid #FFD700',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-yellow-500/20 transition-colors"
        >
          <X className="w-5 h-5" style={{ color: '#FFD700' }} />
        </button>

        {/* Title */}
        <div className="pt-6 pb-3 px-6 text-center">
          <h2
            className="text-2xl font-black uppercase tracking-[0.2em]"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(255,215,0,0.5)',
              filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.3))',
            }}
          >
            ⚡ SAUGAT SEARCH ⚡
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: '#B8860B' }}>
            Ctrl+F • Find anything instantly
          </p>
        </div>

        {/* Search Input */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#FFD700' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients, events, handlers..."
              className="w-full h-14 pl-12 pr-12 rounded-xl text-base font-semibold outline-none"
              style={{
                background: '#1a1a1a',
                border: '2px solid #FFD700',
                color: '#FFD700',
                caretColor: '#FFD700',
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-yellow-500/20 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: '#FFD700' }} />
              </button>
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="px-6 pb-3">
          {query.trim().length < 2 && (
            <p className="text-xs mb-2 flex items-center gap-1 px-1 uppercase tracking-wider font-bold" style={{ color: '#B8860B' }}>
              <Clock className="w-3 h-3" /> Recent Searches
            </p>
          )}

          {isLoadingHistory ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" style={{ background: '#333' }} />
              ))}
            </div>
          ) : recentToShow.length > 0 ? (
            <div className="relative flex items-center gap-1">
              {canScrollLeft && (
                <button onClick={scrollLeft} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors z-10" style={{ background: '#333', color: '#FFD700' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div
                ref={recentRowRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                onScroll={updateScrollButtons}
                className="flex gap-2 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing flex-1 select-none scrollbar-hide"
              >
                {recentToShow.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(item.query)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-150 hover:scale-105"
                    style={{
                      background: '#1a1a1a',
                      color: '#FFD700',
                      border: '1px solid #FFD700',
                    }}
                  >
                    {item.query}
                  </button>
                ))}
              </div>
              {canScrollRight && (
                <button onClick={scrollRight} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors z-10" style={{ background: '#333', color: '#FFD700' }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            query.trim().length < 2 && (
              <p className="text-xs italic px-1" style={{ color: '#666' }}>No recent searches</p>
            )
          )}
        </div>

        {/* Loading State */}
        {query.trim().length >= 2 && isClientsLoading && clients.length === 0 && (
          <div className="px-6 pb-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: '#FFD700' }} />
            <p className="text-sm" style={{ color: '#B8860B' }}>Loading clients...</p>
          </div>
        )}

        {/* Results */}
        {query.trim().length >= 2 && results.length > 0 && (
          <div className="px-6 pb-4 max-h-72 overflow-y-auto">
            <p className="text-xs mb-2 px-1 font-bold uppercase tracking-wider" style={{ color: '#B8860B' }}>
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
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-yellow-500/10"
                    style={{ border: '1px solid #333' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
                      <User className="w-5 h-5 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold truncate" style={{ color: '#FFD700' }}>
                          {client.clientName}
                        </span>
                        <Badge className="text-[10px] shrink-0 border font-bold" style={{ background: '#1a1a1a', color: '#FFA500', borderColor: '#FFA500' }}>
                          {matchedField}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: '#888' }}>
                        {client.contactNo && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.contactNo}</span>
                        )}
                        {firstEvent && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{firstEvent}</span>
                        )}
                        {client.eventCity && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.eventCity}</span>
                        )}
                        {client.clientHandler && (
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{client.clientHandler}</span>
                        )}
                      </div>
                      {currentStatus && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#332800', color: '#FFD700' }}>
                          {currentStatus}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 mt-3" style={{ color: '#FFD700' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {query.trim().length >= 2 && results.length === 0 && !isClientsLoading && clients.length > 0 && (
          <div className="px-6 pb-6 text-center">
            <p className="text-sm" style={{ color: '#888' }}>No results found for "<span style={{ color: '#FFD700' }}>{query}</span>"</p>
          </div>
        )}
      </div>
    </div>
  );
}
