import { CONFIG } from "../data/config.js";
import { createCreep } from "../entities/Creep.js";

export function createWaveSystem(state, getWorld) {
  function spawnWave() {
    const { W, laneY } = getWorld();
    const leftStart = CONFIG.leftWaveStartX;
    const rightStart = W - CONFIG.leftWaveStartX;
    for (let i = 0; i < CONFIG.waveMeleeCount; i += 1) {
      state.creeps.push(
        createCreep("left", "melee", leftStart - i * 24, laneY + CONFIG.laneTopOffset + i * 25),
        createCreep("right", "melee", rightStart + i * 24, laneY + CONFIG.laneBottomOffset - i * 25),
      );
    }
    for (let i = 0; i < CONFIG.waveRangedCount; i += 1) {
      state.creeps.push(
        createCreep("left", "ranged", leftStart - 64 - i * 20, laneY + CONFIG.laneBottomOffset - i * 22),
        createCreep("right", "ranged", rightStart + 64 + i * 20, laneY + CONFIG.laneTopOffset + i * 22),
      );
    }
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

  return {
    spawnWave,
    getAliveCreeps,
    getWaveFront,
  };
}
