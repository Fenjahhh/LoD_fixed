export function createTargetingSystem(world) {
  const { state, config, math, structuresEnabledRef } = world;

  function getGate() {
    return state.structures.find((s) => s.kind === "gate");
  }

  function getTowers() {
    if (!structuresEnabledRef()) return [];
    return state.structures.filter((s) => s.kind === "tower");
  }

  function getAliveCreeps(side) {
    return state.creeps.filter((c) => c.side === side && !c.dead);
  }

  function getWaveFront(side) {
    const units = getAliveCreeps(side);
    if (units.length === 0) return side === "left" ? state.player.x : state.enemy.x;
    if (side === "left") return Math.max(...units.map((u) => u.x));
    return Math.min(...units.map((u) => u.x));
  }

  function isGateVulnerable() {
    if (!structuresEnabledRef()) return false;
    const towersAlive = getTowers().some((tower) => !tower.dead);
    const timeReached = state.time >= config.gateUnlockTime;
    const demonPressure = state.enemy.deaths >= 3;
    return !towersAlive || timeReached || demonPressure;
  }

  function canTargetStructure(attacker, structure) {
    if (!structuresEnabledRef()) return false;
    if (attacker.side !== "left") return false;
    if (structure.kind === "gate") {
      if (!isGateVulnerable()) return false;
      return attacker.x >= structure.x - config.gateMinSiegeX;
    }
    return true;
  }

  function getAttackableStructures(unit, maxRange = Infinity) {
    if (unit.side !== "left") return [];
    return state.structures
      .filter((s) => !s.dead && canTargetStructure(unit, s))
      .filter((s) => math.dist(unit, s) <= maxRange);
  }

  function getOpposingUnits(side, includeStructures = false, requester = null, maxRange = Infinity) {
    const hero = side === "left" ? state.enemy : state.player;
    const creeps = state.creeps.filter((c) => c.side !== side && !c.dead);
    const units = hero.dead ? [...creeps] : [hero, ...creeps];
    if (includeStructures && requester) {
      units.push(...getAttackableStructures(requester, maxRange));
    }
    return units;
  }

  function findNearestTarget(unit, maxRange = Infinity, preferHero = false) {
    const enemies = getOpposingUnits(unit.side, true, unit, maxRange);
    let best = null;
    let bestDist = Infinity;

    if (preferHero) {
      const hero = unit.side === "left" ? state.enemy : state.player;
      if (!hero.dead && math.dist(unit, hero) <= maxRange) return hero;
    }

    for (const target of enemies) {
      if (target.dead) continue;
      const d = math.dist(unit, target);
      if (d < bestDist && d <= maxRange) {
        bestDist = d;
        best = target;
      }
    }
    return best;
  }

  return {
    getGate,
    getTowers,
    getAliveCreeps,
    getWaveFront,
    isGateVulnerable,
    findNearestTarget,
    getOpposingUnits,
  };
}
