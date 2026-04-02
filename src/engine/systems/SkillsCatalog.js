export function createSkillsCatalog(env) {
  const { state, colors, targeting, effects, combat, movement } = env;

  return [
    {
      key: 'Q',
      name: 'Shadow Bolt',
      cost: 24,
      cooldown: 2.5,
      desc: 'Schiesst ein Projektil auf das naechste Ziel.',
      use(caster) {
        const target = targeting.findNearestTarget(caster, 360);
        if (!target) return false;
        movement.faceTowards(caster, target.x, target.y);
        state.projectiles.push({
          from: caster,
          target,
          x: caster.x,
          y: caster.y,
          speed: 360,
          radius: 10,
          damage: 42 + caster.level * 6,
          color: caster.side === 'left' ? colors.ally2 : colors.enemy2,
          kind: 'bolt',
          trail: [],
        });
        effects.burst(caster.x, caster.y, caster.side === 'left' ? colors.ally2 : colors.enemy2, 10);
        return true;
      },
    },
    {
      key: 'W',
      name: 'Soul Burst',
      cost: 36,
      cooldown: 5.5,
      desc: 'Flaechenschaden um deinen Daemon.',
      use(caster) {
        const radius = 110;
        let hit = false;
        effects.ring(caster.x, caster.y, radius, caster.side === 'left' ? colors.ally : colors.enemy);
        const enemies = targeting.getOpposingUnits(caster.side, true, caster);
        for (const unit of enemies) {
          if (unit.dead) continue;
          if (env.math.dist(caster, unit) <= radius) {
            combat.damageUnit(unit, 36 + caster.level * 7, caster);
            hit = true;
          }
        }
        effects.burst(caster.x, caster.y, caster.side === 'left' ? colors.ally : colors.enemy, 18);
        env.setCameraShake(6);
        return hit;
      },
    },
    {
      key: 'E',
      name: 'Drain',
      cost: 30,
      cooldown: 7,
      desc: 'Schadet einem Ziel und heilt dich.',
      use(caster) {
        const target = targeting.findNearestTarget(caster, 190, true);
        if (!target) return false;
        movement.faceTowards(caster, target.x, target.y);
        const amount = 48 + caster.level * 5;
        effects.beam(caster.x, caster.y, target.x, target.y, colors.drain);
        combat.damageUnit(target, amount, caster);
        combat.healUnit(caster, amount * 0.55);
        effects.burst(target.x, target.y, colors.drain, 10);
        return true;
      },
    },
    {
      key: 'R',
      name: 'Overdrive',
      cost: 48,
      cooldown: 12,
      desc: 'Kurz Buff auf Schaden und Tempo.',
      use(caster) {
        caster.buff = {
          timer: 5,
          damage: 14,
          speed: 24,
        };
        effects.burst(caster.x, caster.y, colors.overdrive, 14);
        effects.ring(caster.x, caster.y, 38, colors.overdrive, 0.3);
        return true;
      },
    },
  ];
}
