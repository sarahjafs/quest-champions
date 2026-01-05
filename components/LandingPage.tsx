
import React, { useState, useEffect } from 'react';
import { generateFamilyCode } from '../services/supabaseService';

interface LandingPageProps {
  onJoin: (code: string) => void;
  onCreate: (code: string, pin: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onJoin, onCreate }) => {
  const [mode, setMode] = useState<'INITIAL' | 'JOIN' | 'CREATE_PIN'>('INITIAL');
  const [joinCode, setJoinCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [tempCode] = useState(() => generateFamilyCode());

  // Enter key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (mode === 'INITIAL') {
          setMode('CREATE_PIN');
        } else if (mode === 'JOIN' && joinCode) {
          onJoin(joinCode);
        } else if (mode === 'CREATE_PIN' && newPin.length === 4) {
          onCreate(tempCode, newPin);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, joinCode, newPin, tempCode, onJoin, onCreate]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="mb-12">
        <div className="inline-block bg-slate-900 p-4 rounded-2xl border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)] mb-6">
          <h1 className="font-ops text-5xl text-white uppercase tracking-tighter">Quest Champions</h1>
          <div className="h-1 bg-green-500 mt-2 w-full shadow-[0_0_10px_#22c55e]" />
          <p className="font-mono-bold text-[10px] text-green-500 mt-2 uppercase tracking-[0.4em]">Multi-Family Task Interface</p>
        </div>
      </div>

      {mode === 'INITIAL' && (
        <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
          <button 
            onClick={() => setMode('CREATE_PIN')}
            className="group relative bg-green-600 hover:bg-green-500 p-6 rounded-xl border-b-8 border-green-800 transition-all active:translate-y-2 active:border-b-0 shadow-2xl"
          >
            <div className="font-ops text-2xl text-white uppercase tracking-widest mb-1">Establish Command</div>
            <div className="text-[10px] font-mono-bold text-green-100 uppercase tracking-widest opacity-80">Create New Family Vault</div>
            <div className="absolute bottom-2 right-4 text-[8px] font-mono-bold text-white/40 uppercase">Press [Enter] to Start</div>
          </button>

          <button 
            onClick={() => setMode('JOIN')}
            className="group relative bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border-b-8 border-slate-950 transition-all active:translate-y-2 active:border-b-0 shadow-2xl"
          >
            <div className="font-ops text-2xl text-white uppercase tracking-widest mb-1">Join Operation</div>
            <div className="text-[10px] font-mono-bold text-slate-400 uppercase tracking-widest opacity-80">Sync Existing Device</div>
          </button>
        </div>
      )}

      {mode === 'JOIN' && (
        <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-8 rounded-2xl border-2 border-slate-800 shadow-2xl">
            <h2 className="font-ops text-xl text-white uppercase mb-4 tracking-widest">Enter Family Code</h2>
            <input 
              type="text" 
              placeholder="E.G. ALPHA-42"
              value={joinCode}
              autoFocus
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 p-4 rounded-xl border-2 border-slate-800 font-ops text-2xl text-center text-white outline-none focus:border-blue-500 uppercase mb-6 tracking-widest"
            />
            <div className="flex gap-3">
              <button onClick={() => setMode('INITIAL')} className="flex-1 py-4 font-ops text-xs text-slate-500 uppercase tracking-widest">Cancel</button>
              <button 
                onClick={() => onJoin(joinCode)}
                disabled={!joinCode}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 p-4 rounded-xl border-b-4 border-blue-800 text-white font-ops uppercase tracking-widest disabled:opacity-50"
              >
                Sync Link
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'CREATE_PIN' && (
        <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-8 rounded-2xl border-2 border-slate-800 shadow-2xl">
            <h2 className="font-ops text-xl text-white uppercase mb-1 tracking-widest">Command Setup</h2>
            <p className="font-mono-bold text-[10px] text-slate-500 mb-6 uppercase tracking-widest">Generating ID: {tempCode}</p>
            
            <div className="space-y-4 mb-8">
              <label className="block text-[10px] font-mono-bold text-green-500 uppercase tracking-widest">Set Parent Override Code</label>
              <input 
                type="password" 
                maxLength={4}
                placeholder="4-DIGIT PIN"
                value={newPin}
                autoFocus
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-950 p-4 rounded-xl border-2 border-slate-800 font-ops text-3xl text-center text-white outline-none focus:border-green-500 tracking-[0.5em]"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setMode('INITIAL')} className="flex-1 py-4 font-ops text-xs text-slate-500 uppercase tracking-widest">Back</button>
              <button 
                onClick={() => onCreate(tempCode, newPin)}
                disabled={newPin.length !== 4}
                className="flex-[2] bg-green-600 hover:bg-green-500 p-4 rounded-xl border-b-4 border-green-800 text-white font-ops uppercase tracking-widest disabled:opacity-50"
              >
                Establish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 text-slate-700 font-mono-bold text-[9px] uppercase tracking-[0.3em]">
        Encrypted via Supabase Satellite Uplink v3.1
      </div>
    </div>
  );
};

export default LandingPage;
