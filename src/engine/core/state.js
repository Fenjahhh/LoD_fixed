export function createInitialState() {
  return {
    time: 0,
    lastTs: 0,
    creeps: [],
    structures: [],
    projectiles: [],
    effects: [],
    winner: null,
    spawnTimer: 0,
    enemyThinkTimer: 0,
    player: null,
    enemy: null,
    rafId: 0,
    input: {
      mouseX: 0,
      mouseY: 0,
      moving: false,
    },
    uiMessageTimer: 0,
    message: '',
    gateWasVulnerable: false,
    cameraShake: 0,
  };
}
