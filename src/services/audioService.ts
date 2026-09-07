// Web Audio API helper for DTMF, tones, and audio stream visualization

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  'A': [697, 1633],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  'B': [770, 1633],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  'C': [852, 1633],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
  'D': [941, 1633],
};

class AudioService {
  private ctx: AudioContext | null = null;
  private ringbackOsc: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackInterval: any = null;
  private ringtoneInterval: any = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playDTMF(key: string, durationMs = 180): void {
    try {
      const freqs = DTMF_FREQUENCIES[key.toUpperCase()];
      if (!freqs) return;

      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      osc1.type = 'sine';
      osc2.type = 'sine';

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + durationMs / 1000);
      osc2.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  startDialtone(): void {
    try {
      this.stopTones();
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 350;
      osc2.frequency.value = 440;
      gain.gain.value = 0.05;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ringbackOsc = osc1;
      this.ringbackGain = gain;
    } catch {
      // ignore
    }
  }

  startRingback(): void {
    try {
      this.stopTones();
      const ctx = this.getContext();

      const pulse = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 425; // Standard European PBX tone
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.0);
      };

      pulse();
      this.ringbackInterval = setInterval(pulse, 4000);
    } catch {
      // ignore
    }
  }

  startIncomingRingtone(): void {
    try {
      this.stopTones();
      const ctx = this.getContext();

      const ringPulse = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        // Ring sound sequence (two brief trills)
        const playTrill = (delay: number) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(ctx.currentTime + delay);
          osc2.start(ctx.currentTime + delay);
          osc1.stop(ctx.currentTime + delay + 0.6);
          osc2.stop(ctx.currentTime + delay + 0.6);
        };

        playTrill(0);
        playTrill(0.8);
      };

      ringPulse();
      this.ringtoneInterval = setInterval(ringPulse, 3500);
    } catch {
      // ignore
    }
  }

  startRingtone(): void {
    this.startIncomingRingtone();
  }

  playHangup(): void {
    try {
      this.stopTones();
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(425, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  }

  // Double beep for Call Waiting (Avviso di chiamata su interno occupato)
  playCallWaitingBeep(): void {
    try {
      const ctx = this.getContext();
      const playBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 425;
        gain.gain.setValueAtTime(0.09, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.12);
      };
      playBeep(0);
      playBeep(0.2);
    } catch {
      // ignore
    }
  }

  // Voicemail tone (1000Hz standard Asterisk beep after prompt)
  playVoicemailBeep(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore
    }
  }

  // Asterisk Agent Login chime (ascending tones: C5 -> E5 -> G5)
  playAgentLoginSound(): void {
    try {
      const ctx = this.getContext();
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch {
      // ignore
    }
  }

  // Asterisk Agent Logout chime (descending tones: G5 -> E5 -> C5)
  playAgentLogoutSound(): void {
    try {
      const ctx = this.getContext();
      const freqs = [783.99, 659.25, 523.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch {
      // ignore
    }
  }

  // Asterisk IVR and Voicemail Vocal Announcer (Italian Web Speech)
  speakPrompt(text: string, onEnd?: () => void): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        if (onEnd) {
          utterance.onend = onEnd;
        }
        window.speechSynthesis.speak(utterance);
      } else if (onEnd) {
        setTimeout(onEnd, 2000);
      }
    } catch {
      if (onEnd) onEnd();
    }
  }

  stopSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }

  // Music on Hold (MoH) - gentle PBX acoustic chime arpeggio
  private holdInterval: any = null;
  startHoldMusic(): void {
    try {
      this.stopHoldMusic();
      const ctx = this.getContext();
      const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63]; // C4, E4, G4, C5, A4, G4, E4
      let noteIdx = 0;

      const playNote = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], ctx.currentTime);
        noteIdx++;

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      };

      playNote();
      this.holdInterval = setInterval(playNote, 700);
    } catch {
      // ignore
    }
  }

  stopHoldMusic(): void {
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
  }

  stopTones(): void {
    this.stopSpeech();
    this.stopHoldMusic();
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.ringbackOsc) {
      try {
        this.ringbackOsc.stop();
        this.ringbackOsc.disconnect();
      } catch {}
      this.ringbackOsc = null;
    }
    if (this.ringbackGain) {
      try {
        this.ringbackGain.disconnect();
      } catch {}
      this.ringbackGain = null;
    }
  }

  async startMicAnalysis(): Promise<AnalyserNode | null> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return null;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = this.getContext();
      const source = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      return this.analyser;
    } catch {
      return null;
    }
  }

  stopMicAnalysis(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.analyser = null;
  }
}

export const audioService = new AudioService();
