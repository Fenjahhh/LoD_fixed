export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function rand(min, max) {
  return Math.random() * (max - min) + min;
}
