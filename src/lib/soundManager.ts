/**
 * SoundManager for Aetheria: Fallen Ascent
 * Handles Epic Dark-Fantasy audio with BGM looping and SFX pooling.
 */

class SoundManager {
  private static instance: SoundManager;
  private masterVolume: number = 0.5;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.5;
  private isMuted: boolean = false;
  private bgm: HTMLAudioElement | null = null;
  private sfxPool: Map<string, HTMLAudioElement[]> = new Map();
  private poolSize: number = 5;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('aetheria_sound_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 0.5;
        this.musicVolume = settings.musicVolume ?? 0.5;
        this.sfxVolume = settings.sfxVolume ?? 0.5;
        this.isMuted = settings.isMuted ?? false;
      }
    } catch (e) {
      console.warn("Failed to load sound settings", e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('aetheria_sound_settings', JSON.stringify({
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        isMuted: this.isMuted,
      }));
    } catch (e) {
      console.warn("Failed to save sound settings", e);
    }
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    this.updateVolumes();
    this.saveSettings();
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    this.updateVolumes();
    this.saveSettings();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    this.updateVolumes();
    this.saveSettings();
  }

  setMuted(m: boolean) {
    this.isMuted = m;
    this.updateVolumes();
    this.saveSettings();
  }

  private updateVolumes() {
    const targetMusicVolume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
    if (this.bgm) {
      if (this.bgm.volume !== targetMusicVolume) {
        this.bgm.volume = targetMusicVolume;
      }
    }
  }

  /**
   * Plays background music with smooth transition
   */
  playBGM(url: string) {
    if (!url) return;
    
    // Prevent re-playing the same BGM
    // We check endsWith or includes but carefully
    if (this.bgm && (this.bgm.src === url || this.bgm.src.endsWith(url))) {
        if (this.bgm.paused) {
          this.bgm.play().catch(() => {
            console.warn("BGM play failed - interaction required");
          });
        }
        return;
    }

    const startNewBGM = () => {
        this.bgm = new Audio();
        this.bgm.src = url;
        this.bgm.loop = true;
        this.bgm.volume = 0;
        
        const playPromise = this.bgm.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
              this.fadeIn(this.bgm!, this.isMuted ? 0 : this.masterVolume * this.musicVolume);
          }).catch(e => {
              console.warn("Audio play blocked: awaiting user interaction.", e);
          });
        }
    };

    if (this.bgm) {
        this.fadeOut(this.bgm, () => {
            this.bgm?.pause();
            this.bgm = null; // Clear old BGM
            startNewBGM();
        });
    } else {
        startNewBGM();
    }
  }

  private fadeIn(audio: HTMLAudioElement, targetVolume: number) {
      if (audio.paused) return; // Don't fade in if not playing
      let v = 0;
      const step = 0.05;
      const interval = setInterval(() => {
          v += step;
          if (v >= targetVolume || audio.paused) {
              audio.volume = targetVolume;
              clearInterval(interval);
          } else {
              audio.volume = v;
          }
      }, 30);
  }

  private fadeOut(audio: HTMLAudioElement, callback: () => void) {
      let v = audio.volume;
      const step = 0.1;
      const interval = setInterval(() => {
          v -= step;
          if (v <= 0) {
              audio.volume = 0;
              clearInterval(interval);
              callback();
          } else {
              audio.volume = v;
          }
      }, 30);
  }

  /**
   * Plays SFX using pooling to prevent lag
   */
  playSFX(url: string) {
    if (this.isMuted || this.masterVolume <= 0 || this.sfxVolume <= 0) return;

    let pool = this.sfxPool.get(url);
    if (!pool) {
      pool = [];
      this.sfxPool.set(url, pool);
    }

    let sfx = pool.find(a => a.paused || a.ended);
    if (!sfx) {
      if (pool.length < this.poolSize) {
        sfx = new Audio(url);
        pool.push(sfx);
      } else {
        sfx = pool[0];
        sfx.pause();
        sfx.currentTime = 0;
      }
    } else {
        sfx.currentTime = 0;
    }

    sfx.volume = this.masterVolume * this.sfxVolume;
    const playPromise = sfx.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
          // Silently fail
      });
    }
  }

  /**
   * Resumes audio after user interaction. 
   * Crucial for solving "Autoplay" blocks.
   */
  resume() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
    // Also try to prime SFX by playing a silent or very short sound if needed?
    // Usually one successful play opens the gate for all.
  }

  getSettings() {
    return {
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      isMuted: this.isMuted
    };
  }
}

export const soundManager = SoundManager.getInstance();
