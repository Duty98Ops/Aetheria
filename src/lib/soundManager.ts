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
    if (this.bgm) {
      this.bgm.volume = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
    }
  }

  /**
   * Plays background music with smooth transition
   */
  playBGM(url: string) {
    // Prevent re-playing the same BGM
    if (this.bgm && this.bgm.src.includes(url)) {
        if (this.bgm.paused) this.bgm.play().catch(() => {});
        return;
    }

    const startNewBGM = () => {
        this.bgm = new Audio(url);
        this.bgm.loop = true;
        this.bgm.volume = 0; // Start for fade in
        this.bgm.play().then(() => {
            this.fadeIn(this.bgm!, this.isMuted ? 0 : this.masterVolume * this.musicVolume);
        }).catch(e => {
            console.log("Audio play blocked: awaiting user interaction.");
        });
    };

    if (this.bgm) {
        this.fadeOut(this.bgm, () => {
            this.bgm?.pause();
            startNewBGM();
        });
    } else {
        startNewBGM();
    }
  }

  private fadeIn(audio: HTMLAudioElement, targetVolume: number) {
      let v = 0;
      const step = 0.05;
      const interval = setInterval(() => {
          v += step;
          if (v >= targetVolume) {
              audio.volume = targetVolume;
              clearInterval(interval);
          } else {
              audio.volume = v;
          }
      }, 30);
  }

  private fadeOut(audio: HTMLAudioElement, callback: () => void) {
      let v = audio.volume;
      const step = 0.05;
      const interval = setInterval(() => {
          v -= step;
          if (v <= 0) {
              audio.volume = 0;
              clearInterval(interval);
              callback();
          } else {
              audio.volume = v;
          }
      }, 50);
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
        // Reuse the oldest one if pool is full and everything is playing
        sfx = pool[0];
        sfx.pause();
        sfx.currentTime = 0;
      }
    } else {
        sfx.currentTime = 0;
    }

    sfx.volume = this.masterVolume * this.sfxVolume;
    sfx.play().catch(e => {
        // Silently fail if blocked
    });
  }

  /**
   * Resumes audio after user interaction
   */
  resume() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
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
