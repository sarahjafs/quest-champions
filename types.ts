
export type Frequency = 'Daily' | 'Weekly' | 'Fortnightly' | 'Specific Date' | 'One-off' | 'Prayer';

export interface Chore {
  id: string;
  title: string;
  description: string;
  coins: number;
  xp: number;
  frequency: Frequency;
  specificDate?: string; // ISO string for Specific Date frequency
  icon: string;
  assignedTo: string; // Child ID or 'ALL'
  completedBy?: string; // ID of the child who performed the action
  lastCompleted?: string; // ISO Date
  isCompletedToday?: boolean;
  pendingApproval?: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  xp: number;
  level: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  childName: string;
  action: string;
  type: 'CHORE' | 'REWARD' | 'SYSTEM';
  value: string;
}

export interface CloudConfig {
  familyCode?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface AppState {
  children: Child[];
  chores: Chore[];
  rewards: Reward[];
  logs: LogEntry[];
  parentPin: string;
  cloud?: CloudConfig;
}
