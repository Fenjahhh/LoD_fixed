import { CONFIG, COLORS } from '../data/config.js';

export class CombatSystem {
  constructor(world) {
    this.world = world;
  }

  heroStats(hero) {
    let bonusHp = 0;
    let bonusMana = 0;
    let bonusDamage = 0;
    let bonusRegen = 0;
    let bonusSpeed = 0;
    for (const item of hero.items) {
      bonusHp += item.bonusHp || 0;
      bonusMana += item.bonusMana || 0;
      bonusDamage += item.bonusDamage || 0;
      bonusRegen += item.bonusRegen || 0;
      bonusSpeed += item.bonusSpeed || 0;
    }
    return {
      maxHp: hero.maxHp + bonusHp,
      maxMana: hero.maxMana + bonusMana,
      attackDamage: hero.attackDamage + bonusDamage,
      manaRegen: hero.manaRegen + bonusRegen,
      moveSpeed: hero.moveSpeed + bonusSpeed,
    };
  }

  damageUnit(unit, amount, source) {
    const { effects, progression, state } = this.world;
    if (unit.dead) return;
    unit.hp -= amount;
    effects.burst(unit.x, unit.y, '#ffffff', 4, amount);
    if (unit.hp > 0) return;

    unit.hp = 0;
    unit.dead = true;

    if (unit.type === 'structure') {
      effects.burst(unit.x, unit.y, COLORS.neutral, 22);
      state.cameraShake = 6;
      if (unit.kind === 'tower') {
        effects.showMessage('Verteidigungsturm zerstört.', 1.5);
        if (source && source.type === 'hero' && source.side === 'left') {
          progression.gainGold(source, CONFIG.towerKillGold);
          progression.gainExp(source, CONFIG.towerKillExp);
        }
      } else if (unit.kind === 'gate') {
        state.winner = 'player';
        effects.showMessage('Sieg! Das Tor ist gefallen.', 999);
      }
      return;
    }

    effects.burst(unit.x, unit.y, unit.side === 'left' ? COLORS.ally : COLORS.enemy, 16);
    state.cameraShake = 4;
    if (!source) return;

    if (unit.type === 'creep' && source.type === 'hero') {
      const gold = unit.role === 'melee' ? CONFIG.pointsPerMelee : CONFIG.pointsPerRanged;
      const exp = unit.role === 'melee' ? CONFIG.expPerMelee : CONFIG.expPerRanged;
      progression.gainGold(source, gold);
      progression.gainExp(source, exp);
      return;
    }

    if (unit.type === 'hero') {
      unit.deaths += 1;
      unit.retreating = false;
      if (source.type === 'hero') {
        source.kills += 1;
        progression.gainGold(source, CONFIG.heroKillGold);
        progression.gainExp(source, CONFIG.heroKillExp);
      }
      unit.respawnTimer = 7;
      if (source === this.world.state.player) effects.showMessage('Gegnerischer Dämon besiegt!', 1.8);
      if (source === this.world.state.enemy) effects.showMessage('Du wurdest besiegt!', 1.8);
    }
  }

  healUnit(unit, amount) {
    const { clamp } = this.world.math;
    const stats = unit.type === 'hero' ? this.heroStats(unit) : unit;
    unit.hp = clamp(unit.hp + amount, 0, stats.maxHp || unit.maxHp);
  }

  updateProjectiles(dt) {
    const { state, effects } = this.world;
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const p = state.projectiles[i];
      p.trail = p.trail || [];
      p.trail.push({ x: p.x, y: p.y, life: 0.18 });
      if (p.trail.length > 8) p.trail.shift();
      for (const t of p.trail) t.life -= dt;
      p.trail = p.trail.filter((t) => t.life > 0);

      if (p.target) {
        if (p.target.dead) {
          state.projectiles.splice(i, 1);
          continue;
        }
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < p.speed * dt + p.target.radius) {
          this.damageUnit(p.target, p.damage, p.from);
          effects.burst(p.x, p.y, p.color, 5);
          state.projectiles.splice(i, 1);
          continue;
        }
        p.x += (dx / d) * p.speed * dt;
        p.y += (dy / d) * p.speed * dt;
        continue;
      }

      // Directional projectile (e.g. rocket) flying by velocity.
      const stepX = (p.vx || 0) * dt;
      const stepY = (p.vy || 0) * dt;
      p.x += stepX;
      p.y += stepY;
      p.traveled = (p.traveled || 0) + Math.hypot(stepX, stepY);

      const enemies = this.world.targeting.getOpposingUnits(p.from?.side || "left", true, p.from || null);
      let directHit = null;
      for (const unit of enemies) {
        if (!unit || unit.dead) continue;
        const d = Math.hypot(unit.x - p.x, unit.y - p.y);
        if (d <= (unit.radius || 0) + p.radius + 2) {
          directHit = unit;
          break;
        }
      }

      const expired = p.maxDistance && p.traveled >= p.maxDistance;
      if (directHit || expired) {
        if (p.aoeRadius && p.aoeRadius > 0) {
          effects.ring(p.x, p.y, p.aoeRadius, p.color, 0.3);
          for (const unit of enemies) {
            if (!unit || unit.dead) continue;
            const d = Math.hypot(unit.x - p.x, unit.y - p.y);
            if (d <= p.aoeRadius + (unit.radius || 0)) {
              this.damageUnit(unit, p.damage, p.from);
            }
          }
        } else if (directHit) {
          this.damageUnit(directHit, p.damage, p.from);
        }
        effects.burst(p.x, p.y, p.color, 8);
        state.projectiles.splice(i, 1);
      }
    }
  }

  fireAutoAttackProjectile(attacker, target, damage, color) {
    this.world.state.projectiles.push({
      from: attacker,
      target,
      x: attacker.x,
      y: attacker.y,
      speed: 340,
      radius: 4,
      damage,
      color,
      kind: "auto",
      trail: [],
    });
  }
}
