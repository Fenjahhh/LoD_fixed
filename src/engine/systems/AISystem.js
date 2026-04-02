export function createAISystem(world, deps) {
  const { state, config } = world;
  const { movement, targeting, skills, wave } = deps;

  function updateEnemyAI(hero, dt) {
    state.enemyThinkTimer -= dt;
    const stats = deps.heroStats(hero);
    const player = state.player;
    const finalMoveSpeed = stats.moveSpeed + (hero.buff ? hero.buff.speed : 0);
    const hpRatio = hero.hp / stats.maxHp;

    if (!hero.retreating && hpRatio <= config.enemyLowHpRetreat) hero.retreating = true;
    if (hero.retreating && hpRatio >= config.enemyReengageHp) {
      const rightFront = wave.getWaveFront("right");
      if (rightFront <= world.W * 0.72) hero.retreating = false;
    }

    if (hero.retreating) {
      movement.moveHeroTowards(hero, world.W - config.enemyRetreatXFromRight, world.laneY, finalMoveSpeed * 0.92, dt);
    } else {
      const target = targeting.findNearestTarget(hero, 360, true);
      if (target) {
        const d = world.math.dist(hero, target);
        if (d > hero.attackRange * 0.9) {
          movement.moveHeroTowards(hero, target.x, target.y, finalMoveSpeed * 0.72, dt);
        } else {
          movement.faceTowards(hero, target.x, target.y);
        }
      } else {
        const anchorX = world.math.clamp(
          wave.getWaveFront("right") - 46,
          world.W * 0.56,
          world.W * config.enemyFightAnchorRatio
        );
        movement.moveHeroTowards(hero, anchorX, world.laneY, finalMoveSpeed * 0.5, dt);
      }
    }

    movement.keepUnitInArena(hero);

    if (state.enemyThinkTimer <= 0) {
      state.enemyThinkTimer = world.math.rand(0.52, 1.25);
      const playerNear = !player.dead && world.math.dist(hero, player) < 178;

      if (hero.retreating) {
        if (playerNear && hero.skills[2].cd <= 0) skills.tryCastSkill(hero, 2);
        return;
      }

      if (playerNear && hero.skills[2].cd <= 0) skills.tryCastSkill(hero, 2);
      else if (playerNear && hero.skills[1].cd <= 0) skills.tryCastSkill(hero, 1);
      else if (targeting.findNearestTarget(hero, 330) && hero.skills[0].cd <= 0) skills.tryCastSkill(hero, 0);
      else if (playerNear && hero.skills[3].cd <= 0) skills.tryCastSkill(hero, 3);
    }
  }

  return { updateEnemyAI };
}
