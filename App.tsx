import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, LogEntry, Chore } from './types';
import { INITIAL_STATE, calculateLevel, DEFAULT_CLOUD_CONFIG } from './constants';
import ChildView from './components/ChildView';
import ParentView from './components/ParentView';
import PinModal from './components/PinModal';
import LandingPage from './components/LandingPage';
import { initSupabase, subscribeToFamily, syncFamilyData, getFamilyData } from './services/supabaseService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('chorequest_state');
      if (!saved) return INITIAL_STATE;
      
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return INITIAL_STATE;

      if (!parsed.cloud || !parsed.cloud.supabaseUrl) {
        return { 
          ...parsed, 
          cloud: { 
            ...DEFAULT_CLOUD_CONFIG, 
            familyCode: parsed.cloud?.familyCode || '' 
          } 
        };
      }
      return parsed as AppState;
    } catch (e) {
      console.warn("Storage data corrupted or incompatible, reverting to default parameters.", e);
      return INITIAL_STATE;
    }
  });
  
  const [view, setView] = useState<'LANDING' | 'CHILD_SELECT' | 'CHILD_DASH' | 'PARENT_DASH'>(
    state.cloud?.familyCode ? 'CHILD_SELECT' : 'LANDING'
  );
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialMount = useRef(true);

  // Auto-join from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('code');
    if (sharedCode && sharedCode !== state.cloud?.familyCode) {
      handleJoinFamily(sharedCode.toUpperCase());
      // Clean up URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Initialize Supabase
  useEffect(() => {
    if (state.cloud?.supabaseUrl && state.cloud?.supabaseKey) {
      initSupabase(state.cloud.supabaseUrl, state.cloud.supabaseKey);
      
      if (state.cloud.familyCode) {
        const channel = subscribeToFamily(state.cloud.familyCode, (newState) => {
          setState(prev => ({ ...newState, cloud: prev.cloud }));
        });
        return () => { channel?.unsubscribe(); };
      }
    }
  }, [state.cloud?.supabaseUrl, state.cloud?.supabaseKey, state.cloud?.familyCode]);

  // Sync to Cloud
  useEffect(() => {
    localStorage.setItem('chorequest_state', JSON.stringify(state));
    
    if (!isInitialMount.current && state.cloud?.familyCode && state.cloud?.supabaseUrl) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        await syncFamilyData(state.cloud!.familyCode!, state);
        setIsSyncing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    isInitialMount.current = false;
  }, [state]);

  const addLog = (childName: string, action: string, type: LogEntry['type'], value: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      childName,
      action,
      type,
      value
    };
    setState(prev => ({ ...prev, logs: [newLog, ...prev.logs].slice(0, 50) }));
  };

  const handleJoinFamily = async (code: string) => {
    setIsSyncing(true);
    const remoteData = await getFamilyData(code);
    if (remoteData) {
      setState({ ...remoteData, cloud: { ...DEFAULT_CLOUD_CONFIG, familyCode: code } });
      setView('CHILD_SELECT');
      addLog('SYSTEM', 'SATELLITE SYNC', 'SYSTEM', `Linked to vault: ${code}`);
    } else {
      alert("Invalid Family Code. Command not found.");
    }
    setIsSyncing(false);
  };

  const handleCreateFamily = (code: string, pin: string) => {
    const newState = { 
      ...INITIAL_STATE, 
      parentPin: pin, 
      cloud: { ...DEFAULT_CLOUD_CONFIG, familyCode: code } 
    };
    setState(newState);
    setView('CHILD_SELECT');
    addLog('SYSTEM', 'VAULT CREATED', 'SYSTEM', `Initialized vault: ${code}`);
  };

  const handleLogout = useCallback(() => {
    if (confirm("Sever satellite uplink? This device will be disconnected from the cloud vault.")) {
      setState(prev => ({
        ...prev,
        cloud: prev.cloud ? { ...prev.cloud, familyCode: '' } : { ...DEFAULT_CLOUD_CONFIG, familyCode: '' }
      }));
      setSelectedChildId(null);
      setView('LANDING');
      
      const currentStateString = localStorage.getItem('chorequest_state');
      if (currentStateString) {
        try {
          const currentState = JSON.parse(currentStateString);
          if (currentState.cloud) {
            currentState.cloud.familyCode = '';
            localStorage.setItem('chorequest_state', JSON.stringify(currentState));
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleResetDailyChores = (childId: string) => {
    const child = state.children.find(c => c.id === childId);
    setState(prev => ({
      ...prev,
      chores: prev.chores.map(chore => {
        const isAssignedToChild = chore.assignedTo === childId || chore.assignedTo === 'ALL';
        const doneToday = chore.lastCompleted && new Date(chore.lastCompleted).toDateString() === new Date().toDateString();
        if (isAssignedToChild && doneToday) {
          return { ...chore, lastCompleted: undefined, pendingApproval: false };
        }
        return chore;
      })
    }));
    addLog(child?.name || 'Unit', 'DAILY MISSION REBOOT', 'SYSTEM', 'All today\'s tasks reactivated');
  };

  const handleAdjustStats = (childId: string, coinsDelta: number, xpDelta: number) => {
    setState(prev => {
      const children = prev.children.map(c => {
        if (c.id === childId) {
          const newXp = Math.max(0, c.xp + xpDelta);
          const newLevel = calculateLevel(newXp);
          return {
            ...c,
            coins: Math.max(0, c.coins + coinsDelta),
            xp: newXp,
            level: newLevel
          };
        }
        return c;
      });
      return { ...prev, children };
    });
    const child = state.children.find(c => c.id === childId);
    addLog(child?.name || 'Unit', 'FIELD CORRECTION', 'SYSTEM', `Adj: ${coinsDelta >= 0 ? '+' : ''}${coinsDelta} Credits, ${xpDelta >= 0 ? '+' : ''}${xpDelta} XP`);
  };

  const isChoreAvailable = (chore: Chore): boolean => {
    if (!chore.lastCompleted) return true;
    const last = new Date(chore.lastCompleted);
    const now = new Date();
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    switch (chore.frequency) {
      case 'Prayer':
      case 'Daily':
        return last < startOfToday;
      case 'Weekly':
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        return last < startOfWeek;
      case 'Fortnightly':
        const oneFortnight = 14 * 24 * 60 * 60 * 1000;
        return now.getTime() - last.getTime() >= oneFortnight;
      case 'Specific Date':
        if (!chore.specificDate) return true;
        const target = new Date(chore.specificDate);
        target.setHours(0,0,0,0);
        return now.toDateString() === target.toDateString() && last < target;
      case 'One-off':
        return false;
      default:
        return false;
    }
  };

  const handleCompleteChore = (choreId: string) => {
    setState(prev => {
      const chore = prev.chores.find(c => c.id === choreId);
      const child = prev.children.find(c => c.id === selectedChildId);
      if (!chore || !child) return prev;
      
      const isCurrentlyPending = !!chore.pendingApproval;
      const updatedChores = prev.chores.map(c => c.id === choreId ? { 
        ...c, 
        pendingApproval: !isCurrentlyPending,
        completedBy: !isCurrentlyPending ? child.id : undefined 
      } : c);
      
      const action = isCurrentlyPending ? `Retracted mission: ${chore.title}` : `Completed mission: ${chore.title}`;
      const status = isCurrentlyPending ? 'Awaiting Field Work' : 'Pending Review';

      return {
        ...prev,
        chores: updatedChores,
        logs: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          childName: child.name,
          action: action,
          type: 'CHORE',
          value: status
        } as LogEntry, ...prev.logs].slice(0, 50)
      };
    });
  };

  const handleApproveChore = (choreId: string) => {
    setState(prev => {
      const chore = prev.chores.find(c => c.id === choreId);
      const childId = chore?.assignedTo === 'ALL' ? chore?.completedBy : chore?.assignedTo;
      const child = prev.children.find(c => c.id === childId);
      
      if (!chore || !child) return prev;
      
      const newXp = child.xp + chore.xp;
      const newLevel = calculateLevel(newXp);
      const levelUp = newLevel > child.level;
      
      const logs = [{
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        childName: child.name,
        action: `Mission Approved: ${chore.title}`,
        type: 'CHORE',
        value: `+${chore.coins} Credits, +${chore.xp} XP`
      } as LogEntry];

      if (levelUp) {
        logs.unshift({
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString(),
          childName: child.name,
          action: `RANK UP! Now Level ${newLevel}`,
          type: 'SYSTEM',
          value: 'PRESTIGE INCREASED'
        } as LogEntry);
      }

      return {
        ...prev,
        children: prev.children.map(c => c.id === child.id ? { ...c, coins: c.coins + chore.coins, xp: newXp, level: newLevel } : c),
        chores: prev.chores.map(c => c.id === choreId ? { ...c, pendingApproval: false, lastCompleted: new Date().toISOString(), completedBy: undefined } : c),
        logs: [...logs, ...prev.logs].slice(0, 50)
      };
    });
  };

  const handleRejectChore = (choreId: string) => {
    setState(prev => {
      const chore = prev.chores.find(c => c.id === choreId);
      const childId = chore?.assignedTo === 'ALL' ? chore?.completedBy : chore?.assignedTo;
      const child = prev.children.find(c => c.id === childId);
      return {
        ...prev,
        chores: prev.chores.map(c => c.id === choreId ? { ...c, pendingApproval: false, completedBy: undefined } : c),
        logs: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          childName: child?.name || 'Unknown',
          action: `Mission Rejected: ${chore?.title}`,
          type: 'SYSTEM',
          value: 'RETURNED TO FIELD'
        } as LogEntry, ...prev.logs].slice(0, 50)
      };
    });
  };

  const handleClaimReward = (rewardId: string, childId: string) => {
    setState(prev => {
      const reward = prev.rewards.find(r => r.id === rewardId);
      const child = prev.children.find(c => c.id === childId);
      if (!reward || !child || child.coins < reward.cost) return prev;
      
      return {
        ...prev,
        children: prev.children.map(c => c.id === childId ? { ...c, coins: c.coins - reward.cost } : c),
        logs: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          childName: child.name,
          action: `Asset Acquired: ${reward.title}`,
          type: 'REWARD',
          value: `-${reward.cost} Credits`
        } as LogEntry, ...prev.logs].slice(0, 50)
      };
    });
  };

  const handleUpdateState = (newState: Partial<AppState>) => setState(prev => ({ ...prev, ...newState }));

  const currentChild = state.children.find(c => c.id === selectedChildId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-kids selection:bg-green-500/30">
      {view !== 'LANDING' && (
        <header className="bg-slate-900 border-b-4 border-slate-800 p-4 sticky top-0 z-40 shadow-2xl">
          <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('CHILD_SELECT'); setSelectedChildId(null); }}>
              <div className="bg-slate-800 p-2 rounded-tl-xl rounded-br-xl border-2 border-green-500 font-ops text-green-500 text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">QC</div>
              <div className="hidden sm:flex flex-col">
                <span className="font-ops text-lg text-white uppercase tracking-tighter">Command</span>
                <span className="text-[8px] font-mono-bold text-green-500 uppercase tracking-widest">{state.cloud?.familyCode}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.preventDefault(); handleLogout(); }}
                className="px-4 py-2 rounded font-ops text-[10px] bg-slate-800 border-b-4 border-slate-950 text-slate-500 hover:text-red-400 hover:border-red-900 transition-all active:translate-y-1 uppercase tracking-widest flex items-center gap-2"
                title="Disconnect from Cloud"
              >
                <span>📡</span>
                <span>Disconnect</span>
              </button>
              <button 
                onClick={() => view === 'PARENT_DASH' ? setView('CHILD_SELECT') : setShowPinModal(true)} 
                className={`px-4 py-2 rounded font-ops text-[10px] border-b-4 transition-all active:translate-y-1 uppercase tracking-widest ${view === 'PARENT_DASH' ? 'bg-red-600 border-red-800 text-white shadow-[0_4px_0_rgb(153,27,27)]' : 'bg-slate-800 border-slate-950 text-slate-300 shadow-[0_4px_0_rgb(2,6,23)]'}`}
              >
                {view === 'PARENT_DASH' ? 'Exit HQ' : 'Admin Auth'}
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto p-4">
        {view === 'LANDING' && <LandingPage onJoin={handleJoinFamily} onCreate={handleCreateFamily} />}

        {view === 'CHILD_SELECT' && (
          <div className="text-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-ops text-5xl mb-12 uppercase text-white tracking-tighter drop-shadow-2xl">Operative Select</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.children.map(child => (
                <button 
                  key={child.id} 
                  onClick={() => { setSelectedChildId(child.id); setView('CHILD_DASH'); }} 
                  className="bg-slate-900 p-8 rounded-2xl border-4 border-slate-800 hover:border-green-500 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                    <div className="bg-green-500 text-[8px] font-mono-bold px-1 rounded uppercase">Ready</div>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-7xl group-hover:scale-110 transition-transform">{child.avatar}</span>
                    <span className="font-ops text-sm bg-slate-800 px-3 py-1 rounded border border-green-500 text-green-500 shadow-lg">Rank {child.level}</span>
                  </div>
                  <h3 className="font-ops text-3xl text-white uppercase mb-2 group-hover:text-green-400 transition-colors">{child.name}</h3>
                  <div className="flex gap-4 text-xs font-mono-bold text-slate-500">
                    <span className="flex items-center gap-1">💎 {child.coins.toLocaleString()}</span>
                    <span className="flex items-center gap-1">⚡ {child.xp.toLocaleString()}</span>
                  </div>
                </button>
              ))}
              
              {state.children.length < 6 && (
                <button 
                  onClick={() => setShowPinModal(true)}
                  className="bg-slate-900/40 p-8 rounded-2xl border-4 border-dashed border-slate-800 text-slate-600 font-ops text-xl uppercase hover:border-slate-700 hover:text-slate-400 transition-all flex flex-col items-center justify-center gap-4"
                >
                  <span className="text-4xl">+</span>
                  Enlist Operative
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'CHILD_DASH' && currentChild && (
          <ChildView 
            child={currentChild} 
            chores={state.chores.filter(c => (c.assignedTo === currentChild.id || c.assignedTo === 'ALL') && (isChoreAvailable(c) || c.pendingApproval))} 
            rewards={state.rewards} 
            onCompleteChore={handleCompleteChore} 
            onClaimReward={handleClaimReward} 
            onUpdateProfile={(updates) => {
              setState(prev => ({...prev, children: prev.children.map(c => c.id === currentChild.id ? {...c, ...updates} : c)}));
              addLog(currentChild.name, 'Profile Updated', 'SYSTEM', 'Appearance modification synced');
            }}
          />
        )}

        {view === 'PARENT_DASH' && (
          <ParentView 
            state={state} 
            onUpdateState={handleUpdateState} 
            onApproveChore={handleApproveChore} 
            onRejectChore={handleRejectChore} 
            onLogout={handleLogout}
            onResetDailyChores={handleResetDailyChores}
            onAdjustStats={handleAdjustStats}
          />
        )}
      </main>

      <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} correctPin={state.parentPin} onSuccess={() => { setView('PARENT_DASH'); setShowPinModal(false); }} />
    </div>
  );
};

export default App;
