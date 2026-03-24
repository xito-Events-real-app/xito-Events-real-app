import {
  Users,
  CalendarCheck,
  DollarSign,
  CheckSquare,
  Video,
  Camera,
  FolderOpen,
  Album,
  Building2,
  UserCog,
  KeyRound,
  Trash2,
  LucideIcon,
} from "lucide-react";

export interface SuiteModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  status: "active" | "coming-soon";
  gradient: string;
  statsKey?: "clients" | "booked" | "finance" | "vendors" | "accounts";
}

export const suiteModules: SuiteModule[] = [
  {
    id: 'client-tracker',
    name: 'Client Tracker',
    description: 'Manage leads and client inquiries',
    icon: Users,
    path: '/client-tracker',
    status: 'active',
    gradient: 'from-emerald-500 to-teal-600',
    statsKey: 'clients',
  },
  {
    id: 'booked-clients',
    name: 'Booked Clients',
    description: 'Track confirmed bookings',
    icon: CalendarCheck,
    path: '/booked-clients',
    status: 'active',
    gradient: 'from-blue-500 to-indigo-600',
    statsKey: 'booked',
  },
  {
    id: 'finance-manager',
    name: 'Finance Manager',
    description: 'Track payments and collections',
    icon: DollarSign,
    path: '/finance',
    status: 'active',
    gradient: 'from-green-500 to-emerald-600',
    statsKey: 'finance',
  },
  {
    id: 'daily-task-manager',
    name: 'WTN Daily Task',
    description: 'Manage daily tasks and todos',
    icon: CheckSquare,
    path: '/tasks',
    status: 'active',
    gradient: 'from-purple-500 to-violet-600',
    statsKey: 'tasks' as any,
  },
  {
    id: 'video-edit-tracker',
    name: 'Video Edit Tracker',
    description: 'Track video editing projects',
    icon: Video,
    path: '/video-edit',
    status: 'active',
    gradient: 'from-red-500 to-pink-600',
  },
  {
    id: 'photo-edit-tracker',
    name: 'Photo Edit Tracker',
    description: 'Track photo editing projects',
    icon: Camera,
    path: '/photo-edit',
    status: 'coming-soon',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'file-management',
    name: 'File Management',
    description: 'Organize and manage files',
    icon: FolderOpen,
    path: '/files',
    status: 'active',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'album-media',
    name: 'Album, Pendrive & Frame',
    description: 'Manage physical media deliverables',
    icon: Album,
    path: '/media',
    status: 'coming-soon',
    gradient: 'from-rose-500 to-red-600',
  },
  {
    id: 'vendors',
    name: 'Vendors',
    description: 'Manage vendor relationships',
    icon: Building2,
    path: '/vendors',
    status: 'active',
    gradient: 'from-slate-500 to-gray-600',
    statsKey: 'vendors',
  },
  {
    id: 'my-accounts',
    name: 'My Accounts',
    description: 'View account credentials',
    icon: KeyRound,
    path: '/my-accounts',
    status: 'active',
    gradient: 'from-pink-500 to-rose-600',
    statsKey: 'accounts',
  },
  {
    id: 'freelancers',
    name: 'Freelancers',
    description: 'Track freelancer collaborations',
    icon: UserCog,
    path: '/freelancers',
    status: 'active',
    gradient: 'from-indigo-500 to-purple-600',
  },
];
