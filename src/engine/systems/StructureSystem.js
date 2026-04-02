import { createSiegeStructures } from '../entities/Structure.js';

export function createStructureSystem({ state, CONFIG, math, targeting }) {
  function buildSiegeStructures(laneY, W) {
    return createSiegeStructures(CONFIG, W, laneY, math.rand);
  }

  function getGate() {
    return state.structures.find((s) => s.kind === 'gate');
  }

  function getTowers() {
    return state.structures.filter((s) => s.kind === 'tower');
  }

  function isGateVulnerable() {
    const towersAlive = getTowers().some((tower) => !tower.dead);
    const timeReached = state.time >= CONFIG.gateUnlockTime;
    const demonPressure = state.enemy.deaths >= 3;
    return !towersAlive || timeReached || demonPressure;
  }

  function pickTowerTarget(tower, W) {
    const defenseStartX = W - CONFIG.defenseZoneFromRight;
    const candidates = [];
    if (!state.player.dead) candidates.push(state.player);
    candidates.push(...targeting.getAliveCreeps('left'));

    let best = null;
    let bestDist = Infinity;
    for (const unit of candidates) {
      if (unit.x < defenseStartX) continue;
      const d = math.dist(tower, unit);
      if (d <= CONFIG.towerRange && d < bestDist) {
        bestDist = d;
        best = unit;
      }
    }
    return best;
  }

  function updateStructures(dt, W) {
    const gateVulnerable = isGateVulnerable();
    for (const structure of state.structures) {
      if (structure.dead) continue;
      if (structure.kind === 'gate') {
        structure.vulnerable = gateVulnerable;
        continue;
      }

      structure.attackCd = Math.max(0, structure.attackCd - dt);
      const target = pickTowerTarget(structure, W);
      if (!target || structure.attackCd > 0) continue;

      structure.attackCd = CONFIG.towerAttackSpeed;
      state.projectiles.push({
        from: structure,
        target,
        x: structure.x,
        y: structure.y,
        speed: 250,
        radius: 6,
        damage: CONFIG.towerDamage,
        color: '#ffc786',
        kind: 'tower-shot',
        trail: [],
      });
    }
  }

  return {
    buildSiegeStructures,
    getGate,
    getTowers,
    isGateVulnerable,
    updateStructures,
  };
}
