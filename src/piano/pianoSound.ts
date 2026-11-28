/* ──────────────────────────────────────────────────────────────────────────
   The piano's voice: Salamander Grand Piano samples (Alexander Holm, CC-BY 3.0), one recorded every minor third,
   the notes between pitched from the nearest. A short room reverb sits behind them. Browsers only allow sound after
   the visitor has clicked or tapped once, so nothing loads or plays until then.
   ────────────────────────────────────────────────────────────────────────── */

const NAMES = ['A', 'C', 'Ds', 'Fs'];
const SEMI: Record<string, number> = { A: 9, C: 0, Ds: 3, Fs: 6 };
const SAMPLES: { midi: number; file: string }[] = [];
for (let o = 0; o <= 7; o += 1) {
  NAMES.forEach((n) => {
    if (o === 0 && n !== 'A') return;
    SAMPLES.push({ midi: 12 * (o + 1) + SEMI[n], file: `${n}${o}` });
  });
}
SAMPLES.push({ midi: 108, file: 'C8' });

export type PianoSound = {
  /* call from inside a click or tap: wakes the audio up and starts loading the samples */
  unlock: () => void;
  /* strike a key, 0..1 */
  play: (midi: number, velocity: number) => void;
  setMuted: (muted: boolean) => void;
};

export const createPianoSound = (): PianoSound => {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let muted = false;
  const buffers = new Map<number, AudioBuffer>();
  const voices: { src: AudioBufferSourceNode; gain: GainNode; midi: number }[] = [];

  /* a small wooden room: a burst of noise dying away over a second and a half */
  const roomImpulse = (c: AudioContext) => {
    const len = Math.floor(c.sampleRate * 1.6);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    return ir;
  };

  const start = () => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    ctx = c;
    out = c.createGain();
    out.gain.value = muted ? 0 : 0.8;
    const dry = c.createGain();
    dry.gain.value = 0.85;
    const wet = c.createGain();
    wet.gain.value = 0.22;
    const verb = c.createConvolver();
    verb.buffer = roomImpulse(c);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    out.connect(dry).connect(comp);
    out.connect(verb).connect(wet).connect(comp);
    comp.connect(c.destination);
    /* the middle of the keyboard first, since that's where hands land */
    [...SAMPLES]
      .sort((a, b) => Math.abs(a.midi - 62) - Math.abs(b.midi - 62))
      .forEach(({ midi, file }) => {
        fetch(`/piano/${file}.mp3`)
          .then((r) => r.arrayBuffer())
          .then((b) => c.decodeAudioData(b))
          .then((buf) => buffers.set(midi, buf))
          .catch(() => undefined);
      });
  };

  return {
    unlock() {
      if (!ctx) start();
      else if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    },
    play(midi, velocity) {
      if (!ctx || !out || muted || ctx.state !== 'running') return;
      /* nearest sample that has arrived, pitched to the note */
      let best: number | null = null;
      buffers.forEach((_, m) => {
        if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
      });
      if (best === null || Math.abs((best as number) - midi) > 4) return;
      const c = ctx;
      const now = c.currentTime;
      /* the same key struck again damps the last strike, like a real one */
      voices
        .filter((v) => v.midi === midi)
        .forEach((v) => {
          v.gain.gain.cancelScheduledValues(now);
          v.gain.gain.setTargetAtTime(0, now, 0.03);
          v.src.stop(now + 0.2);
        });
      const src = c.createBufferSource();
      src.buffer = buffers.get(best)!;
      src.playbackRate.value = 2 ** ((midi - (best as number)) / 12);
      const gain = c.createGain();
      const v = Math.max(0.05, Math.min(1, velocity));
      const peak = 0.15 + v * v * 0.75;
      gain.gain.setValueAtTime(peak, now);
      /* a hovered key isn't held: let it ring a while, then lift the damper */
      gain.gain.setTargetAtTime(peak * 0.55, now + 0.05, 0.6);
      gain.gain.setTargetAtTime(0, now + 1.4, 0.35);
      /* softer strikes are darker */
      const tone = c.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 1800 + v * 9000;
      src.connect(tone).connect(gain).connect(out);
      src.start(now);
      src.stop(now + 3.2);
      const voice = { src, gain, midi };
      voices.push(voice);
      src.onended = () => {
        const i = voices.indexOf(voice);
        if (i >= 0) voices.splice(i, 1);
      };
      /* a glissando across forty keys shouldn't pile up forty voices */
      while (voices.length > 24) {
        const old = voices.shift()!;
        old.gain.gain.setTargetAtTime(0, now, 0.02);
        old.src.stop(now + 0.15);
      }
    },
    setMuted(m) {
      muted = m;
      if (ctx && out) out.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.02);
    },
  };
};
