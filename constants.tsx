
import { AppState } from './types';

export const DEFAULT_CLOUD_CONFIG = {
  supabaseUrl: 'https://tpcubwzcmgxgfhszebhk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY3Vid3pjbWd4Z2Zoc3plYmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDc1OTYsImV4cCI6MjA4MzE4MzU5Nn0.--1dzyNEol4Md4mNBKViz6-pfp5_R3w07cewgyAXRaE'
};

export const INITIAL_STATE: AppState = {
  children: [
    { id: '1', name: 'Alpha', avatar: '🦁', coins: 0, xp: 0, level: 1 }
  ],
  chores: [
    { id: 'c1', title: 'Tactical Workspace Clean', description: 'Clean your desk and area', coins: 10, xp: 20, frequency: 'Daily', icon: '🧹', assignedTo: '1' }
  ],
  rewards: [
    { id: 'r1', title: '30m Intel Access', description: 'Screen time reward', cost: 50, icon: '📺' }
  ],
  logs: [],
  parentPin: '1234',
  cloud: {
    ...DEFAULT_CLOUD_CONFIG,
    familyCode: ''
  }
};

export const AVATARS = ['🦁', '🦊', '🦒', '🦓', '🐼', '🐨', '🐯', '🦄', '🐲', '🤖', '🥷', '👨‍🚀', '🦸', '🧜', '🧛', '🧙'];

export const CHORE_ICONS = [
  // Cleaning & Housework
  '🧹', '🧺', '🧼', '🧽', '🚿', '🚽', '🪟', '🛋️', '🛏️', '🗑️', '🧼', '🛁', '🚪',
  // Kitchen & Food
  '🍽️', '🥣', '🍳', '☕', '🥤', '🍎', '🥦', '🍕', '🧊', '🍴',
  // Animals & Plants
  '🐕', '🐈', '🦜', '🐟', '🐢', '🐹', '🐇', '🪴', '🌻', '🌳', '🍂', '💧',
  // Education & Skills
  '📚', '📖', '✏️', '📝', '💻', '🖥️', '🔬', '🧪', '🎨', '🎹', '🎸', '🥁', '🎺',
  // Faith & Reflection
  '🤲', '🕋', '🕌', '⛪', '🕍', '🕯️', '🧘', '🌙', '✨', '🛐',
  // Outdoor & Physical
  '⚽', '🏀', '🎾', '🏐', '🥋', '🏊', '🚴', '🏃', '🛹', '🚶', '🚗', '🛒',
  // Miscellaneous Ops
  '🗝️', '👞', '👕', '👖', '📦', '🧳', '🔋', '🛠️', '⚙️', '🛡️', '🛰️'
];

export const REWARD_ICONS = [
  // Food & Treats
  '🍦', '🍕', '🍔', '🍟', '🍩', '🍪', '🍰', '🧁', '🍬', '🍭', '🍫', '🍿', '🥤', '🍓', '🍒', '🍍',
  // Tech & Media
  '📺', '🎬', '🎮', '🕹️', '📱', '🎧', '🎸', '🎤', '💻', '📡',
  // Toys & Play
  '🧸', '🪁', '🧩', '🧱', '🎲', '🛹', '🛴', '🚲', '🏎️', '🛶', '🃏', '🪄',
  // Experiences
  '🎡', '🎢', '🎠', '🏰', '🏕️', '🏖️', '⛲', '🌠', '🛫', '🏨', '🎳', '⛳', '🎟️',
  // Creative & Stationery
  '🎨', '🖌️', '🖍️', '🧶', '🧵', '📷', '📸', '📓', '💎', '💰', '🎁', '🏆'
];

export const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const getXpForNextLevel = (level: number) => Math.pow(level, 2) * 50;
