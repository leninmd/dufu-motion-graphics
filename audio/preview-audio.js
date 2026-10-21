/**
 * preview-audio.js — on-demand Web Audio playback for the interactive preview.
 * It renders the entire 138 s score once into an OfflineAudioContext, then plays
 * the resulting AudioBuffer through a real AudioContext. The picture clock uses
 * the audio clock, so playback and scrubbing stay in sync.
 */
import { renderScore, analyse, DURATION } from './score.js';

class PreviewAudio {
  constructor() {
    this.buffer = null;
    this.ctx = null;
    this.gainNode = null;
    this.source = null;
    this.offset = 0;
    this.startedAt = 0;
    this.playing = false;
    this.analysis = null;
    this.promise = null;
    this.volume = 0.8;
  }

  isReady() { return !!this.buffer; }
  status() {
    return {
      ready: this.isReady(),
      playing: this.playing,
      duration: DURATION,
      analysis: this.analysis,
      volume: this.volume,
    };
  }

  ensureContext(sampleRate = 48000) {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ sampleRate, latencyHint: 'playback' });
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.ctx.destination);
    return this.ctx;
  }

  async ensure() {
    if (this.buffer) return this.buffer;
    if (this.promise) return this.promise;
    this.promise = (async () => {
      const t0 = performance.now();
      let buf = null;
      // Preferred path: the build-time OfflineAudioContext render, decoded by
      // Web Audio for sample-accurate, instant playback.
      try {
        const ctx = this.ensureContext(48000);
        const res = await fetch('/output/audio/mix_v6.wav', { cache: 'no-store' });
        if (!res.ok) throw new Error(`mix_v6.wav ${res.status}`);
        const ab = await res.arrayBuffer();
        buf = await ctx.decodeAudioData(ab);
      } catch (e) {
        console.info('[preview-audio] pre-rendered mix unavailable, synthesizing offline…', e.message);
        buf = await renderScore();
        this.ensureContext(buf.sampleRate);
      }
      this.buffer = buf;
      this.analysis = analyse(buf);
      this.analysis.renderMs = Math.round(performance.now() - t0);
      this.analysis.source = 'Web Audio OfflineAudioContext → AudioBuffer';
      document.dispatchEvent(new CustomEvent('dft-audio-ready', { detail: this.analysis }));
      return buf;
    })().catch((e) => {
      this.promise = null;
      throw e;
    });
    return this.promise;
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  currentTime() {
    if (!this.buffer) return this.offset;
    if (!this.playing) return this.offset;
    const now = this.ctx.currentTime;
    if (now < this.startedAt) return this.offset;
    return Math.min(this.buffer.duration - 1e-5, this.offset + (now - this.startedAt));
  }

  async play() {
    if (!this.buffer) await this.ensure();
    if (!this.buffer) return;
    await this.resume();
    if (this.playing) return;
    this.stopSource();
    const offset = Math.max(0, Math.min(this.buffer.duration - 0.01, this.offset));
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gainNode);
    src.onended = () => {
      if (this.source === src) {
        this.playing = false;
        this.offset = 0;
      }
    };
    this.startedAt = this.ctx.currentTime + 0.06;
    this.source = src;
    src.start(this.startedAt, offset);
    this.offset = offset;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    const t = this.currentTime();
    this.stopSource();
    this.offset = Math.max(0, Math.min(this.buffer.duration - 0.01, t));
    this.playing = false;
  }

  seek(t) {
    const was = this.playing;
    this.stopSource();
    this.playing = false;
    this.offset = Math.max(0, Math.min((this.buffer?.duration ?? DURATION) - 0.01, t));
    if (was) this.play();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
  }

  stopSource() {
    if (this.source) {
      try { this.source.onended = null; this.source.stop(); } catch { /* already ended */ }
      this.source.disconnect();
      this.source = null;
    }
  }
}

if (!window.__DFT_AUDIO) {
  const audio = new PreviewAudio();
  window.__DFT_AUDIO = audio;
  window.__DFT_AUDIO_CLASS = PreviewAudio;
}
