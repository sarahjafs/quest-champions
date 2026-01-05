
import React, { useState, useEffect } from 'react';
import { AppState, Child, Chore, Reward, Frequency } from '../types';
import { AVATARS, CHORE_ICONS, REWARD_ICONS, INITIAL_STATE, DEFAULT_CLOUD_CONFIG } from '../constants';
import { suggestChore } from '../services/geminiService';
import { generateFamilyCode, getFamilyData, initSupabase } from '../services/supabaseService';

interface ParentViewProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  onApproveChore: (id: string) => void;
  onRejectChore: (id: string) => void;
  onLogout: () => void;
  onResetDailyChores: (childId: string) => void;
  onAdjustStats: (childId: string, coins: number, xp: number) => void;
}

const ParentView: React.FC<ParentViewProps> = ({ state, onUpdateState, onApproveChore, onRejectChore, onLogout, onResetDailyChores, onAdjustStats }) => {
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'LOGS' | 'BUILDER' | 'ROSTER' | 'SYSTEM'>('MANAGEMENT');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiKeywords, setAiKeywords] = useState('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<{msg: string, error: boolean} | null>(null);
  const [showAdvancedCloud, setShowAdvancedCloud] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Prayer Loadout States
  const [prayerLocation, setPrayerLocation] = useState('');
  const [fetchedTimings, setFetchedTimings] = useState<Record<string, string> | null>(null);
  const [isPrayerLoading, setIsPrayerLoading] = useState(false);
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);

  // Correction States
  const [expandingChildId, setExpandingChildId] = useState<string | null>(null);
  const [statAdjustment, setStatAdjustment] = useState({ coins: 0, xp: 0 });

  // Security Inputs
  const [newPin, setNewPin] = useState('');
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  // Cloud Config Inputs
  const [cloudInput, setCloudInput] = useState({
    supabaseUrl: state.cloud?.supabaseUrl || DEFAULT_CLOUD_CONFIG.supabaseUrl,
    supabaseKey: state.cloud?.supabaseKey || DEFAULT_CLOUD_CONFIG.supabaseKey,
    familyCode: state.cloud?.familyCode || ''
  });

  // Builder Form States
  const [newChore, setNewChore] = useState<Partial<Chore>>({ 
    title: '', description: '', coins: 10, xp: 20, frequency: 'Daily', icon: '🧹', assignedTo: 'ALL', specificDate: ''
  });
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);

  const [newReward, setNewReward] = useState<Partial<Reward>>({ 
    title: '', description: '', cost: 50, icon: '🍕' 
  });
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  const [newChild, setNewChild] = useState({ name: '', avatar: AVATARS[0] });

  const pendingChores = state.chores.filter(c => c.pendingApproval);

  const handleUpdatePin = () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinStatus("PIN must be exactly 4 digits.");
      setTimeout(() => setPinStatus(null), 3000);
      return;
    }
    onUpdateState({ parentPin: newPin });
    setNewPin('');
    setPinStatus("Encryption Code Updated.");
    setTimeout(() => setPinStatus(null), 3000);
  };

  const handleCopyInviteLink = () => {
    if (!state.cloud?.familyCode) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?code=${state.cloud.familyCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  const handleFetchPrayerTimings = async () => {
    if (!prayerLocation) return;
    setIsPrayerLoading(true);
    try {
      // Manual entry location fetch - using Aladhan API by address
      const res = await fetch(`https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(prayerLocation)}&method=2`);
      const json = await res.json();
      if (json.data && json.data.timings) {
        setFetchedTimings(json.data.timings);
      } else {
        alert("Location coordinate lock failed. HQ satellites cannot find this site.");
      }
    } catch (e) {
      alert("Satellite connection interrupted.");
    } finally {
      setIsPrayerLoading(false);
    }
  };

  const handleDeploySelectedPrayers = () => {
    if (!fetchedTimings) return;
    
    const newMissions: Chore[] = selectedPrayers.map(name => ({
      id: `prayer-${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${name} Operation`,
      description: `Spiritual objective scheduled for ${fetchedTimings[name]}. Execute mission at the tactical window.`,
      coins: 15,
      xp: 25,
      frequency: 'Prayer',
      icon: '🌙',
      assignedTo: 'ALL'
    }));

    onUpdateState({ chores: [...state.chores, ...newMissions] });
    setFetchedTimings(null);
    setPrayerLocation('');
    alert(`Deployed ${newMissions.length} Prayer Cycles to Global Ops.`);
  };

  const handleAddOrUpdateChore = () => {
    if (!newChore.title || !newChore.assignedTo) return;
    
    if (editingChoreId) {
      onUpdateState({
        chores: state.chores.map(c => c.id === editingChoreId ? {
          ...c,
          title: newChore.title!,
          description: newChore.description || '',
          coins: Number(newChore.coins) || 10,
          xp: Number(newChore.xp) || 20,
          frequency: (newChore.frequency as Frequency) || 'Daily',
          specificDate: newChore.specificDate,
          icon: newChore.icon || '🧹',
          assignedTo: newChore.assignedTo!
        } : c)
      });
      setEditingChoreId(null);
    } else {
      const chore: Chore = { 
        id: Date.now().toString(), 
        title: newChore.title!, 
        description: newChore.description || '', 
        coins: Number(newChore.coins) || 10, 
        xp: Number(newChore.xp) || 20, 
        frequency: (newChore.frequency as Frequency) || 'Daily', 
        specificDate: newChore.specificDate,
        icon: newChore.icon || '🧹', 
        assignedTo: newChore.assignedTo! 
      };
      onUpdateState({ chores: [...state.chores, chore] });
    }
    setNewChore({ title: '', description: '', coins: 10, xp: 20, frequency: 'Daily', icon: '🧹', assignedTo: 'ALL', specificDate: '' });
  };

  const handleEditChore = (chore: Chore) => {
    setNewChore({ ...chore });
    setEditingChoreId(chore.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteChore = (id: string) => {
    onUpdateState({ chores: state.chores.filter(c => c.id !== id) });
    if (editingChoreId === id) setEditingChoreId(null);
  };

  const handleAddOrUpdateReward = () => {
    if (!newReward.title) return;

    if (editingRewardId) {
      onUpdateState({
        rewards: state.rewards.map(r => r.id === editingRewardId ? {
          ...r,
          title: newReward.title!,
          description: newReward.description || '',
          cost: Number(newReward.cost) || 50,
          icon: newReward.icon || '🍕'
        } : r)
      });
      setEditingRewardId(null);
    } else {
      const reward: Reward = { 
        id: Date.now().toString(), 
        title: newReward.title!, 
        description: newReward.description || '', 
        cost: Number(newReward.cost) || 50, 
        icon: newReward.icon || '🍕' 
      };
      onUpdateState({ rewards: [...state.rewards, reward] });
    }
    setNewReward({ title: '', description: '', cost: 50, icon: '🍕' });
  };

  const handleEditReward = (reward: Reward) => {
    setNewReward({ ...reward });
    setEditingRewardId(reward.id);
  };

  const handleDeleteReward = (id: string) => {
    onUpdateState({ rewards: state.rewards.filter(r => r.id !== id) });
    if (editingRewardId === id) setEditingRewardId(null);
  };

  const handleAddChild = () => {
    if (!newChild.name) return;
    const child: Child = { 
      id: Date.now().toString(), 
      name: newChild.name, 
      avatar: newChild.avatar, 
      coins: 0, 
      xp: 0, 
      level: 1 
    };
    onUpdateState({ children: [...state.children, child] });
    setNewChild({ name: '', avatar: AVATARS[0] });
  };

  const handleDeleteChild = (id: string) => {
    if (state.children.length <= 1) return alert("Operation requires at least one operative.");
    if (confirm(`Confirm discharge of operative ${state.children.find(c => c.id === id)?.name}?`)) {
      onUpdateState({ 
        children: state.children.filter(c => c.id !== id),
        chores: state.chores.filter(c => c.assignedTo !== id)
      });
    }
  };

  const handleSatelliteUplink = async () => {
    setIsCloudLoading(true);
    initSupabase(cloudInput.supabaseUrl, cloudInput.supabaseKey);

    try {
      if (cloudInput.familyCode) {
        const existingData = await getFamilyData(cloudInput.familyCode);
        if (existingData) {
          onUpdateState({ ...existingData, cloud: { ...cloudInput } });
          setImportStatus({ msg: `Link established: ${cloudInput.familyCode}`, error: false });
        } else {
          setImportStatus({ msg: "Family dossier not found.", error: true });
        }
      } else {
        const newCode = generateFamilyCode();
        const updatedCloud = { ...cloudInput, familyCode: newCode };
        onUpdateState({ cloud: updatedCloud });
        setCloudInput(prev => ({ ...prev, familyCode: newCode }));
        setImportStatus({ msg: `Uplink Active: ${newCode}`, error: false });
      }
    } catch (e) {
      setImportStatus({ msg: "Uplink Failed.", error: true });
    } finally {
      setIsCloudLoading(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    const suggestions = await suggestChore(8, aiKeywords);
    if (suggestions.length > 0) {
      const newChores = suggestions.map((s: any) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        assignedTo: 'ALL',
        coins: s.suggestedCoins,
        xp: s.suggestedXp,
        frequency: s.frequency || 'Daily'
      }));
      onUpdateState({ chores: [...state.chores, ...newChores] });
    }
    setIsAiLoading(false);
  };

  const handleResetData = () => { if (confirm("Initiate Global Wipe? All data will be lost locally.")) onUpdateState(INITIAL_STATE); };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-950 p-4 md:p-6 text-white border-b-4 border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="font-ops text-2xl uppercase tracking-widest text-green-500">Command Center</h2>
          <div className="flex flex-wrap justify-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'MANAGEMENT', label: 'Tactical' },
              { id: 'BUILDER', label: 'Loadout' },
              { id: 'ROSTER', label: 'Unit' },
              { id: 'LOGS', label: 'Intel' },
              { id: 'SYSTEM', label: 'System' }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-4 py-2 rounded-md font-ops text-[9px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'hover:bg-slate-800 text-slate-500'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 text-slate-200 min-h-[500px]">
        {activeTab === 'MANAGEMENT' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            {pendingChores.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-ops text-xl text-amber-500 flex items-center gap-2 uppercase tracking-tighter">🚨 Mission Debriefs</h3>
                <div className="grid grid-cols-1 gap-3">
                  {pendingChores.map(chore => {
                    const childId = chore.assignedTo === 'ALL' ? chore.completedBy : chore.assignedTo;
                    const child = state.children.find(c => c.id === childId);
                    return (
                      <div key={chore.id} className="bg-slate-950 border-2 border-amber-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                        <div className="flex items-center gap-4 w-full">
                          <div className="text-4xl bg-slate-900 p-2 rounded-lg border border-slate-800">{chore.icon}</div>
                          <div>
                            <div className="font-ops text-slate-100 text-lg uppercase tracking-tighter">{chore.title}</div>
                            <div className="text-[10px] font-mono-bold text-amber-500 uppercase">Field Report from: {child?.name || 'Unknown'}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => onApproveChore(chore.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-ops uppercase text-xs border-b-4 border-green-800 active:translate-y-1">Approve</button>
                          <button onClick={() => onRejectChore(chore.id)} className="flex-1 bg-red-900/20 text-red-500 border border-red-500/30 px-6 py-3 rounded-lg font-ops uppercase text-xs hover:bg-red-900/40">Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-ops text-xl text-slate-100 uppercase tracking-tighter">🛰️ Ongoing Operations</h3>
              </div>
              
              <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono-bold text-slate-500 uppercase tracking-widest ml-1">AI Mission Directives (Keywords)</label>
                  <textarea 
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    placeholder="e.g. Tidy workspace, Quran reading, Science homework, Exercise..."
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono-bold text-slate-300 h-20 outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <button onClick={handleAiSuggest} disabled={isAiLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-ops text-xs uppercase border-b-4 border-indigo-800 active:translate-y-1 disabled:opacity-50 shadow-lg">
                  {isAiLoading ? 'ANALYTICS ACTIVE...' : '⚡ Generate AI Missions with Keywords'}
                </button>
              </div>

              <div className="overflow-x-auto border-4 border-slate-800 rounded-2xl bg-slate-950/50">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-600 uppercase text-[9px] font-mono-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4">Objective</th>
                      <th className="p-4">Operative</th>
                      <th className="p-4">Reward</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Abort</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono-bold text-xs">
                    {state.chores.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-600 uppercase tracking-widest font-ops text-lg">No Missions Assigned</td></tr>
                    ) : (
                      state.chores.map(chore => {
                        const assignedHero = state.children.find(c => c.id === chore.assignedTo);
                        const isDone = chore.lastCompleted && new Date(chore.lastCompleted).toDateString() === new Date().toDateString();
                        return (
                          <tr key={chore.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <span className="text-2xl">{chore.icon}</span>
                              <div>
                                <div className="font-ops text-slate-100 uppercase tracking-tight">{chore.title}</div>
                                <div className="text-[9px] text-slate-500 uppercase">{chore.frequency} {chore.frequency === 'Specific Date' && chore.specificDate ? `(${new Date(chore.specificDate).toLocaleDateString()})` : ''}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 uppercase text-[10px]">
                                {chore.assignedTo === 'ALL' ? 'ALL OPERATIVES' : assignedHero?.name || '---'}
                              </span>
                            </td>
                            <td className="p-4 text-amber-500">💎 {chore.coins}</td>
                            <td className="p-4">{isDone ? <span className="text-green-500">DONE</span> : chore.pendingApproval ? <span className="text-amber-500 animate-pulse">REVIEW</span> : <span className="text-slate-600">ACTIVE</span>}</td>
                            <td className="p-4">
                              <button onClick={() => handleDeleteChore(chore.id)} className="text-red-500 hover:text-red-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'BUILDER' && (
          <div className="space-y-8 animate-in slide-in-from-left-4">
            {/* New Specialized Prayer Cycle Feature */}
            <div className="bg-slate-950 p-6 rounded-2xl border-4 border-indigo-500/30 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <span className="text-8xl">🕌</span>
               </div>
               <h3 className="font-ops text-xl text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                 <span>🌙</span> Specialized Prayer Cycle
               </h3>
               <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4">
                   <div className="flex-1 space-y-1">
                     <label className="text-[9px] font-mono-bold text-slate-500 uppercase tracking-widest ml-1">Parent Entry: Station Location</label>
                     <input 
                       type="text" 
                       value={prayerLocation} 
                       onChange={e => setPrayerLocation(e.target.value)} 
                       placeholder="ENTER CITY (E.G. MECCA, LONDON, TOKYO)" 
                       className="w-full bg-slate-900 p-4 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-indigo-500 uppercase text-xs"
                     />
                   </div>
                   <button 
                     onClick={handleFetchPrayerTimings} 
                     disabled={isPrayerLoading || !prayerLocation}
                     className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-ops text-xs uppercase border-b-4 border-indigo-800 active:translate-y-1 transition-all h-fit self-end"
                   >
                     {isPrayerLoading ? 'SCANNING...' : 'GET TIMINGS'}
                   </button>
                 </div>

                 {fetchedTimings && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                       {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name => (
                         <label 
                          key={name} 
                          className={`cursor-pointer bg-slate-900 border-2 p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${selectedPrayers.includes(name) ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 grayscale opacity-60'}`}
                         >
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={selectedPrayers.includes(name)}
                             onChange={() => setSelectedPrayers(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name])}
                           />
                           <span className="font-ops text-[10px] text-slate-500 uppercase">{name}</span>
                           <span className="font-mono-bold text-xl text-indigo-400">{fetchedTimings[name]}</span>
                           <div className={`w-4 h-4 rounded-full border-2 ${selectedPrayers.includes(name) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'}`} />
                         </label>
                       ))}
                     </div>
                     <button 
                       onClick={handleDeploySelectedPrayers}
                       className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-ops text-xs uppercase tracking-widest border-b-4 border-green-800 active:translate-y-1 shadow-xl"
                     >
                       Enlist Selected Prayer Cycle to Global Ops
                     </button>
                   </div>
                 )}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-950 p-6 rounded-2xl border-4 border-slate-800 space-y-6 h-fit">
                <h3 className="font-ops text-xl text-green-500 uppercase tracking-widest flex items-center gap-3">
                  <span className="text-2xl">📋</span> {editingChoreId ? 'Refine Mission' : 'Mission Forge'}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Objective Callsign</label>
                        <input type="text" placeholder="E.G. NEAT QUARTERS" value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-green-500 uppercase" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Assign Unit</label>
                        <select value={newChore.assignedTo} onChange={e => setNewChore({...newChore, assignedTo: e.target.value})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-green-500 uppercase">
                          <option value="ALL">ALL OPERATIVES</option>
                          {state.children.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Operation Briefing</label>
                    <textarea placeholder="MISSION DETAILS..." value={newChore.description} onChange={e => setNewChore({...newChore, description: e.target.value})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-mono-bold text-xs text-white outline-none focus:border-green-500 h-20 uppercase" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-[8px] font-mono-bold text-slate-600 uppercase ml-2">Credits</label><input type="number" value={newChore.coins} onChange={e => setNewChore({...newChore, coins: Number(e.target.value)})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-amber-500" /></div>
                    <div><label className="text-[8px] font-mono-bold text-slate-600 uppercase ml-2">XP</label><input type="number" value={newChore.xp} onChange={e => setNewChore({...newChore, xp: Number(e.target.value)})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="text-[8px] font-mono-bold text-slate-600 uppercase ml-2">Cycle</label>
                    <select value={newChore.frequency} onChange={e => setNewChore({...newChore, frequency: e.target.value as Frequency})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-[10px] text-white outline-none focus:border-green-500 uppercase">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Fortnightly">Fortnightly</option>
                      <option value="Specific Date">Specific Date</option>
                      <option value="One-off">Once</option>
                      <option value="Prayer">Prayer Cycle</option>
                    </select></div>
                  </div>
                  {newChore.frequency === 'Specific Date' && (
                    <div className="space-y-1 animate-in slide-in-from-top-2">
                      <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Target Date</label>
                      <input type="date" value={newChore.specificDate} onChange={e => setNewChore({...newChore, specificDate: e.target.value})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-mono text-white outline-none focus:border-green-500" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Select Icon</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-xl border-2 border-slate-800 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-slate-700">
                      {CHORE_ICONS.map(icon => (
                        <button key={icon} onClick={() => setNewChore({...newChore, icon})} className={`text-2xl p-2 rounded-lg border-2 transition-all ${newChore.icon === icon ? 'bg-green-600 border-green-400 scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100'}`}>{icon}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingChoreId && (
                      <button onClick={() => { setEditingChoreId(null); setNewChore({ title: '', description: '', coins: 10, xp: 20, frequency: 'Daily', icon: '🧹', assignedTo: 'ALL', specificDate: '' }); }} className="flex-1 bg-slate-700 hover:bg-slate-600 p-4 rounded-xl font-ops text-white uppercase tracking-widest transition-all">Cancel</button>
                    )}
                    <button onClick={handleAddOrUpdateChore} className={`flex-[2] ${editingChoreId ? 'bg-blue-600 hover:bg-blue-500 border-blue-800' : 'bg-green-600 hover:bg-green-500 border-green-800'} p-4 rounded-xl font-ops text-white uppercase tracking-widest border-b-4 active:translate-y-1 transition-all`}>
                      {editingChoreId ? 'Save Changes' : 'Enlist Mission'}
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800">
                  <h4 className="font-ops text-xs text-slate-500 uppercase mb-4 tracking-widest">Global Ops Loadout</h4>
                  <div className="space-y-2">
                    {state.chores.map(c => (
                      <div key={c.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{c.icon}</span>
                            <div>
                              <div className="text-[10px] font-ops uppercase truncate max-w-[120px] text-white">{c.title}</div>
                              <div className="text-[8px] text-slate-500 font-mono-bold">
                                  {c.assignedTo === 'ALL' ? 'ALL OPERATIVES' : state.children.find(child => child.id === c.assignedTo)?.name.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditChore(c)} className="text-blue-500 p-1 hover:bg-blue-500/10 rounded">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteChore(c.id)} className="text-red-500 p-1 hover:bg-red-500/10 rounded">✖</button>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border-4 border-slate-800 space-y-6 h-fit">
                <h3 className="font-ops text-xl text-amber-500 uppercase tracking-widest flex items-center gap-3">
                  <span className="text-2xl">💎</span> {editingRewardId ? 'Refine Asset' : 'Armory Forge'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Reward Identification</label>
                    <input type="text" placeholder="E.G. SCREEN TIME BUNDLE" value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} className="w-full bg-slate-900 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-amber-500 uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Asset Cost (Credits)</label>
                    <input type="number" placeholder="COST" value={newReward.cost} onChange={e => setNewReward({...newReward, cost: Number(e.target.value)})} className="w-full bg-slate-950 p-3 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Select Icon</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-xl border-2 border-slate-800 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-slate-700">
                      {REWARD_ICONS.map(icon => (
                        <button key={icon} onClick={() => setNewReward({...newReward, icon})} className={`text-2xl p-2 rounded-lg border-2 transition-all ${newReward.icon === icon ? 'bg-amber-600 border-amber-400 scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100'}`}>{icon}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingRewardId && (
                      <button onClick={() => { setEditingRewardId(null); setNewReward({ title: '', description: '', cost: 50, icon: '🍕' }); }} className="flex-1 bg-slate-700 hover:bg-slate-600 p-4 rounded-xl font-ops text-white uppercase tracking-widest transition-all">Cancel</button>
                    )}
                    <button onClick={handleAddOrUpdateReward} className={`flex-[2] ${editingRewardId ? 'bg-blue-600 hover:bg-blue-500 border-blue-800' : 'bg-amber-600 hover:bg-amber-500 border-amber-800'} p-4 rounded-xl font-ops text-white uppercase tracking-widest border-b-4 active:translate-y-1 transition-all`}>
                      {editingRewardId ? 'Save Changes' : 'Add to Armory'}
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800">
                  <h4 className="font-ops text-xs text-slate-500 uppercase mb-4 tracking-widest">Active Armory Stock</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {state.rewards.map(r => (
                      <div key={r.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{r.icon}</span>
                            <div className="text-[10px] font-ops uppercase truncate max-w-[80px] text-white">{r.title}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-amber-500 font-mono-bold">💎 {r.cost}</span>
                            <button onClick={() => handleEditReward(r)} className="text-blue-500 hover:bg-blue-500/10 p-1 rounded">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteReward(r.id)} className="text-red-500 p-1 hover:bg-red-500/10 rounded">✖</button>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ROSTER' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-950 p-6 rounded-2xl border-4 border-slate-800">
              <h3 className="font-ops text-xl text-white uppercase tracking-widest mb-6">Enlist New Operative</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Operative Callsign</label>
                    <input type="text" placeholder="E.G. GHOST_ONE" value={newChild.name} onChange={e => setNewChild({...newChild, name: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl border-2 border-slate-800 font-ops text-white outline-none focus:border-green-500 uppercase" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono-bold text-slate-500 uppercase ml-2">Appearance Profile</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-xl border-2 border-slate-800">
                      {AVATARS.map(avatar => (
                        <button key={avatar} onClick={() => setNewChild({...newChild, avatar})} className={`text-3xl p-2 rounded-lg border-2 transition-all ${newChild.avatar === avatar ? 'bg-green-600 border-green-400 scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100'}`}>{avatar}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleAddChild} className="w-full bg-green-600 hover:bg-green-500 p-6 rounded-xl font-ops text-xl text-white uppercase tracking-widest border-b-4 border-green-800 active:translate-y-1 shadow-2xl">Enlist Hero</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {state.children.map(child => (
                <div key={child.id} className={`bg-slate-950 rounded-2xl border-4 transition-all shadow-lg overflow-hidden ${expandingChildId === child.id ? 'border-indigo-500' : 'border-slate-800'}`}>
                  <div className="p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandingChildId(expandingChildId === child.id ? null : child.id)}>
                      <span className="text-6xl drop-shadow-lg">{child.avatar}</span>
                      <div>
                        <div className="font-ops text-xl text-white uppercase flex items-center gap-2">
                          {child.name}
                          <span className="text-[10px] bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 tracking-widest">Field Correction</span>
                        </div>
                        <div className="text-[10px] font-mono-bold text-slate-500 uppercase">Clearance: Level {child.level} • Credits: {child.coins} • XP: {child.xp}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpandingChildId(expandingChildId === child.id ? null : child.id)} className={`font-ops text-[10px] uppercase px-4 py-2 rounded border transition-all ${expandingChildId === child.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}>
                        {expandingChildId === child.id ? 'Close Record' : 'Open Record'}
                      </button>
                      <button onClick={() => handleDeleteChild(child.id)} className="text-red-500 font-ops text-[10px] uppercase border-2 border-red-500/20 px-3 py-1 rounded-md hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">Discharge</button>
                    </div>
                  </div>

                  {expandingChildId === child.id && (
                    <div className="bg-slate-900/50 p-6 border-t-2 border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4">
                      <div className="space-y-4">
                        <h4 className="font-ops text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <span>🔄</span> Mission State Reboot
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono-bold uppercase leading-relaxed">
                          Reset completion status for all tasks assigned to this unit that were performed today. Allows for re-earning rewards or repeating field work.
                        </p>
                        <button 
                          onClick={() => { if(confirm(`Reboot all today's missions for ${child.name}?`)) onResetDailyChores(child.id); }}
                          className="w-full bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 py-3 rounded-xl font-ops text-[10px] uppercase tracking-widest transition-all"
                        >
                          Trigger Daily Reboot
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-ops text-xs text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <span>⚙️</span> Score Adjustment
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-mono-bold text-slate-600 uppercase ml-1">Credits Delta</label>
                            <input 
                              type="number" 
                              value={statAdjustment.coins} 
                              onChange={e => setStatAdjustment({ ...statAdjustment, coins: Number(e.target.value) })}
                              className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-amber-500 font-ops outline-none focus:border-amber-500" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-mono-bold text-slate-600 uppercase ml-1">XP Delta</label>
                            <input 
                              type="number" 
                              value={statAdjustment.xp} 
                              onChange={e => setStatAdjustment({ ...statAdjustment, xp: Number(e.target.value) })}
                              className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-blue-500 font-ops outline-none focus:border-blue-500" 
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => { 
                            onAdjustStats(child.id, statAdjustment.coins, statAdjustment.xp);
                            setStatAdjustment({ coins: 0, xp: 0 });
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-ops text-[10px] uppercase tracking-widest border-b-4 border-amber-800 active:translate-y-1 shadow-lg transition-all"
                        >
                          Sync Correction
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h3 className="font-ops text-xl text-white uppercase tracking-widest flex items-center gap-2">
              <span className="text-blue-500">📡</span> Intelligence Feed
            </h3>
            <div className="bg-slate-950 rounded-2xl border-4 border-slate-800 overflow-hidden shadow-2xl">
              {state.logs.length === 0 ? (
                <div className="p-24 text-center text-slate-700 font-ops uppercase tracking-widest text-2xl">No Activity Detected</div>
              ) : (
                <div className="divide-y divide-slate-900">
                  {state.logs.map(log => (
                    <div key={log.id} className="p-5 flex justify-between items-center hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] ${log.type === 'CHORE' ? 'bg-green-500 shadow-green-500/50' : log.type === 'REWARD' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-blue-500 shadow-blue-500/50'}`} />
                        <div>
                          <div className="text-sm font-mono-bold text-slate-100 uppercase tracking-tight">{log.action}</div>
                          <div className="text-[10px] font-mono-bold text-slate-600 uppercase tracking-widest">
                            {log.childName} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-ops px-3 py-1 rounded-full border ${log.type === 'CHORE' ? 'border-green-500/20 text-green-500 bg-green-500/5' : log.type === 'REWARD' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : 'border-blue-500/20 text-blue-500 bg-blue-500/5'} uppercase tracking-widest`}>
                        {log.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SYSTEM' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="font-ops text-xl text-slate-100 uppercase tracking-tighter">Satellite Parameters</h3>
                <div className="bg-slate-950 p-6 rounded-2xl border-4 border-slate-800 space-y-6">
                  {/* Invitation Section */}
                  <div className="p-4 bg-slate-900 border-2 border-slate-800 rounded-xl space-y-3">
                    <div className="text-[10px] font-mono-bold text-green-500 uppercase tracking-[0.2em]">Recruitment Link</div>
                    <p className="text-[10px] text-slate-500 font-mono-bold leading-relaxed uppercase">Generate a unique uplink URL to share with other operatives. Opening this link will automatically sync their device.</p>
                    <button 
                      onClick={handleCopyInviteLink}
                      className="w-full bg-slate-800 hover:bg-green-600/20 text-green-500 border border-green-500/30 py-4 rounded-xl font-ops text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>🔗</span>
                      {linkCopied ? 'UPLINK COPIED TO CLIPBOARD!' : 'GENERATE INVITE LINK'}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900 border-2 border-slate-800 rounded-xl">
                    <div className="text-[10px] font-mono-bold text-blue-500 uppercase tracking-[0.2em] mb-3">Tactical Vault Code</div>
                    <input type="text" placeholder="FAMILY CODE..." value={cloudInput.familyCode} onChange={e => setCloudInput({ ...cloudInput, familyCode: e.target.value.toUpperCase() })} className="w-full bg-slate-950 p-4 rounded-xl border-2 border-slate-800 font-ops text-2xl tracking-widest text-white outline-none focus:border-blue-500 uppercase text-center" />
                  </div>
                  
                  <button onClick={handleSatelliteUplink} disabled={isCloudLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-xl font-ops text-lg uppercase tracking-widest border-b-4 border-blue-800 active:translate-y-1 shadow-xl">
                    {isCloudLoading ? 'ESTABLISHING LINK...' : 'SYNC SATELLITE'}
                  </button>
                  
                  <div className="pt-4 space-y-2">
                    <button 
                      onClick={(e) => { e.preventDefault(); onLogout(); }} 
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-ops text-xs uppercase tracking-widest border-b-4 border-slate-950 active:translate-y-1 transition-all"
                    >
                      Sever Satellite Link
                    </button>
                    <button onClick={() => setShowAdvancedCloud(!showAdvancedCloud)} className="w-full text-[10px] font-mono-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest">Toggle Advanced Uplink</button>
                    {showAdvancedCloud && (
                      <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                        <div>
                          <label className="text-[8px] font-mono-bold text-slate-500 uppercase">Uplink Host</label>
                          <input type="text" value={cloudInput.supabaseUrl} onChange={e => setCloudInput({ ...cloudInput, supabaseUrl: e.target.value })} className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono-bold text-[10px] outline-none" />
                        </div>
                        <div>
                          <label className="text-[8px] font-mono-bold text-slate-500 uppercase">Uplink Cipher</label>
                          <input type="password" value={cloudInput.supabaseKey} onChange={e => setCloudInput({ ...cloudInput, supabaseKey: e.target.value })} className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono-bold text-[10px] outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                  {importStatus && <div className={`p-4 text-xs font-mono-bold uppercase tracking-widest text-center rounded-xl border ${importStatus.error ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-green-900/20 border-green-500 text-green-500'}`}>{importStatus.msg}</div>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-ops text-xl text-slate-100 uppercase tracking-tighter">Security Protocols</h3>
                <div className="bg-slate-950 p-6 rounded-2xl border-4 border-slate-800 space-y-4">
                  <div className="p-4 bg-slate-900 border-2 border-slate-800 rounded-xl space-y-4">
                    <div className="text-[10px] font-mono-bold text-amber-500 uppercase tracking-[0.2em]">Admin Override Code</div>
                    <input type="password" maxLength={4} placeholder="PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 p-4 rounded-xl border-2 border-slate-800 font-ops text-2xl tracking-[0.5em] text-white outline-none focus:border-amber-500 text-center" />
                    <button onClick={handleUpdatePin} className="w-full bg-amber-600 hover:bg-amber-500 text-white px-6 py-4 rounded-xl font-ops uppercase border-b-4 border-amber-800 active:translate-y-1 shadow-lg transition-all">Update PIN Code</button>
                    {pinStatus && <div className="mt-1 text-[10px] font-mono-bold text-amber-400 uppercase text-center">{pinStatus}</div>}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-900">
                    <button onClick={handleResetData} className="w-full bg-red-900/20 border-2 border-red-500/30 text-red-500 hover:bg-red-900/40 py-5 rounded-xl font-ops uppercase tracking-widest transition-all">Emergency Wipe</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentView;
