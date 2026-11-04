export function createState() {
  return { running: false, speed: 1, time: 0, clarity: 0, turbidity: 180, volume: 0 };
}
export function advance(s, dt) {
  if (!s.running) return s;
  s.time += Math.max(0, dt) * s.speed;
  s.clarity = 1 - Math.exp(-s.time / 65);
  s.turbidity = 4 + 176 * (1 - s.clarity);
  s.volume = s.time * 0.035;
  return s;
}
