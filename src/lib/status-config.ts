import {
  Users,
  Phone,
  MessageSquare,
  PhoneOff,
  FileText,
  SendHorizontal,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  CalendarX,
  UserX,
} from "lucide-react";

export interface StatusConfig {
  icon: React.ElementType;
  color: string;
  textColor?: string;
  label: string;
}

// Canonical order of statuses
export const STATUS_ORDER = [
  'JUST ENQUIRED',
  'NUMBER PROVIDED',
  'TEXTED : NOT CALLED',
  'CALL NOT RECEIVED',
  'CALLED : QUOTATION PENDING',
  'QUOTATION SENT : REVIEW PENDING',
  'BARGAINING IS ON',
  'ADVANCE PENDING',
  'BOOKED',
  'POSTPONED',
  'CANCELLED BY CLIENT',
  'CANCELLED BY US',
  'BOOKED SOMEWHERE ELSE',
] as const;

// Get status config with icon, color, and label
export const getStatusConfig = (status: string): StatusConfig => {
  const s = status.toUpperCase();
  
  // Check "BOOKED SOMEWHERE ELSE" first (before generic BOOKED check)
  if (s.includes('BOOKED SOMEWHERE ELSE')) {
    return { icon: UserX, color: 'bg-gray-600', textColor: 'text-gray-600', label: 'Booked Elsewhere' };
  }
  
  if (s.includes('JUST ENQUIRED')) return { icon: Users, color: 'bg-emerald-600', textColor: 'text-emerald-600', label: 'Just Enquired' };
  if (s.includes('NUMBER PROVIDED')) return { icon: Phone, color: 'bg-teal-600', textColor: 'text-teal-600', label: 'Number Provided' };
  if (s.includes('TEXTED')) return { icon: MessageSquare, color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Texted' };
  if (s.includes('CALL NOT')) return { icon: PhoneOff, color: 'bg-orange-500', textColor: 'text-orange-500', label: 'Call Not Received' };
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return { icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-500', label: 'Quotation Pending' };
  if (s.includes('QUOTATION SENT')) return { icon: SendHorizontal, color: 'bg-indigo-500', textColor: 'text-indigo-500', label: 'Quotation Sent' };
  if (s.includes('BARGAINING')) return { icon: Scale, color: 'bg-purple-500', textColor: 'text-purple-500', label: 'Bargaining' };
  if (s.includes('ADVANCE PENDING')) return { icon: Clock, color: 'bg-pink-500', textColor: 'text-pink-500', label: 'Advance Pending' };
  if (s.includes('BOOKED')) return { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-500', label: 'Booked' };
  if (s.includes('POSTPONED')) return { icon: CalendarX, color: 'bg-slate-500', textColor: 'text-slate-500', label: 'Postponed' };
  if (s.includes('CANCELLED BY CLIENT')) return { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500', label: 'Cancelled by Client' };
  if (s.includes('CANCELLED BY US')) return { icon: XCircle, color: 'bg-red-700', textColor: 'text-red-700', label: 'Cancelled by Us' };
  if (s.includes('CANCELLED')) return { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500', label: 'Cancelled' };
  
  return { icon: Users, color: 'bg-gray-500', textColor: 'text-gray-500', label: status };
};

// Normalize a status string to match canonical order
export const normalizeStatus = (status: string): string => {
  const s = status.toUpperCase();
  
  // Check specific matches first
  if (s.includes('BOOKED SOMEWHERE ELSE')) return 'BOOKED SOMEWHERE ELSE';
  if (s.includes('JUST ENQUIRED')) return 'JUST ENQUIRED';
  if (s.includes('NUMBER PROVIDED')) return 'NUMBER PROVIDED';
  if (s.includes('TEXTED')) return 'TEXTED : NOT CALLED';
  if (s.includes('CALL NOT')) return 'CALL NOT RECEIVED';
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return 'CALLED : QUOTATION PENDING';
  if (s.includes('QUOTATION SENT')) return 'QUOTATION SENT : REVIEW PENDING';
  if (s.includes('BARGAINING')) return 'BARGAINING IS ON';
  if (s.includes('ADVANCE PENDING')) return 'ADVANCE PENDING';
  if (s.includes('BOOKED')) return 'BOOKED';
  if (s.includes('POSTPONED')) return 'POSTPONED';
  if (s.includes('CANCELLED BY CLIENT')) return 'CANCELLED BY CLIENT';
  if (s.includes('CANCELLED BY US')) return 'CANCELLED BY US';
  if (s.includes('CANCELLED')) return 'CANCELLED BY CLIENT'; // Default cancelled to client
  
  return s;
};

// Sort categories by canonical order
export const sortCategoriesByOrder = <T extends { status: string }>(categories: T[]): T[] => {
  return [...categories].sort((a, b) => {
    const aIndex = STATUS_ORDER.indexOf(normalizeStatus(a.status) as typeof STATUS_ORDER[number]);
    const bIndex = STATUS_ORDER.indexOf(normalizeStatus(b.status) as typeof STATUS_ORDER[number]);
    
    // If not found in order, put at end (but before BOOKED SOMEWHERE ELSE)
    const aOrder = aIndex === -1 ? STATUS_ORDER.length - 1 : aIndex;
    const bOrder = bIndex === -1 ? STATUS_ORDER.length - 1 : bIndex;
    
    return aOrder - bOrder;
  });
};
