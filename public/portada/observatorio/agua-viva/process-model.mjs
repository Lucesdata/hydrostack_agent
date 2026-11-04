const fract = (x) => x - Math.floor(x);
const random = (i, k) => fract(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);
export function particleSample(i, time) {
  const angle = random(i, 1) * Math.PI * 2,
    radius = Math.sqrt(random(i, 2)) * 5.9,
    size = 0.035 + random(i, 3) * 0.055,
    start = 0.75 + random(i, 4) * 1.8,
    speed = 0.007 + size * 0.25;
  return {
    x: Math.cos(angle + Math.min(time, 120) * 0.001) * radius,
    z: Math.sin(angle + Math.min(time, 120) * 0.001) * radius,
    y: Math.max(0.5 + random(i, 5) * 0.12, start - time * speed),
    size,
  };
}
export function sludgeDepth(time) {
  return 0.035 + 0.14 * (1 - Math.exp(-Math.max(0, time) / 95));
}
