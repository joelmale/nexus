/**
 * Dice Sound Effects Utility
 * Generates procedural sound effects for dice rolling
 */

class DiceSoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      // Lazy initialization to avoid autoplay issues
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play dice rolling sound - combination of rattling and tumbling
   */
  playRollSound(diceCount: number = 1): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Create multiple layers for a rich rolling sound
      this.playRattleLayer(ctx, now, diceCount);
      this.playTumbleLayer(ctx, now, diceCount);
      this.playImpactSound(ctx, now + 1.5); // Impact at the end
    } catch (error) {
      console.warn('Failed to play dice sound:', error);
    }
  }

  /**
   * Play critical success sound - triumphant chime
   */
  playCritSuccessSound(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Play a triumphant ascending arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        this.playTone(ctx, freq, now + i * 0.1, 0.3, 'sine');
      });

      // Add sparkle effect
      for (let i = 0; i < 5; i++) {
        const freq = 1000 + Math.random() * 1000;
        this.playTone(ctx, freq, now + 0.3 + i * 0.05, 0.1, 'sine');
      }
    } catch (error) {
      console.warn('Failed to play crit success sound:', error);
    }
  }

  /**
   * Play critical failure sound - sad descending tones
   */
  playCritFailureSound(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Play a sad descending progression
      const notes = [392.00, 329.63, 293.66, 246.94]; // G4, E4, D4, B3
      notes.forEach((freq, i) => {
        this.playTone(ctx, freq, now + i * 0.15, 0.4, 'triangle');
      });

      // Add a dull thud at the end
      this.playNoise(ctx, now + 0.6, 0.2, 100);
    } catch (error) {
      console.warn('Failed to play crit failure sound:', error);
    }
  }

  /**
   * Create rattling sound layer
   */
  private playRattleLayer(ctx: AudioContext, startTime: number, diceCount: number): void {
    const duration = 1.5;
    const rattles = Math.min(diceCount * 8, 30);

    for (let i = 0; i < rattles; i++) {
      const time = startTime + (i / rattles) * duration;
      const freq = 80 + Math.random() * 120;
      const volume = 0.05 + Math.random() * 0.05;

      this.playNoise(ctx, time, 0.02, freq, volume);
    }
  }

  /**
   * Create tumbling sound layer
   */
  private playTumbleLayer(ctx: AudioContext, startTime: number, diceCount: number): void {
    const tumbles = Math.min(diceCount * 4, 12);

    for (let i = 0; i < tumbles; i++) {
      const time = startTime + (i / tumbles) * 1.5;
      const freq = 150 + Math.random() * 100;
      const volume = 0.08 + Math.random() * 0.04;

      this.playTone(ctx, freq, time, 0.05, 'triangle', volume);
    }
  }

  /**
   * Play impact/landing sound
   */
  private playImpactSound(ctx: AudioContext, time: number): void {
    // Low frequency thud
    this.playTone(ctx, 60, time, 0.2, 'sine', 0.2);
    // Higher frequency click
    this.playNoise(ctx, time, 0.05, 200, 0.15);
    // Resonance
    this.playTone(ctx, 120, time + 0.02, 0.15, 'triangle', 0.1);
  }

  /**
   * Play a simple tone
   */
  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.1
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  /**
   * Play white noise (for impacts and rattles)
   */
  private playNoise(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number = 1000,
    volume: number = 0.1
  ): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    // Envelope
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    noise.start(startTime);
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Get mute state
   */
  isSoundMuted(): boolean {
    return this.isMuted;
  }
}

// Export singleton instance
export const diceSounds = new DiceSoundManager();
