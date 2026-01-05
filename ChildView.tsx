
import React, { useState } from 'react';
import { Child, Chore, Reward } from '../types';
import { getXpForNextLevel, AVATARS } from '../constants';

interface ChildViewProps {
  child: Child;
  chores: Chore[];
  rewards: Reward[];
  onCompleteChore: (id: string) => void;
  onClaimReward: (id: string, childId: string) => void;
  onUpdateProfile: (updates: Partial<Child>) => void;
}

const ChildView: React.FC<ChildViewProps> = ({ child, chores, rewards, onCompleteChore, onClaimReward, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'QUESTS' | 'SHOP'>('QUESTS');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(child.name);
  const [tempAvatar, setTempAvatar] = useState(child.avatar);
  const [congratsReward, setCongratsReward] = useState<Reward | null>(null);

  const xpRequired = getXpForNextLevel(child.level);
  const xpInLevel = child.xp - (child.level === 1 ? 0 : getXpForNextLevel(child.level - 1));
  const xpTotalInLevel = xpRequired - (child.level === 1 ? 0 : getXpForNextLevel(child.level - 1));
  const progressPercent = Math.min(100, (xpInLevel / xpTotalInLevel) * 100);

  const handleSaveProfile = () => {
    onUpdateProfile({ name: tempName, avatar: tempAvatar });
    setIsEditingProfile(false);
  };

  const handleClaim = (reward: Reward) => {
    if (child.coins >= reward.cost) {
      onClaimReward(reward.id, child.id);
      setCongratsReward(reward);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Congrats Modal */}
      {congratsReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border-4 border-green-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.4)] animate-in zoom-in-95 duration-200">
            <div className="text-8xl mb-6 drop-shadow-2xl">{congratsReward.icon}</div>
            <h3 className="font-ops text-3xl text-white uppercase mb-2 tracking-tighter">Mission Success!</h3>
            <p className="font-mono-bold text-xs text-green-500 mb-6 uppercase tracking-widest leading-relaxed">
              Asset "{congratsReward.title}" has been authorized for use. Well done, operative!
            </p>
            <button 
              onClick={() => setCongratsReward(null)}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-ops uppercase tracking-widest border-b-4 border-green-800 active:translate-y-1 shadow-lg"
            >
              Continue Ops
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-4 border-slate-700">
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 text-white flex flex-col md:flex-row items-center gap-6 relative">
          
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="absolute top-4 right-4 bg-slate-700 hover:bg-slate-600 p-2 rounded-lg border border-slate-600 transition-colors z-10 shadow-lg"
            title="Edit Operative Profile"
          >
            <span className="text-xl">⚙️</span>
          </button>

          <div className="text-8xl bg-slate-800 p-4 rounded-xl border-4 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">{child.avatar}</div>
          
          <div className="flex-1 text-center md:text-left">
            {isEditingProfile ? (
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Update Callsign</label>
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded p-2 font-black uppercase tracking-tighter text-slate-100 outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Update Appearance</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map(a => (
                      <button 
                        key={a}
                        onClick={() => setTempAvatar(a)}
                        className={`text-2xl p-2 rounded-lg border-2 transition ${tempAvatar === a ? 'bg-green-600 border-green-400' : 'bg-slate-800 border-slate-700'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveProfile}
                    className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded font-black uppercase text-xs tracking-widest"
                  >
                    CONFIRM UPDATES
                  </button>
                  <button 
                    onClick={() => { setIsEditingProfile(false); setTempName(child.name); setTempAvatar(child.avatar); }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded font-black uppercase text-xs tracking-widest"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <h2 className="text-4xl font-black mb-1 font-kids uppercase tracking-tighter">{child.name}</h2>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  <span className="bg-green-600 text-white px-4 py-1 rounded-md font-black text-lg uppercase skew-x-[-10deg]">Rank {child.level}</span>
                  <span className="bg-slate-700 text-white px-4 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-600 shadow-inner">
                    <span className="text-yellow-400">💎</span> {child.coins.toLocaleString()} Credits
                  </span>
                </div>
              </>
            )}
            
            <div className="w-full bg-slate-950 h-6 rounded-sm border-2 border-slate-700 overflow-hidden relative">
              <div 
                className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(34,197,94,0.6)]" 
                style={{ width: `${progressPercent}%` }} 
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
                XP INTEL: {child.xp} / {xpRequired}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('QUESTS')}
          className={`flex-1 py-4 rounded-lg font-black text-xl transition-all uppercase tracking-widest border-b-4 ${activeTab === 'QUESTS' ? 'bg-green-600 text-white border-green-800 shadow-lg shadow-green-900/40 -translate-y-1' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
        >
          Missions
        </button>
        <button 
          onClick={() => setActiveTab('SHOP')}
          className={`flex-1 py-4 rounded-lg font-black text-xl transition-all uppercase tracking-widest border-b-4 ${activeTab === 'SHOP' ? 'bg-amber-600 text-white border-amber-800 shadow-lg shadow-amber-900/40 -translate-y-1' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
        >
          Armory
        </button>
      </div>

      {activeTab === 'QUESTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chores.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-slate-800/50 rounded-2xl border-4 border-dashed border-slate-700">
              <p className="text-slate-500 font-black text-xl uppercase tracking-widest">Awaiting HQ Briefing...</p>
            </div>
          ) : (
            chores.map(chore => {
              const isToday = chore.lastCompleted && new Date(chore.lastCompleted).toDateString() === new Date().toDateString();
              const isPending = !!chore.pendingApproval;

              return (
                <div key={chore.id} className={`bg-slate-800 p-6 rounded-xl shadow-md border-r-8 transition-all flex items-center gap-4 ${isToday ? 'border-green-500 opacity-50 grayscale' : isPending ? 'border-amber-500 bg-slate-800/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-600 hover:border-green-500 hover:scale-[1.02] active:scale-95'}`}>
                  <div className="text-5xl bg-slate-900 p-4 rounded-lg border border-slate-700">{chore.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">{chore.title}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-2 line-clamp-2">{chore.description}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded border border-amber-900/50 font-black">+{chore.coins} CR</span>
                      <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-900/50 font-black">+{chore.xp} XP</span>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-black uppercase tracking-tighter">{chore.frequency}</span>
                    </div>
                  </div>
                  {isToday ? (
                    <div className="bg-green-600/20 text-green-500 p-2 rounded-lg border border-green-500/30">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  ) : isPending ? (
                    <button 
                      onClick={() => onCompleteChore(chore.id)}
                      className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 px-3 py-2 rounded-lg border border-amber-500/30 text-center transition-all active:scale-95"
                    >
                      <div className="text-[10px] font-black uppercase leading-tight">Review<br/>Pending</div>
                      <div className="text-[8px] font-bold uppercase mt-1 opacity-60">Retract?</div>
                    </button>
                  ) : (
                    <button 
                      onClick={() => onCompleteChore(chore.id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-5 py-4 rounded-lg shadow-lg font-black uppercase tracking-widest transition-all active:translate-y-1 active:shadow-none border-b-4 border-green-800"
                    >
                      EXECUTE
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map(reward => (
            <div key={reward.id} className={`bg-slate-800 p-6 rounded-xl shadow-md border-r-8 border-amber-600 flex items-center gap-4 transition-all ${child.coins < reward.cost ? 'opacity-60 grayscale scale-95' : 'hover:scale-[1.02]'}`}>
               <div className="text-5xl bg-slate-900 p-4 rounded-lg border border-slate-700">{reward.icon}</div>
               <div className="flex-1">
                 <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">{reward.title}</h3>
                 <p className="text-slate-400 text-xs font-bold uppercase mb-2 line-clamp-2">{reward.description}</p>
                 <div className="flex items-center gap-1 font-black text-amber-500 text-sm">
                    <span className="text-lg">💎</span> {reward.cost.toLocaleString()} CREDITS
                 </div>
               </div>
               <button 
                onClick={() => handleClaim(reward)}
                disabled={child.coins < reward.cost}
                className={`px-6 py-3 rounded-lg font-black shadow-lg transition-all uppercase tracking-widest border-b-4 ${child.coins >= reward.cost ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-700 active:translate-y-1 active:shadow-none' : 'bg-slate-700 text-slate-500 border-slate-800 cursor-not-allowed'}`}
               >
                 ACQUIRE
               </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildView;
