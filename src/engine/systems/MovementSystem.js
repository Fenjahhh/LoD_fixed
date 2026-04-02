export class MovementSystem {
  constructor(world) {
    this.world = world;
  }

  faceTowards(unit, x, y) {
    const dx = x - unit.x;
    const dy = y - unit.y;
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      unit.facing = Math.atan2(dy, dx);
    }
  }

  moveHeroTowards(hero, tx, ty, speed, dt) {
    const d = Math.hypot(tx - hero.x, ty - hero.y);
    if (d <= 1) return;
    const step = Math.min(d, speed * dt);
    hero.x += ((tx - hero.x) / d) * step;
    hero.y += ((ty - hero.y) / d) * step;
    this.faceTowards(hero, tx, ty);
  }

  keepUnitInArena(unit) {
    const { math, config } = this.world;
    unit.x = math.clamp(unit.x, config.arenaPadding, this.world.W - config.arenaPadding);
    unit.y = math.clamp(unit.y, config.arenaPadding, this.world.H - config.arenaPadding);
  }
}
