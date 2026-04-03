import { getHeroClassById } from "../data/heroClasses.js";

export function createSkillsCatalog(env) {
  const { state, targeting, effects, combat, movement, math } = env;

  const shared = {
    qBolt(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.range);
      if (!target) return false;
      movement.faceTowards(caster, target.x, target.y);
      state.projectiles.push({
        from: caster,
        target,
        x: caster.x,
        y: caster.y,
        speed: tune.speed,
        radius: tune.radius,
        damage: tune.baseDamage + caster.level * tune.scaling,
        color: tune.color,
        kind: tune.kind,
        trail: [],
      });
      effects.burst(caster.x, caster.y, tune.color, 10);
      return true;
    },

    wBurst(caster, tune) {
      let hit = false;
      effects.ring(caster.x, caster.y, tune.radius, tune.color);
      const enemies = targeting.getOpposingUnits(caster.side, true, caster);
      for (const unit of enemies) {
        if (unit.dead) continue;
        if (math.dist(caster, unit) <= tune.radius) {
          combat.damageUnit(unit, tune.baseDamage + caster.level * tune.scaling, caster);
          hit = true;
        }
      }
      effects.burst(caster.x, caster.y, tune.color, 18);
      env.setCameraShake(6);
      return hit;
    },

    eDrain(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.range, true);
      if (!target) return false;
      movement.faceTowards(caster, target.x, target.y);
      const amount = tune.baseDamage + caster.level * tune.scaling;
      effects.beam(caster.x, caster.y, target.x, target.y, tune.color);
      combat.damageUnit(target, amount, caster);
      combat.healUnit(caster, amount * tune.healRatio);
      effects.burst(target.x, target.y, tune.color, 10);
      return true;
    },

    rBuff(caster, tune) {
      caster.buff = {
        timer: tune.buffDuration,
        damage: tune.buffDamage,
        speed: tune.buffSpeed,
      };
      effects.burst(caster.x, caster.y, tune.color, 14);
      effects.ring(caster.x, caster.y, 38, tune.color, 0.3);
      return true;
    },
  };

  function buildSkillSet(heroClassId) {
    const heroClass = getHeroClassById(heroClassId);
    const skillColor = heroClass.colors.main;
    return [
      {
        key: "Q",
        name: heroClass.skills.q.name,
        cost: heroClass.skills.q.cost,
        cooldown: heroClass.skills.q.cooldown,
        desc: heroClass.skills.q.desc,
        use(caster) {
          return shared.qBolt(caster, {
            ...heroClass.skills.q,
            range: 390,
            color: skillColor,
            kind: `${heroClass.id}-q`,
          });
        },
      },
      {
        key: "W",
        name: heroClass.skills.w.name,
        cost: heroClass.skills.w.cost,
        cooldown: heroClass.skills.w.cooldown,
        desc: heroClass.skills.w.desc,
        use(caster) {
          return shared.wBurst(caster, {
            ...heroClass.skills.w,
            color: skillColor,
          });
        },
      },
      {
        key: "E",
        name: heroClass.skills.e.name,
        cost: heroClass.skills.e.cost,
        cooldown: heroClass.skills.e.cooldown,
        desc: heroClass.skills.e.desc,
        use(caster) {
          return shared.eDrain(caster, {
            ...heroClass.skills.e,
            color: heroClass.colors.accent,
          });
        },
      },
      {
        key: "R",
        name: heroClass.skills.r.name,
        cost: heroClass.skills.r.cost,
        cooldown: heroClass.skills.r.cooldown,
        desc: heroClass.skills.r.desc,
        use(caster) {
          return shared.rBuff(caster, {
            ...heroClass.skills.r,
            color: heroClass.colors.accent,
          });
        },
      },
    ];
  }

  return {
    forEach(callback) {
      // Control bar always has 4 skill slots.
      [0, 1, 2, 3].forEach((i) => callback(i, i));
    },
    makeSkillSet(heroClassId) {
      return buildSkillSet(heroClassId);
    },
  };
}
