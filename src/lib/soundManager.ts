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
    // Audio disabled as requested
  }

  private fadeIn(audio: HTMLAudioElement, targetVolume: number) {
  }

  private fadeOut(audio: HTMLAudioElement, callback: () => void) {
      callback();
  }

  /**
   * Plays SFX using pooling to prevent lag
   */
  playSFX(url: string) {
    // Audio disabled as requested
  }

  /**
   * Resumes audio after user interaction. 
   */
  resume() {
    // Audio disabled as requested
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
