
import React, { useState, useEffect } from 'react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, correctPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Keyboard Support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, correctPin]);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  const handleKeypadClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-slate-900 border-4 border-slate-800 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/20" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <div className="bg-slate-950 p-3 border border-slate-700 rounded-sm">
              <span className="text-3xl">🔐</span>
            </div>
          </div>
          
          <h3 className="font-ops text-2xl text-white mb-1 uppercase tracking-widest">Security Override</h3>
          <p className="font-mono-bold text-[10px] text-slate-500 mb-8 uppercase tracking-[0.2em]">Level 4 Clearance Required</p>
          
          <div className={`flex justify-center gap-4 mb-10 ${error ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-12 h-16 rounded-sm border-2 transition-all flex items-center justify-center ${pin.length > i ? 'bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-slate-950 border-slate-800'}`}
              >
                {pin.length > i ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ) : (
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleKeypadClick(num)}
                className="h-14 bg-slate-800 border-b-4 border-slate-950 font-ops text-xl text-slate-300 hover:bg-slate-700 hover:text-white hover:border-green-600 active:translate-y-1 active:border-b-0 transition-all rounded-sm uppercase"
              >
                {num}
              </button>
            ))}
            <button 
              onClick={onClose}
              className="h-14 flex items-center justify-center bg-slate-950/50 text-slate-600 hover:text-red-500 transition-colors"
            >
              <span className="font-ops text-xs tracking-tighter uppercase">Abort</span>
            </button>
            <button
              onClick={() => handleKeypadClick('0')}
              className="h-14 bg-slate-800 border-b-4 border-slate-950 font-ops text-xl text-slate-300 hover:bg-slate-700 hover:text-white hover:border-green-600 active:translate-y-1 active:border-b-0 transition-all rounded-sm uppercase"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 bg-slate-900 border-b-4 border-slate-950 text-slate-500 hover:text-amber-500 transition-all flex items-center justify-center rounded-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path></svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PinModal;
