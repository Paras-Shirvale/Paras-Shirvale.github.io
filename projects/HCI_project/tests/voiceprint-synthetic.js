// Synthetic check of voiceprint.js: source-filter voices. Pitch must NOT decide identity; vocal tract must.
const V = require('../js/voiceprint.js');
const SR = 44100, N = 2048;
const VOW = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240] };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function frame(scale, f0, vowel, tilt) {
  const out = new Float64Array(N + 400), period = SR / f0;
  const src = new Float64Array(N + 400);
  for (let t = rnd() * period; t < src.length; t += period * (1 + (rnd() - 0.5) * 0.02)) src[Math.floor(t)] = 1;
  let x = src;
  VOW[vowel].forEach((f, k) => {
    const fc = f * scale * (1 + (rnd() - 0.5) * 0.06), bw = 60 + 40 * k;
    const r = Math.exp(-Math.PI * bw / SR), c1 = 2 * r * Math.cos(2 * Math.PI * fc / SR), c2 = -r * r;
    const y = new Float64Array(x.length);
    for (let n = 0; n < x.length; n++) y[n] = x[n] * (1 - r) + c1 * (n > 0 ? y[n - 1] : 0) + c2 * (n > 1 ? y[n - 2] : 0);
    x = y;
  });
  for (let n = 0; n < x.length; n++) x[n] += (rnd() - 0.5) * 1e-4 * (1 + tilt);
  return x.slice(300, 300 + N);
}

function frames(scale, f0lo, f0hi, count) {
  const out = [], keys = Object.keys(VOW);
  for (let i = 0; i < count; i++) {
    const f0 = f0lo + rnd() * (f0hi - f0lo), v = keys[i % 5], fr = frame(scale, f0, v, 0);
    const fm = V.formants(fr, SR);
    out.push({ cep: V.mfcc(fr, SR), scale: V.tractScale(fm), ok: !!fm });
  }
  return out;
}

const adult = frames(1.0, 95, 135, 60);                 // adult male, usual pitch
console.log('formant frames found:', adult.filter(f => f.ok).length, '/ 60  scale median ~',
  adult.map(f => f.scale).filter(Boolean).sort()[30].toFixed(2));
const print = V.enrol(adult);
const cases = {
  'same adult again (usual pitch)':       frames(1.0, 95, 135, 24),
  'same adult, HIGH pitch (question)':    frames(1.0, 170, 230, 24),
  'same adult, low pitch':                frames(1.0, 80, 100, 24),
  'child (higher formants, high pitch)':  frames(1.30, 230, 300, 24),
  'child speaking LOW (same pitch as adult)': frames(1.30, 100, 140, 24),
  'woman (formants x1.17)':               frames(1.17, 170, 230, 24),
};
for (const [name, fr] of Object.entries(cases)) {
  const c = V.compare(print, fr.slice(0, 8));
  console.log(name.padEnd(44), 'timbre', c.timbre.toFixed(2), ' tract', c.tract.toFixed(3));
}
