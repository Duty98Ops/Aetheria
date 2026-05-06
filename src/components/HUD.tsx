/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Zap, Sword, Shield, Sparkles, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Swords } from 'lucide-react';
import { Theme } from '../types';
import { soundManager } from '../lib/soundManager';
import { ASSETS } from '../constants';

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  weapon: 'SWORD' | 'PISTOL';
  theme: Theme;
  enemiesDefeated: number;
  totalEnemies: number;
  portalOpen: boolean;
  bossMessage: string | null;
  escapeActive: boolean;
  escapeTimer: number;
  onPause: () => void;
  isMobile: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  onWeaponToggle: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  score,
  weapon,
  theme,
  enemiesDefeated,
  totalEnemies,
  portalOpen,
  bossMessage,
  escapeActive,
  escapeTimer,
  onPause,
  difficulty,
  onWeaponToggle
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-1.5 sm:p-6 flex flex-col z-40 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full gap-1 sm:gap-4 flex-nowrap">
        {/* Left Side: Stats & Weapon */}
        <div className="flex flex-col gap-1.5 sm:gap-4 shrink-0 overflow-hidden">
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-1 sm:p-3 sm:px-4 rounded-lg sm:rounded-2xl flex items-center gap-1.5 sm:gap-6 shadow-2xl">
            {/* Health */}
            <div className="flex flex-col gap-0.5 min-w-[65px] xs:min-w-[100px] sm:min-w-[120px]">
              <div className="flex items-center justify-between text-[6px] xs:text-[7px] font-black tracking-widest uppercase text-rose-500/80">
                <div className="flex items-center gap-1">
                  <Heart className="w-2 h-2 fill-rose-500" />
                  <span className="hidden xs:inline">Life Essence</span>
                  <span className="xs:hidden">LE</span>
                </div>
                <span className="text-white/60 text-[6px] xs:text-[8px]">{Math.ceil(health)}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                  animate={{ width: `${(health / maxHealth) * 100}%` }}
                />
              </div>
            </div>

            <div className="h-4 sm:h-6 w-[1px] bg-white/10" />

            {/* Score */}
            <div className="flex flex-col">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Zap className="w-2 h-2 text-sky-400 fill-sky-400/20" />
                <span className="text-[5px] xs:text-[7px] font-black tracking-widest uppercase text-sky-400/80 truncate max-w-[40px] xs:max-w-none">Souls</span>
              </div>
              <span className="text-[10px] xs:text-sm sm:text-xl font-mono text-white leading-none tracking-widest font-bold tabular-nums">
                {score.toString().padStart(6, '0')}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-1 sm:p-1.5 sm:px-3 rounded-full flex items-center gap-1 sm:gap-3 shadow-lg self-start">
             <motion.div
               key={weapon}
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: 'spring', damping: 12 }}
             >
                <Sword className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/40" />
             </motion.div>
             <motion.span 
               key={`text-${weapon}`}
               initial={{ x: -10, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               className="text-[6px] sm:text-[8px] font-black text-white/80 uppercase tracking-tighter italic"
             >
               {weapon === 'SWORD' ? 'RUSTED CLAYMORE' : 'IRON ARBALEST'}
             </motion.span>
             <span className="hidden sm:inline text-[7px] text-white/20 font-bold uppercase tracking-widest bg-white/5 px-1.5 rounded">[Q/E]</span>
          </div>
        </div>

        {/* Center: Alerts */}
        <div className="hidden lg:flex flex-1 flex-col items-center pt-2">
          <AnimatePresence>
            {bossMessage && (
              <motion.div 
                key="boss-alert-msg"
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-sky-500/10 backdrop-blur-xl border border-sky-400/30 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(14,165,233,0.2)]"
              >
                <h2 className="text-sm sm:text-lg font-black text-white italic uppercase tracking-widest">{bossMessage}</h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Location */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[6px] sm:text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
              difficulty === 'EASY' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
              difficulty === 'HARD' ? 'text-rose-400 border-rose-400/30 bg-rose-400/10' :
              difficulty === 'NIGHTMARE' ? 'text-purple-400 border-purple-400/30 bg-purple-400/10 shadow-[0_0_10px_rgba(168,85,247,0.4)]' :
              'text-sky-400 border-sky-400/30 bg-sky-400/10'
            }`}>
              {difficulty}
            </span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-1.5 sm:p-3 sm:px-5 rounded-lg sm:rounded-2xl flex flex-col items-end shadow-lg min-w-[80px] xs:min-w-[120px] sm:min-w-[140px] max-w-[40vw] sm:max-w-none">
            <span className="text-[7px] text-sky-400 font-bold tracking-[0.4em] uppercase opacity-60 truncate w-full text-right">{theme.floor}</span>
            <p className="text-white text-[9px] xs:text-[12px] sm:text-base font-black italic tracking-tighter uppercase mb-0.5 sm:mb-2 leading-none truncate w-full text-right">{theme.name}</p>
            
            {!portalOpen ? (
              <div className="w-full flex items-center gap-2">
                 <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                     className="h-full bg-sky-500"
                     initial={{ width: 0 }}
                     animate={{ width: `${totalEnemies > 0 ? (enemiesDefeated / totalEnemies) * 100 : 100}%` }}
                    />
                 </div>
                 <span className="text-[7px] text-slate-500 font-black shrink-0">{enemiesDefeated}/{totalEnemies}</span>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-1 sm:gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-[7px] text-sky-300 font-black uppercase tracking-widest">Portal Active</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-center pb-4">
        {escapeActive && (
          <motion.div 
            animate={{ scale: [0.98, 1, 0.98] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="bg-black/90 border border-rose-500/40 p-4 px-10 rounded-2xl backdrop-blur-2xl shadow-2xl flex flex-col items-center"
          >
            <p className="text-rose-500 text-[8px] font-black tracking-[0.8em] uppercase mb-1 opacity-70">Extraction Window</p>
            <p className="text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_#f43f5e]">{escapeTimer.toFixed(1)}</p>
          </motion.div>
        )}
      </div>

      {/* Mobile Pause Button */}
      <button 
        onClick={() => {
          soundManager.resume();
          onPause();
        }}
        className="absolute top-4 right-4 p-4 bg-slate-950/60 border border-sky-400/30 rounded-full pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.2)] active:scale-90 transition-all flex items-center justify-center lg:hidden"
      >
        <Pause className="w-5 h-5 text-sky-400/80 fill-sky-400/20" />
      </button>
    </div>
  );
};

export const MobileControls: React.FC<{
  onStart: (btn: string) => void;
  onEnd: (btn: string) => void;
  weapon: string;
  onWeaponToggle: () => void;
}> = ({ onStart, onEnd, weapon, onWeaponToggle }) => {
  return (
    <div className="absolute inset-x-0 bottom-4 sm:bottom-10 z-50 pointer-events-none flex items-end justify-between px-2 sm:px-12 lg:hidden">
      {/* Left side: Movement & Crouch */}
      <div className="flex flex-col gap-2 items-center pointer-events-auto">
        <div className="flex gap-2">
          <button 
            onPointerDown={() => onStart('left')} 
            onPointerUp={() => onEnd('left')}
            onPointerLeave={() => onEnd('left')}
            className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 active:bg-slate-800 transition-all shadow-2xl"
          >
            <ChevronLeft className="w-8 h-8 text-white/90" />
          </button>
          <button 
            onPointerDown={() => onStart('right')} 
            onPointerUp={() => onEnd('right')}
            onPointerLeave={() => onEnd('right')}
            className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 active:bg-slate-800 transition-all shadow-2xl"
          >
            <ChevronRight className="w-8 h-8 text-white/90" />
          </button>
        </div>
        <button 
          onPointerDown={() => onStart('down')} 
          onPointerUp={() => onEnd('down')}
          onPointerLeave={() => onEnd('down')}
          className="w-14 h-12 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center active:scale-90 active:bg-slate-800 transition-all shadow-xl"
        >
          <ChevronDown className="w-6 h-6 text-white/70" />
        </button>
      </div>

      {/* Right side: Actions cluster */}
      <div className="flex flex-col gap-3 items-end pointer-events-auto">
        {/* Weapon Swap moved here */}
        <button 
          onClick={onWeaponToggle}
          className="w-11 h-11 bg-sky-500/10 backdrop-blur-2xl rounded-full border border-sky-400/30 flex flex-col items-center justify-center active:scale-75 shadow-lg transition-transform mb-1 mr-2"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="text-[5px] font-black text-sky-400 uppercase tracking-tighter">Swap</span>
        </button>

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-2">
            <button onPointerDown={() => onStart('magic')} onPointerUp={() => onEnd('magic')} onPointerLeave={() => onEnd('magic')} className="w-12 h-12 bg-purple-500/20 backdrop-blur-xl rounded-xl border border-purple-500/30 flex items-center justify-center active:scale-95"><Sparkles className="w-6 h-6 text-purple-400" /></button>
            <button onPointerDown={() => onStart('block')} onPointerUp={() => onEnd('block')} onPointerLeave={() => onEnd('block')} className="w-12 h-12 bg-sky-500/20 backdrop-blur-xl rounded-xl border border-sky-400/30 flex items-center justify-center active:scale-95"><Shield className="w-6 h-6 text-sky-400" /></button>
          </div>
          <div className="flex flex-col gap-3">
            <button onPointerDown={() => onStart('jump')} onPointerUp={() => onEnd('jump')} onPointerLeave={() => onEnd('jump')} className="w-16 h-16 sm:w-24 sm:h-24 bg-sky-500/20 backdrop-blur-xl rounded-full border-2 border-sky-400/40 flex items-center justify-center active:scale-95 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <ChevronUp className="w-10 h-10 text-sky-400" />
            </button>
            <button onPointerDown={() => onStart('attack')} onPointerUp={() => onEnd('attack')} onPointerLeave={() => onEnd('attack')} className="w-18 h-18 sm:w-28 sm:h-28 bg-rose-600/40 backdrop-blur-xl rounded-2xl border border-rose-500/50 flex items-center justify-center active:scale-95 shadow-2xl">
              {weapon === 'SWORD' ? <Swords className="w-10 h-10 text-white" /> : <Zap className="w-9 h-9 text-sky-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
