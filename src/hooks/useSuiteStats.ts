import { useMemo } from "react";
import { useCachedData } from "@/hooks/useCachedData";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { ClientData, BookedClientData, getCurrentStatus } from "@/lib/sheets-api";
import { formatDistanceToNow } from "date-fns";
import { getTotalPaid } from "@/lib/client-card-utils";

export interface SuiteStats {
  clients: {
    total: number;
    activeLeads: number;
    lastClient?: string;
    lastAddedTime?: string;
  };
  booked: {
    total: number;
    upcomingEvents: number;
    nextEvent?: {
      clientName: string;
      eventName: string;
      daysUntil: number;
    };
  };
  finance: {
    totalValue: number;
    collected: number;
    pending: number;
    lastPayment?: {
      clientName: string;
      amount: number;
    };
  };
  vendors: {
    total: number;
  };
  accounts: {
    total: number;
  };
  isLoading: boolean;
}

// Parse registeredDateTimeAD to get time ago
function getTimeAgo(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

// Parse quotation amount from finalQuotation string
function parseQuotationAmount(finalQuotation: string): number {
  if (!finalQuotation) return 0;
  // Format: "PREMIUM NPR 2,50,000/-" OR "PREMIUM: NPR 75,000/-"
  const match = finalQuotation.match(/NPR\s*([\d,]+)/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10) || 0;
  }
  return 0;
}

// Get last payment info from a client's payment log
function getLastPaymentAmount(paymentsMade: string): number | null {
  if (!paymentsMade) return null;
  const matches = paymentsMade.match(/NPR\s*([\d,]+)/g);
  if (!matches || matches.length === 0) return null;
  const lastMatch = matches[matches.length - 1];
  const amountStr = lastMatch.replace(/NPR\s*/, "").replace(/,/g, "");
  return parseInt(amountStr, 10) || null;
}

// Check if an event date is in the future
function isEventUpcoming(eventDateAD: string): boolean {
  if (!eventDateAD) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = eventDateAD.split("\n");
  return dates.some((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date >= today;
  });
}

// Get days until next event
function getDaysUntilEvent(eventDateAD: string): number {
  if (!eventDateAD) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = eventDateAD.split("\n");
  let minDays = Infinity;
  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date >= today) {
      const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days < minDays) minDays = days;
    }
  });
  return minDays;
}

export function useSuiteStats(): SuiteStats {
  const { clients, isLoading: clientsLoading } = useCachedData();
  const { clients: bookedClients, isLoading: bookedLoading } = useBookedCachedData();

  const stats = useMemo(() => {
    // Client Tracker Stats
    const activeStatuses = [
      "JUST ENQUIRED",
      "NUMBER PROVIDED",
      "NOT REACHABLE",
      "NO RESPONSE",
      "DIDN'T PICK UP",
      "ASKED FOR CALLBACK",
      "QUOTATION SENT",
      "BARGAINING IS ON",
      "FOLLOWUP",
    ];
    
    const activeLeads = clients.filter((c) => {
      const status = getCurrentStatus(c.statusLog || "");
      return activeStatuses.some((s) => status.toUpperCase().includes(s.toUpperCase()));
    }).length;

    // Sort clients by registration time to find the last one
    const sortedClients = [...clients].sort((a, b) => {
      const dateA = new Date(a.registeredDateTimeAD || "");
      const dateB = new Date(b.registeredDateTimeAD || "");
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastClient = sortedClients[0];
    const lastClientTime = lastClient?.registeredDateTimeAD 
      ? getTimeAgo(lastClient.registeredDateTimeAD) 
      : undefined;

    // Booked Clients Stats
    const upcomingEvents = bookedClients.filter((c) => 
      isEventUpcoming(c.eventDateAD || "")
    ).length;

    // Find next event
    let nextEvent: SuiteStats["booked"]["nextEvent"] | undefined;
    let minDays = Infinity;
    bookedClients.forEach((c) => {
      const days = getDaysUntilEvent(c.eventDateAD || "");
      if (days < minDays) {
        minDays = days;
        const events = (c.events || "").split("\n");
        nextEvent = {
          clientName: c.clientName,
          eventName: events[0] || "Event",
          daysUntil: days,
        };
      }
    });

    // Finance Stats
    let totalValue = 0;
    let collected = 0;
    let lastPaymentClient: string | undefined;
    let lastPaymentAmount: number | undefined;

    bookedClients.forEach((c) => {
      const quotation = parseQuotationAmount(c.finalQuotation || "");
      totalValue += quotation;
      collected += getTotalPaid(c.paymentsMade || "");
      
      // Check for last payment
      const amount = getLastPaymentAmount(c.paymentsMade || "");
      if (amount && (!lastPaymentAmount || amount > 0)) {
        lastPaymentClient = c.clientName;
        lastPaymentAmount = amount;
      }
    });

    return {
      clients: {
        total: clients.length,
        activeLeads,
        lastClient: lastClient?.clientName,
        lastAddedTime: lastClientTime,
      },
      booked: {
        total: bookedClients.length,
        upcomingEvents,
        nextEvent: minDays !== Infinity ? nextEvent : undefined,
      },
      finance: {
        totalValue,
        collected,
        pending: totalValue - collected,
        lastPayment: lastPaymentClient && lastPaymentAmount
          ? { clientName: lastPaymentClient, amount: lastPaymentAmount }
          : undefined,
      },
      vendors: {
        total: 0, // Will be populated when vendors data is available
      },
      accounts: {
        total: 0, // Will be populated when accounts data is available
      },
      isLoading: clientsLoading || bookedLoading,
    };
  }, [clients, bookedClients, clientsLoading, bookedLoading]);

  return stats;
}

// Today's events helper
export function getTodayEvents(bookedClients: BookedClientData[]): {
  client: BookedClientData;
  eventName: string;
  eventIndex: number;
}[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayEvents: { client: BookedClientData; eventName: string; eventIndex: number }[] = [];

  bookedClients.forEach((client) => {
    const eventDates = (client.eventDateAD || "").split("\n");
    const eventNames = (client.events || "").split("\n");

    eventDates.forEach((dateStr, index) => {
      if (dateStr.startsWith(todayStr)) {
        todayEvents.push({
          client,
          eventName: eventNames[index] || "Event",
          eventIndex: index,
        });
      }
    });
  });

  return todayEvents;
}
