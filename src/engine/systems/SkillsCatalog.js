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

    qRocketForward(caster, tune) {
      const angle = Number.isFinite(caster.facing) ? caster.facing : (caster.side === "left" ? 0 : Math.PI);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      state.projectiles.push({
        from: caster,
        target: null,
        x: caster.x + dirX * 26,
        y: caster.y + dirY * 26,
        vx: dirX * tune.speed,
        vy: dirY * tune.speed,
        maxDistance: tune.range,
        traveled: 0,
        radius: tune.radius,
        damage: tune.baseDamage + caster.level * tune.scaling,
        color: tune.color,
        kind: "rocket-shot",
        aoeRadius: tune.aoeRadius,
        trail: [],
      });
      effects.burst(caster.x, caster.y, tune.color, 12);
      return true;
    },

    wPoisonCloud(caster, tune) {
      const centerX = caster.x + Math.cos(caster.facing || 0) * tune.offset;
      const centerY = caster.y + Math.sin(caster.facing || 0) * tune.offset;
      state.skillHazards.push({
        kind: "poison-cloud",
        side: caster.side,
        x: centerX,
        y: centerY,
        radius: tune.radius,
        duration: tune.duration,
        tickEvery: tune.tickEvery,
        tickTimer: tune.tickEvery,
        baseDamage: tune.baseDamage,
        scaling: tune.scaling,
        color: tune.color,
        source: caster,
      });
      effects.ring(centerX, centerY, tune.radius, tune.color, 0.45);
      effects.burst(centerX, centerY, tune.color, 14);
      return true;
    },

    eBlinkSlash(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.range, true);
      if (!target) return false;
      const dx = target.x - caster.x;
      const dy = target.y - caster.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const stopDist = tune.stopDistance;
      caster.x = target.x - (dx / d) * stopDist;
      caster.y = target.y - (dy / d) * stopDist;
      movement.keepUnitInArena(caster);
      movement.faceTowards(caster, target.x, target.y);
      const dmg = tune.baseDamage + caster.level * tune.scaling;
      effects.beam(caster.x, caster.y, target.x, target.y, tune.color);
      effects.burst(target.x, target.y, tune.color, 10);
      combat.damageUnit(target, dmg, caster);
      return true;
    },

    rRailBeam(caster, tune) {
      const angle = Number.isFinite(caster.facing) ? caster.facing : (caster.side === "left" ? 0 : Math.PI);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const x2 = caster.x + dirX * tune.range;
      const y2 = caster.y + dirY * tune.range;
      effects.beam(caster.x, caster.y, x2, y2, tune.color);
      effects.ring(caster.x, caster.y, 34, tune.color, 0.25);
      let hitAny = false;
      const enemies = targeting.getOpposingUnits(caster.side, true, caster);
      const width = tune.width;
      const base = tune.baseDamage + caster.level * tune.scaling;
      for (const unit of enemies) {
        if (unit.dead) continue;
        const px = unit.x - caster.x;
        const py = unit.y - caster.y;
        const along = px * dirX + py * dirY;
        if (along < 0 || along > tune.range) continue;
        const perp = Math.abs(px * dirY - py * dirX);
        if (perp <= width + (unit.radius || 0)) {
          combat.damageUnit(unit, base, caster);
          hitAny = true;
        }
      }
      if (hitAny) env.setCameraShake(7);
      return hitAny;
    },

    qTripleFan(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.range) || { x: caster.x + (caster.side === "left" ? 1 : -1) * tune.range, y: caster.y };
      movement.faceTowards(caster, target.x, target.y);
      const baseAngle = Number.isFinite(caster.facing) ? caster.facing : (caster.side === "left" ? 0 : Math.PI);
      const offsets = [-tune.spread, 0, tune.spread];
      for (const offset of offsets) {
        const a = baseAngle + offset;
        state.projectiles.push({
          from: caster,
          target: null,
          x: caster.x + Math.cos(a) * 20,
          y: caster.y + Math.sin(a) * 20,
          vx: Math.cos(a) * tune.speed,
          vy: Math.sin(a) * tune.speed,
          maxDistance: tune.range,
          traveled: 0,
          radius: tune.radius,
          damage: tune.baseDamage + caster.level * tune.scaling,
          color: tune.color,
          kind: "fan-shot",
          aoeRadius: 0,
          trail: [],
        });
      }
      effects.burst(caster.x, caster.y, tune.color, 10);
      return true;
    },

    qPushBlast(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.range, true);
      if (!target) return false;
      movement.faceTowards(caster, target.x, target.y);
      state.projectiles.push({
        from: caster,
        target,
        x: caster.x,
        y: caster.y,
        speed: tune.projectileSpeed || 440,
        radius: tune.projectileRadius || 7,
        damage: 0,
        color: tune.color,
        kind: "force-pulse",
        trail: [],
      });
      const damage = tune.baseDamage + caster.level * tune.scaling;
      effects.beam(caster.x, caster.y, target.x, target.y, tune.color);
      effects.ring(target.x, target.y, 24, tune.color, 0.2);
      combat.damageUnit(target, damage, caster);
      if (!target.dead) {
        const dx = target.x - caster.x;
        const dy = target.y - caster.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        target.x += (dx / d) * tune.pushDistance;
        target.y += (dy / d) * tune.pushDistance * 0.45;
        movement.keepUnitInArena(target);
      }
      return true;
    },

    wRiftHole(caster, tune) {
      const target = targeting.findNearestTarget(caster, tune.castRange) || {
        x: caster.x + Math.cos(caster.facing || 0) * tune.castRange * 0.7,
        y: caster.y + Math.sin(caster.facing || 0) * tune.castRange * 0.35,
      };
      state.skillHazards.push({
        kind: "void-hole",
        side: caster.side,
        x: target.x,
        y: target.y,
        radius: tune.radius,
        duration: tune.duration,
        tickEvery: tune.tickEvery,
        tickTimer: tune.tickEvery,
        baseDamage: 99999,
        scaling: 0,
        color: tune.color,
        source: caster,
        instaKill: true,
      });
      effects.ring(target.x, target.y, tune.radius, tune.color, 0.4);
      effects.burst(target.x, target.y, tune.color, 14);
      return true;
    },
  };

  function buildSkillSet(heroClassId) {
    const heroClass = getHeroClassById(heroClassId);
    const skillColor = heroClass.colors.main;

    if (state.level >= 3 && heroClass.id === "crimson_hunter") {
      return [
        {
          key: "Q",
          name: "Crimson Fan",
          cost: 26,
          cooldown: 4.2,
          desc: "Schiesst drei Projektile im Faecher.",
          use(caster) {
            return shared.qTripleFan(caster, {
              range: 420,
              speed: 360,
              radius: 6,
              spread: 0.23,
              baseDamage: 28,
              scaling: 4,
              color: "#ff6f6f",
            });
          },
        },
        {
          key: "W",
          name: "Rift Hole",
          cost: 40,
          cooldown: 9.5,
          desc: "Reisst ein Loch in den Boden (Insta-Kill-Zone).",
          use(caster) {
            return shared.wRiftHole(caster, {
              castRange: 260,
              radius: 40,
              duration: 3.2,
              tickEvery: 0.2,
              color: "#2a1b3f",
            });
          },
        },
        {
          key: "E",
          name: "Crimson Mark",
          cost: 28,
          cooldown: 7.2,
          desc: "Drain-Mark mit Heilung.",
          use(caster) {
            return shared.eDrain(caster, {
              range: 205,
              baseDamage: 46,
              scaling: 5,
              healRatio: 0.58,
              color: "#ffc2c2",
            });
          },
        },
        {
          key: "R",
          name: "Predator Drive",
          cost: 50,
          cooldown: 12.8,
          desc: "Massiver Damage/Tempo-Buff fuer kurze Zeit.",
          use(caster) {
            return shared.rBuff(caster, {
              buffDuration: 5.2,
              buffDamage: 16,
              buffSpeed: 30,
              color: "#ff9f9f",
            });
          },
        },
      ];
    }

    if (state.level >= 3 && heroClass.id === "emerald_oracle") {
      return [
        {
          key: "Q",
          name: "Rift Pit",
          cost: 32,
          cooldown: 7.2,
          desc: "Reisst ein Loch in den Boden (Insta-Kill-Zone).",
          use(caster) {
            return shared.wRiftHole(caster, {
              castRange: 260,
              radius: 40,
              duration: 3.4,
              tickEvery: 0.2,
              color: "#1f3a30",
            });
          },
        },
        {
          key: "W",
          name: "Force Pulse",
          cost: 24,
          cooldown: 3.9,
          desc: "Kurzstrahl, der Gegner wegstoesst.",
          use(caster) {
            return shared.qPushBlast(caster, {
              range: 230,
              baseDamage: 30,
              scaling: 4,
              pushDistance: 64,
              color: "#74ffd5",
            });
          },
        },
        {
          key: "E",
          name: "Vine Drain",
          cost: 30,
          cooldown: 6.8,
          desc: "Langer Sustain-Drain.",
          use(caster) {
            return shared.eDrain(caster, {
              range: 240,
              baseDamage: 42,
              scaling: 6,
              healRatio: 0.64,
              color: "#bbffe8",
            });
          },
        },
        {
          key: "R",
          name: "Magnet Dash",
          cost: 50,
          cooldown: 12.2,
          desc: "Schneller Dash mit kurzem Buff.",
          use(caster) {
            return shared.rDashBurst(caster, {
              dashDistance: 170,
              baseDamage: 40,
              scaling: 6,
              buffDuration: 3.8,
              buffDamage: 10,
              buffSpeed: 40,
              color: "#9fffe7",
            });
          },
        },
      ];
    }

    if (state.level >= 3 && heroClass.id === "void_templar") {
      return [
        {
          key: "Q",
          name: "Force Pulse",
          cost: 24,
          cooldown: 3.9,
          desc: "Kurzstrahl, der Gegner wegstoesst.",
          use(caster) {
            return shared.qPushBlast(caster, {
              range: 230,
              baseDamage: 34,
              scaling: 5,
              pushDistance: 70,
              color: "#b4c4ff",
            });
          },
        },
        {
          key: "W",
          name: "Aegis Pulse",
          cost: 34,
          cooldown: 5.6,
          desc: "Defensive Nova mit mittlerer Reichweite.",
          use(caster) {
            return shared.wBurst(caster, {
              radius: 118,
              baseDamage: 36,
              scaling: 6,
              color: skillColor,
            });
          },
        },
        {
          key: "E",
          name: "Blink Slash",
          cost: 30,
          cooldown: 7.4,
          desc: "Teleport-Slash auf nahes Ziel.",
          use(caster) {
            return shared.eBlinkSlash(caster, {
              range: 220,
              stopDistance: 34,
              baseDamage: 50,
              scaling: 5,
              color: "#d0d8ff",
            });
          },
        },
        {
          key: "R",
          name: "Rail Judgement",
          cost: 52,
          cooldown: 13,
          desc: "Durchdringender Linienstrahl in Blickrichtung.",
          use(caster) {
            return shared.rRailBeam(caster, {
              range: 520,
              width: 36,
              baseDamage: 62,
              scaling: 8,
              color: "#b8c4ff",
            });
          },
        },
      ];
    }

    if (state.level >= 3 && heroClass.id === "crimson_hunter") {
      return [
        {
          key: "Q",
          name: "Rift Pit",
          cost: 32,
          cooldown: 7.2,
          desc: "Reisst ein Loch in den Boden (Insta-Kill-Zone).",
          use(caster) {
            return shared.wRiftHole(caster, {
              castRange: 260,
              radius: 42,
              duration: 3.6,
              tickEvery: 0.2,
              color: "#281537",
            });
          },
        },
        {
          key: "W",
          name: "Rift Rocket",
          cost: 24,
          cooldown: 3.2,
          desc: "Langstreckenrakete in Bewegungsrichtung mit Splash.",
          use(caster) {
            return shared.qRocketForward(caster, {
              speed: 420,
              range: 540,
              radius: 8,
              aoeRadius: 72,
              baseDamage: 52,
              scaling: 7,
              color: "#ff5a5a",
            });
          },
        },
        {
          key: "E",
          name: "Crimson Mark",
          cost: 28,
          cooldown: 7.2,
          desc: "Drain-Mark mit Heilung.",
          use(caster) {
            return shared.eDrain(caster, {
              range: 205,
              baseDamage: 46,
              scaling: 5,
              healRatio: 0.58,
              color: "#ffc2c2",
            });
          },
        },
        {
          key: "R",
          name: "Predator Drive",
          cost: 50,
          cooldown: 12.8,
          desc: "Massiver Damage/Tempo-Buff fuer kurze Zeit.",
          use(caster) {
            return shared.rBuff(caster, {
              buffDuration: 5.2,
              buffDamage: 16,
              buffSpeed: 30,
              color: "#ff9f9f",
            });
          },
        },
      ];
    }

    if (heroClass.id === "crimson_hunter") {
      return [
        {
          key: "Q",
          name: "Rift Rocket",
          cost: 24,
          cooldown: 3.2,
          desc: "Langstreckenrakete in Bewegungsrichtung mit Splash.",
          use(caster) {
            return shared.qRocketForward(caster, {
              speed: 420,
              range: 540,
              radius: 8,
              aoeRadius: 72,
              baseDamage: 52,
              scaling: 7,
              color: "#ff5a5a",
            });
          },
        },
        {
          key: "W",
          name: "Combust Ring",
          cost: 34,
          cooldown: 5.8,
          desc: "Kleiner AoE-Knall um den Jaeger.",
          use(caster) {
            return shared.wBurst(caster, {
              radius: 96,
              baseDamage: 32,
              scaling: 6,
              color: "#ff7e7e",
            });
          },
        },
        {
          key: "E",
          name: "Crimson Mark",
          cost: 28,
          cooldown: 7.2,
          desc: "Drain-Mark mit Heilung.",
          use(caster) {
            return shared.eDrain(caster, {
              range: 205,
              baseDamage: 46,
              scaling: 5,
              healRatio: 0.58,
              color: "#ffc2c2",
            });
          },
        },
        {
          key: "R",
          name: "Predator Drive",
          cost: 50,
          cooldown: 12.8,
          desc: "Massiver Damage/Tempo-Buff fuer kurze Zeit.",
          use(caster) {
            return shared.rBuff(caster, {
              buffDuration: 5.2,
              buffDamage: 16,
              buffSpeed: 30,
              color: "#ff9f9f",
            });
          },
        },
      ];
    }

    if (heroClass.id === "void_templar") {
      return [
        {
          key: "Q",
          name: "Aether Spear",
          cost: 22,
          cooldown: 2.7,
          desc: "Geradliniger Speer auf naechstes Ziel.",
          use(caster) {
            return shared.qBolt(caster, {
              range: 400,
              speed: 360,
              radius: 9,
              baseDamage: 40,
              scaling: 6,
              color: "#8ca0ff",
              kind: "templar-spear",
            });
          },
        },
        {
          key: "W",
          name: "Aegis Pulse",
          cost: 34,
          cooldown: 5.6,
          desc: "Defensive Nova mit mittlerer Reichweite.",
          use(caster) {
            return shared.wBurst(caster, {
              radius: 118,
              baseDamage: 36,
              scaling: 6,
              color: skillColor,
            });
          },
        },
        {
          key: "E",
          name: "Blink Slash",
          cost: 30,
          cooldown: 7.4,
          desc: "Teleport-Slash auf nahes Ziel.",
          use(caster) {
            return shared.eBlinkSlash(caster, {
              range: 220,
              stopDistance: 34,
              baseDamage: 50,
              scaling: 5,
              color: "#d0d8ff",
            });
          },
        },
        {
          key: "R",
          name: "Rail Judgement",
          cost: 52,
          cooldown: 13,
          desc: "Durchdringender Linienstrahl in Blickrichtung.",
          use(caster) {
            return shared.rRailBeam(caster, {
              range: 520,
              width: 36,
              baseDamage: 62,
              scaling: 8,
              color: "#b8c4ff",
            });
          },
        },
      ];
    }

    return [
      {
        key: "Q",
        name: "Emerald Spark",
        cost: 24,
        cooldown: 2.3,
        desc: "Sehr schneller Giftfunke.",
        use(caster) {
          return shared.qBolt(caster, {
            range: 420,
            speed: 450,
            radius: 8,
            baseDamage: 39,
            scaling: 7,
            color: "#53f0bd",
            kind: "oracle-spark",
          });
        },
      },
      {
        key: "W",
        name: "Poison Cloud",
        cost: 38,
        cooldown: 7.5,
        desc: "Bleibende Giftwolke mit DoT.",
        use(caster) {
          return shared.wPoisonCloud(caster, {
            offset: 70,
            radius: 92,
            duration: 4.2,
            tickEvery: 0.55,
            baseDamage: 12,
            scaling: 2.2,
            color: "#70ffca",
          });
        },
      },
      {
        key: "E",
        name: "Vine Drain",
        cost: 30,
        cooldown: 6.8,
        desc: "Langer Sustain-Drain.",
        use(caster) {
          return shared.eDrain(caster, {
            range: 240,
            baseDamage: 42,
            scaling: 6,
            healRatio: 0.64,
            color: "#bbffe8",
          });
        },
      },
      {
        key: "R",
        name: "Verdant Overdrive",
        cost: 48,
        cooldown: 12.2,
        desc: "Caster-Buff fuer Burst und Kiten.",
        use(caster) {
          return shared.rBuff(caster, {
            buffDuration: 5.5,
            buffDamage: 14,
            buffSpeed: 34,
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
