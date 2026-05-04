/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Zap, Sword, Shield, Wind, Sparkles, Pause, RotateCcw } from 'lucide-react';
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
  onWeaponToggle
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-2 sm:p-6 flex flex-col z-40 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full gap-2 sm:gap-4 flex-nowrap">
        {/* Left Side: Stats & Weapon */}
        <div className="flex flex-col gap-3 sm:gap-4 shrink-0">
          <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 sm:p-3 sm:px-4 rounded-xl sm:rounded-2xl flex items-center gap-4 sm:gap-6 shadow-2xl">
            {/* Health */}
            <div className="flex flex-col gap-1 min-w-[90px] xs:min-w-[100px] sm:min-w-[120px]">
              <div className="flex items-center justify-between text-[7px] font-black tracking-widest uppercase text-rose-500/80">
                <div className="flex items-center gap-1">
                  <Heart className="w-2 h-2 fill-rose-500" />
                  <span className="hidden xs:inline">Life Essence</span>
                  <span className="xs:hidden">LE</span>
                </div>
                <span className="text-white/60">{Math.ceil(health)}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                  animate={{ width: `${(health / maxHealth) * 100}%` }}
                />
              </div>
            </div>

            <div className="h-5 sm:h-6 w-[1px] bg-white/10" />

            {/* Score */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Zap className="w-2 h-2 text-sky-400 fill-sky-400/20" />
                <span className="text-[7px] font-black tracking-widest uppercase text-sky-400/80">Forgotten Souls</span>
              </div>
              <span className="text-sm sm:text-xl font-mono text-white leading-none tracking-widest font-bold tabular-nums">
                {score.toString().padStart(6, '0')}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-1.5 sm:p-1.5 sm:px-3 rounded-full flex items-center gap-2 sm:gap-3 shadow-lg self-start">
             <Sword className="w-3 h-3 text-white/40" />
             <span className="text-[8px] font-black text-white/80 uppercase tracking-tighter italic">{weapon === 'SWORD' ? 'RUSTED CLAYMORE' : 'IRON ARBALEST'}</span>
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 sm:p-3 sm:px-5 rounded-lg sm:rounded-2xl flex flex-col items-end shadow-lg min-w-[100px] xs:min-w-[120px] sm:min-w-[140px] max-w-[45vw] sm:max-w-none">
            <span className="text-[7px] text-sky-400 font-bold tracking-[0.4em] uppercase opacity-60 truncate w-full text-right">{theme.floor}</span>
            <p className="text-white text-[11px] xs:text-[12px] sm:text-base font-black italic tracking-tighter uppercase mb-1 sm:mb-2 leading-none truncate w-full text-right">{theme.name}</p>
            
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
        className="absolute top-4 right-4 p-4 bg-slate-950/60 border border-sky-400/30 rounded-full pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.2)] active:scale-90 transition-all flex items-center justify-center sm:hidden"
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
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-end p-2 pb-6 sm:hidden">
      <div className="flex justify-between items-end w-full pointer-events-auto">
        {/* Movement */}
        <div className="flex gap-2">
          <button onPointerDown={() => onStart('left')} onPointerUp={() => onEnd('left')} className="w-14 h-14 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/5 flex items-center justify-center shadow-xl"><Wind className="w-8 h-8 text-white/80 rotate-180" /></button>
          <button onPointerDown={() => onStart('right')} onPointerUp={() => onEnd('right')} className="w-14 h-14 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/5 flex items-center justify-center shadow-xl"><Wind className="w-8 h-8 text-white/80" /></button>
        </div>

        {/* weapon swap */}
        <div className="absolute right-4 bottom-44 pointer-events-auto">
          <button onClick={onWeaponToggle} className="w-12 h-12 bg-sky-600/20 backdrop-blur-xl rounded-full border border-sky-400/30 flex flex-col items-center justify-center"><RotateCcw className="w-4 h-4 text-sky-400 mb-0.5" /><span className="text-[6px] font-black text-sky-400 uppercase tracking-tighter">Swap</span></button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 items-end">
          <button onPointerDown={() => onStart('jump')} onPointerUp={() => onEnd('jump')} className="w-18 h-18 bg-sky-500/10 backdrop-blur-xl rounded-full border-2 border-sky-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.2)]"><div className="w-6 h-6 border-2 border-sky-400/60 rounded-sm rotate-45" /></button>
          <div className="flex gap-2">
            <button onPointerDown={() => onStart('magic')} onPointerUp={() => onEnd('magic')} className="w-14 h-14 bg-purple-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/40 flex items-center justify-center"><Sparkles className="w-6 h-6 text-purple-400" /></button>
            <button onPointerDown={() => onStart('block')} onPointerUp={() => onEnd('block')} className="w-14 h-14 bg-sky-500/10 backdrop-blur-xl rounded-2xl border border-sky-500/40 flex items-center justify-center"><Shield className="w-6 h-6 text-sky-400" /></button>
            <button onPointerDown={() => onStart('attack')} onPointerUp={() => onEnd('attack')} className="w-18 h-18 bg-rose-600/30 backdrop-blur-xl rounded-3xl border border-rose-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.2)]">{weapon === 'SWORD' ? <Sword className="w-8 h-8 text-white/90" /> : <Zap className="w-7 h-7 text-sky-400" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
