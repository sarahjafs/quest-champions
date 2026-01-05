
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (url && key) {
    supabase = createClient(url, key);
    return true;
  }
  return false;
};

export const getFamilyData = async (familyCode: string): Promise<AppState | null> => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('family_vault')
    .select('data')
    .eq('family_code', familyCode.toUpperCase())
    .single();

  if (error || !data) return null;
  return data.data as AppState;
};

export const syncFamilyData = async (familyCode: string, state: AppState) => {
  if (!supabase) return;
  
  await supabase
    .from('family_vault')
    .upsert({ 
      family_code: familyCode.toUpperCase(), 
      data: state,
      updated_at: new Date().toISOString() 
    });
};

export const subscribeToFamily = (familyCode: string, callback: (newState: AppState) => void) => {
  if (!supabase) return null;

  const channel = supabase
    .channel(`family-${familyCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'family_vault',
        filter: `family_code=eq.${familyCode.toUpperCase()}`,
      },
      (payload) => {
        callback(payload.new.data as AppState);
      }
    )
    .subscribe();

  return channel;
};

// Generate a random tactical code like GHOST-7
export const generateFamilyCode = () => {
  const words = ['GHOST', 'ALPHA', 'BRAVO', 'TITAN', 'VULCAN', 'RAPTOR', 'SHADOW', 'STRIKE'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 99);
  return `${word}-${num}`;
};
