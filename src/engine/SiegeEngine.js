import { createInitialState } from "./core/state.js";
import { clamp, rand } from "./core/math.js";
import { CONFIG, COLORS } from "./data/config.js";
import { SHOP_ITEMS } from "./data/shopItems.js";
import { HERO_CLASSES, getHeroClassById } from "./data/heroClasses.js";
import { createHero, heroStatsWithItems } from "./entities/Hero.js";
import { createEffectsSystem } from "./systems/EffectsSystem.js";
import { gainGold, gainExp } from "./systems/ProgressionSystem.js";
import { createWaveSystem } from "./systems/WaveSystem.js";
import { createStructureSystem } from "./systems/StructureSystem.js";
import { createTargetingSystem } from "./systems/TargetingSystem.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { MovementSystem } from "./systems/MovementSystem.js";
import { createAISystem } from "./systems/AISystem.js";
import { createSkillsCatalog } from "./systems/SkillsCatalog.js";
import { createInputSystem } from "./systems/InputSystem.js";
import { UISystem } from "./systems/UISystem.js";
import { createRenderSystem } from "./systems/RenderSystem.js";

const LEVEL1_KILLS_TO_ADVANCE = CONFIG.level1KillsToAdvance;
const LEVEL2_KILLS_TO_ADVANCE = CONFIG.level2KillsToAdvance;
const LEVEL3_KILLS_TO_ADVANCE = CONFIG.level3KillsToAdvance;
const LEVEL4_KILLS_TO_ADVANCE = CONFIG.level4KillsToAdvance;

export class SiegeEngine {
  constructor(documentRef) {
    this.document = documentRef;
    this.canvas = documentRef.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.ui = {
      statsEl: documentRef.getElementById("stats"),
      skillsEl: documentRef.getElementById("skills"),
      shopEl: documentRef.getElementById("shop"),
      messageEl: documentRef.getElementById("message"),
      restartBtn: documentRef.getElementById("restartBtn"),
      playerHpFill: documentRef.getElementById("playerHpFill"),
      playerManaFill: documentRef.getElementById("playerManaFill"),
      enemyHpFill: documentRef.getElementById("enemyHpFill"),
      enemyManaFill: documentRef.getElementById("enemyManaFill"),
      playerText: documentRef.getElementById("playerText"),
      enemyText: documentRef.getElementById("enemyText"),
      levelBtn: documentRef.getElementById("levelBtn"),
      heroSelectOverlay: documentRef.getElementById("heroSelect"),
      heroCards: documentRef.getElementById("heroCards"),
      heroSelectTitle: documentRef.querySelector("#heroSelect h3"),
    };
    this.state = createInitialState();
    this.W = 1280;
    this.H = 720;
    this.laneY = 0;
    this.boundGlobalErrorHandlers = false;
    this.isCrashed = false;
    this.math = { clamp, rand, dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) };
    this.config = CONFIG;
    this.colors = COLORS;
    this.shopItems = SHOP_ITEMS;
    this.heroClasses = HERO_CLASSES;

    const world = {
      state: this.state,
      config: this.config,
      colors: this.colors,
      math: this.math,
      ui: this.ui,
      canvas: this.canvas,
      get W() {
        return thisRef.W;
      },
      get H() {
        return thisRef.H;
      },
      get laneY() {
        return thisRef.laneY;
      },
    };
    const thisRef = this;
    this.effects = createEffectsSystem(world);
    this.wave = createWaveSystem(this.state, () => ({ W: this.W, laneY: this.laneY }));
    this.structures = createStructureSystem({
      state: this.state,
      CONFIG: this.config,
      math: this.math,
      targeting: null,
    });
    this.targeting = createTargetingSystem({
      state: this.state,
      config: this.config,
      math: this.math,
      structuresEnabledRef: () => this.state.level === 2,
    });
    this.structures = createStructureSystem({
      state: this.state,
      CONFIG: this.config,
      math: this.math,
      targeting: this.targeting,
    });
    this.combat = new CombatSystem({
      state: this.state,
      effects: {
        ...this.effects,
        showMessage: (text, duration) => this.showMessage(text, duration),
      },
      onCreepDeath: (creep, source) => this.handleCreepDeath(creep, source),
      targeting: this.targeting,
      progression: {
        gainGold: (hero, amount) => gainGold(hero, amount),
        gainExp: (hero, amount) => gainExp(this.state, hero, amount, (text, duration) => this.showMessage(text, duration)),
      },
      math: this.math,
      config: this.config,
      colors: this.colors,
    });
    this.movement = new MovementSystem({
      math: this.math,
      config: this.config,
      get W() {
        return thisRef.W;
      },
      get H() {
        return thisRef.H;
      },
    });
    this.skillsCatalog = createSkillsCatalog({
      state: this.state,
      colors: this.colors,
      targeting: this.targeting,
      effects: this.effects,
      combat: this.combat,
      movement: this.movement,
      math: this.math,
      setCameraShake: (v) => {
        this.state.cameraShake = v;
      },
    });
    this.skills = {
      makeRuntimeSkillList: (cdSeed = 0, heroClassId = HERO_CLASSES[0].id) =>
        this.skillsCatalog.makeSkillSet(heroClassId).map((skill) => ({
          ...skill,
          cd: typeof cdSeed === "function" ? cdSeed() : cdSeed,
        })),
      tryCastSkill: (hero, index) => this.tryCastSkill(hero, index),
    };
    this.ai = createAISystem(
      {
        state: this.state,
        config: this.config,
        math: this.math,
        get W() {
          return thisRef.W;
        },
        get laneY() {
          return thisRef.laneY;
        },
      },
      {
        movement: this.movement,
        targeting: this.targeting,
        skills: this.skills,
        wave: this.wave,
        heroStats: (hero) => heroStatsWithItems(hero),
      }
    );
    this.input = createInputSystem({
      state: this.state,
      canvas: this.canvas,
      config: this.config,
      math: this.math,
      get W() {
        return thisRef.W;
      },
      get H() {
        return thisRef.H;
      },
    });
    this.uiSystem = new UISystem(this, this.ui);
    this.render = createRenderSystem({
      ctx: this.ctx,
      state: this.state,
      colors: this.colors,
      config: this.config,
      math: this.math,
      targeting: this.targeting,
      progression: { heroStats: heroStatsWithItems },
      structureSystem: this.structures,
      uiSystem: this.uiSystem,
      get W() {
        return thisRef.W;
      },
      get H() {
        return thisRef.H;
      },
      get laneY() {
        return thisRef.laneY;
      },
    });
  }

  resize() {
    const rect = this.document.getElementById("gameWrap").getBoundingClientRect();
    this.canvas.width = Math.max(640, Math.floor(rect.width * devicePixelRatio));
    this.canvas.height = Math.max(360, Math.floor(rect.height * devicePixelRatio));
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    this.laneY = this.H * 0.52;
  }

  init() {
    this.resize();
    if (this.state.rafId) cancelAnimationFrame(this.state.rafId);
    this.isCrashed = false;
    this.resetMatchToLevel(1, {
      message: "Signature Siege: gleiche Waves, aktiver Gegner-Daemon, 2 Tuerme + Gate.",
      showHeroSelect: true,
    });
    this.state.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  resetMatchToLevel(level, options = {}) {
    const selectedClassId = this.state.selectedHeroClass || HERO_CLASSES[0].id;
    Object.assign(this.state, createInitialState());
    this.state.level = level;
    this.state.selectedHeroClass = selectedClassId;
    this.state.mapHazards = [];
    this.state.forceFields = [];
    this.state.escortPayload = null;
    this.state.relics = [];
    this.state.soulCoins = [];
    this.state.relicSpawnTimer = 0;
    this.state.levelMode = null;
    this.state.escortObjective = null;
    const selectedClass = getHeroClassById(this.state.selectedHeroClass);
    this.state.player = createHero("left", { W: this.W, laneY: this.laneY }, selectedClass);
    this.state.enemy = createHero("right", { W: this.W, laneY: this.laneY });
    this.state.player.skills = this.skills.makeRuntimeSkillList(0, selectedClass.id);
    this.state.enemy.skills = this.skills.makeRuntimeSkillList(() => rand(0.4, 3.2), selectedClass.id);
    this.structures.setEnabled(level === 2);
    this.state.structures = this.structures.buildSiegeStructures(this.laneY, this.W);
    this.wave.spawnWave();
    if (level === 3) {
      this.state.mapHazards = this.createLevel3MapHazards();
      this.state.forceFields = this.createLevel3ForceFields();
    }
    if (level === 4) {
      this.state.escortPayload = this.createEscortPayload();
      this.state.escortObjective = this.state.escortPayload;
      this.state.levelMode = "escort";
    }
    if (level === 5) {
      this.state.levelMode = "relic-hunt";
      this.state.relicSpawnTimer = CONFIG.relicSpawnEvery * 0.5;
      this.spawnRelicDrop();
      this.spawnRelicDrop();
    }
    this.uiSystem.buildControls(
      (i) => this.skills.tryCastSkill(this.state.player, i),
      (i) => this.buyItem(i)
    );
    this.uiSystem.update();
    if (options.message) this.showMessage(options.message, 2.8);
    if (options.showHeroSelect) {
      this.openHeroSelect(`Waehle deinen Helden fuer ${this.getCurrentLevelName()}`);
    }
  }

  buyItem(index) {
    const item = SHOP_ITEMS[index];
    const hero = this.state.player;
    if (!item) return;
    if (hero.gold < item.cost) {
      this.showMessage(`Nicht genug Gold fuer ${item.name}`, 1.2);
      return;
    }
    hero.gold -= item.cost;
    hero.items.push(item);
    this.showMessage(`${item.name} gekauft (-${item.cost} Gold)`, 1.1);
  }

  showMessage(text, duration = 2.2) {
    this.state.message = text;
    this.state.uiMessageTimer = duration;
    this.ui.messageEl.textContent = text;
    this.ui.messageEl.classList.add("show");
  }

  handleCrash(error, context = "runtime") {
    if (this.isCrashed) return;
    this.isCrashed = true;
    this.state.crashed = true;
    this.state.crashInfo = {
      context,
      message: error?.message || String(error) || "Unknown error",
      at: Date.now(),
    };
    if (this.state.rafId) {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = 0;
    }
    this.state.winner = "error";
    this.showMessage("Crash erkannt. Bitte auf Neustart klicken.", 999);
    try {
      console.error("[SiegeEngine CrashGuard]", context, error);
    } catch (_) {}
  }

  tryCastSkill(hero, index) {
    const skill = hero.skills[index];
    if (!skill || skill.cd > 0 || hero.dead) return false;
    if (hero.mana < skill.cost) return false;
    const success = skill.use(hero);
    if (success) {
      hero.mana -= skill.cost;
      skill.cd = skill.cooldown;
    }
    return success;
  }

  updateHero(hero, dt, isPlayerControlled) {
    if (hero.dead) {
      hero.respawnTimer -= dt;
      if (hero.respawnTimer <= 0) {
        hero.dead = false;
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.x = hero.side === 'left' ? 170 : this.W - 300;
        hero.y = this.laneY;
        hero.moveTargetX = hero.x;
        hero.moveTargetY = hero.y;
        hero.retreating = false;
      }
      return;
    }

    const stats = heroStatsWithItems(hero);
    if (hero.buff) {
      hero.buff.timer -= dt;
      if (hero.buff.timer <= 0) hero.buff = null;
    }

    const buffDamage = hero.buff ? hero.buff.damage : 0;
    const buffSpeed = hero.buff ? hero.buff.speed : 0;
    const finalMoveSpeed = stats.moveSpeed + buffSpeed;
    hero.mana = clamp(hero.mana + stats.manaRegen * dt, 0, stats.maxMana);
    hero.attackCd = Math.max(0, hero.attackCd - dt);
    for (const s of hero.skills) s.cd = Math.max(0, s.cd - dt);

    if (isPlayerControlled) {
      if (this.state.input.moving) {
        hero.moveTargetX = this.state.input.mouseX;
        hero.moveTargetY = this.state.input.mouseY;
      }
      this.movement.moveHeroTowards(hero, hero.moveTargetX, hero.moveTargetY, finalMoveSpeed, dt);
    } else {
      this.ai.updateEnemyAI(hero, dt);
    }

    this.movement.keepUnitInArena(hero);
    const target = this.targeting.findNearestTarget(hero, hero.attackRange + 6, false);
    if (target) this.movement.faceTowards(hero, target.x, target.y);
    if (target && hero.attackCd <= 0) {
      hero.attackCd = hero.attackSpeed;
      const rangedAutoAttack = hero.side === "left";
      if (rangedAutoAttack) {
        this.state.projectiles.push({
          from: hero,
          target,
          x: hero.x,
          y: hero.y,
          speed: hero.autoShotSpeed || 170,
          radius: hero.autoShotRadius || 5,
          damage: stats.attackDamage + buffDamage,
          color: hero.autoAttackColor || "#ff3a3a",
          trailColor: hero.autoAttackTrailColor || "#ff8f8f",
          kind: "auto-shot",
          trail: [],
        });
      } else {
        this.combat.damageUnit(target, stats.attackDamage + buffDamage, hero);
      }
    }
  }

  updateCreep(creep, dt) {
    if (creep.dead) return;
    creep.attackCd = Math.max(0, creep.attackCd - dt);
    const target = this.targeting.findNearestTarget(creep, creep.range + 5, false);

    const distanceToTarget = target ? this.math.dist(creep, target) : Infinity;
    if (target && distanceToTarget <= creep.range + 5 && creep.attackCd <= 0) {
      creep.attackCd = creep.attackSpeed;
      if (creep.role === 'ranged') {
        this.state.projectiles.push({
          from: creep,
          target,
          x: creep.x,
          y: creep.y,
          speed: 220,
          radius: 5,
          damage: creep.damage,
          color: creep.side === 'left' ? COLORS.ally2 : COLORS.enemy2,
          kind: 'arrow',
          trail: []
        });
      } else {
        this.combat.damageUnit(target, creep.damage, creep);
      }
    }

    if (!target || distanceToTarget > creep.range) {
      const dir = creep.side === 'left' ? 1 : -1;
      creep.x += dir * creep.speed * dt;
      creep.y += (this.laneY - creep.y) * dt * 1.4;
    }

    const gate = this.structures.getGate(this.state.level);
    if (gate && !gate.dead && !gate.vulnerable && creep.side === 'left') {
      creep.x = Math.min(creep.x, gate.x - CONFIG.gateMinSiegeX);
    }
    this.movement.keepUnitInArena(creep);
  }

  update(dt) {
    if (this.state.winner) return;
    if (this.state.heroSelectOpen) {
      this.uiSystem.update();
      return;
    }

    this.state.time += dt;
    this.state.spawnTimer += dt;
    if (this.state.spawnTimer >= CONFIG.creepSpawnEvery) {
      this.state.spawnTimer = 0;
      this.wave.spawnWave();
      this.showMessage("Neue symmetrische Wave!", 0.9);
    }

    this.updateHero(this.state.player, dt, true);
    this.updateHero(this.state.enemy, dt, false);
    for (const creep of this.state.creeps) this.updateCreep(creep, dt);
    this.state.creeps = this.state.creeps.filter((c) => !c.dead || c.hp > 0);

    this.structures.updateStructures(dt, this.W);
    this.combat.updateProjectiles(dt);
    this.updateSkillZones(dt);
    this.updateMapHazards(dt);
    this.updateForceFields(dt);
    this.updateEscortPayload(dt);
    this.updateRelicMode(dt);
    this.effects.update(dt);

    if (this.structures.isGateVulnerable(this.state.level) && !this.state.gateWasVulnerable) {
      this.state.gateWasVulnerable = true;
      this.showMessage("Tor ist jetzt angreifbar!", 1.6);
    }

    if (this.state.uiMessageTimer > 0) {
      this.state.uiMessageTimer -= dt;
      if (this.state.uiMessageTimer <= 0) this.ui.messageEl.classList.remove('show');
    }

    if (this.state.cameraShake > 0) {
      this.state.cameraShake = Math.max(0, this.state.cameraShake - dt * 12);
    }

    if (!this.state.winner && this.state.player.deaths >= CONFIG.playerDeathLimit) {
      this.state.winner = 'enemy';
      this.showMessage("Niederlage! Zu viele Tode, Gegner haelt die Festung.", 999);
    }

    if (this.state.level === 1 && this.state.player.kills >= LEVEL1_KILLS_TO_ADVANCE) {
      this.resetMatchToLevel(2, {
        message: "Level 2 freigeschaltet! Siege startet mit komplettem Reset.",
        showHeroSelect: true,
      });
      return;
    }
    if (this.state.level === 2 && this.state.player.kills >= LEVEL2_KILLS_TO_ADVANCE) {
      this.resetMatchToLevel(3, {
        message: "Level 3: Hazard Arena! Loecher und Magnetfelder sind aktiv.",
        showHeroSelect: true,
      });
      return;
    }
    if (this.state.level === 3 && this.state.player.kills >= LEVEL3_KILLS_TO_ADVANCE) {
      this.resetMatchToLevel(4, {
        message: "Level 4: Escort! Beschuetze die Payload bis zur Festung.",
        showHeroSelect: true,
      });
      return;
    }
    if (this.state.level === 4 && this.state.player.kills >= LEVEL4_KILLS_TO_ADVANCE) {
      this.resetMatchToLevel(5, {
        message: "Level 5: Relic Hunt! Sammle Relics und Soul Coins.",
        showHeroSelect: true,
      });
      return;
    }

    this.uiSystem.update();
  }

  updateSkillZones(dt) {
    if (!this.state.skillHazards || this.state.skillHazards.length === 0) return;
    for (let i = this.state.skillHazards.length - 1; i >= 0; i -= 1) {
      const zone = this.state.skillHazards[i];
      zone.duration -= dt;
      if (zone.duration <= 0) {
        this.state.skillHazards.splice(i, 1);
        continue;
      }
      zone.tickTimer -= dt;
      if (zone.tickTimer > 0) continue;
      zone.tickTimer = zone.tickEvery;

      const enemies = this.targeting.getOpposingUnits(zone.side, true, zone.source);
      for (const unit of enemies) {
        if (unit.dead) continue;
        if (this.math.dist(zone, unit) <= zone.radius) {
          if (zone.kind === "void-hole" || zone.instaKill) {
            this.combat.damageUnit(unit, 99999, zone.source || { type: "hazard", side: "neutral" });
            this.effects.burst(unit.x, unit.y, zone.color, 6);
          } else {
            const tickDamage = zone.baseDamage + zone.source.level * zone.scaling;
            this.combat.damageUnit(unit, tickDamage, zone.source);
            this.effects.burst(unit.x, unit.y, zone.color, 3);
          }
        }
      }
    }
  }

  createLevel3MapHazards() {
    const centerX = this.W * 0.55;
    const centerY = this.laneY;
    const offset = Math.min(150, this.W * 0.12);
    return [
      {
        id: "pit-a",
        kind: "void-pit",
        x: centerX - offset,
        y: centerY - 58,
        radius: 34,
        pulse: 0,
      },
      {
        id: "pit-b",
        kind: "void-pit",
        x: centerX + offset,
        y: centerY + 62,
        radius: 34,
        pulse: 1.7,
      },
    ];
  }

  createLevel3ForceFields() {
    return [
      {
        id: "mag-top",
        x: this.W * 0.46,
        y: this.laneY - 86,
        radius: 95,
        strength: 62,
      },
      {
        id: "mag-bottom",
        x: this.W * 0.64,
        y: this.laneY + 92,
        radius: 95,
        strength: 62,
      },
    ];
  }

  updateMapHazards(dt) {
    if (this.state.level !== 3 || !this.state.mapHazards?.length) return;
    for (const hazard of this.state.mapHazards) {
      hazard.pulse += dt;
      const units = [];
      if (this.state.player && !this.state.player.dead) units.push(this.state.player);
      if (this.state.enemy && !this.state.enemy.dead) units.push(this.state.enemy);
      for (const creep of this.state.creeps) if (!creep.dead) units.push(creep);
      for (const unit of units) {
        if (unit.type === "structure") continue;
        if (this.math.dist(unit, hazard) <= hazard.radius) {
          this.combat.damageUnit(unit, 9999, { type: "hazard", side: "neutral" });
          this.effects.burst(unit.x, unit.y, "#a67cff", 16);
        }
      }
    }
  }

  updateForceFields(dt) {
    if (this.state.level !== 3 || !this.state.forceFields?.length) return;
    const dynamicUnits = [];
    if (this.state.player && !this.state.player.dead) dynamicUnits.push(this.state.player);
    if (this.state.enemy && !this.state.enemy.dead) dynamicUnits.push(this.state.enemy);
    for (const creep of this.state.creeps) if (!creep.dead) dynamicUnits.push(creep);

    for (const unit of dynamicUnits) {
      for (const field of this.state.forceFields) {
        const dx = field.x - unit.x;
        const dy = field.y - unit.y;
        const d = Math.hypot(dx, dy);
        if (d > field.radius || d < 1) continue;
        const falloff = 1 - d / field.radius;
        const step = field.strength * falloff * dt;
        unit.x += (dx / d) * step;
        unit.y += (dy / d) * step;
      }
      this.movement.keepUnitInArena(unit);
    }
  }

  createEscortPayload() {
    return {
      type: "escort-payload",
      x: 220,
      y: this.laneY,
      radius: 22,
      hp: CONFIG.escortPayloadHp,
      maxHp: CONFIG.escortPayloadHp,
      progress: 0,
      targetX: this.W - CONFIG.gateXFromRight - 18,
      speed: CONFIG.escortPayloadBaseSpeed,
      dead: false,
    };
  }

  updateEscortPayload(dt) {
    if (this.state.level !== 4) return;
    const payload = this.state.escortPayload;
    if (!payload || payload.dead) return;

    payload.targetX = this.W - CONFIG.gateXFromRight - 18;
    const allies = [];
    if (this.state.player && !this.state.player.dead) allies.push(this.state.player);
    for (const creep of this.state.creeps) {
      if (!creep.dead && creep.side === "left") allies.push(creep);
    }
    const enemies = [];
    if (this.state.enemy && !this.state.enemy.dead) enemies.push(this.state.enemy);
    for (const creep of this.state.creeps) {
      if (!creep.dead && creep.side === "right") enemies.push(creep);
    }

    let allyInfluence = 0;
    let enemyInfluence = 0;
    for (const unit of allies) {
      if (this.math.dist(unit, payload) <= CONFIG.escortInfluenceRadius) allyInfluence += unit.type === "hero" ? 3 : 1;
    }
    for (const unit of enemies) {
      if (this.math.dist(unit, payload) <= CONFIG.escortInfluenceRadius) enemyInfluence += unit.type === "hero" ? 3 : 1;
    }

    const net = allyInfluence - enemyInfluence;
    const moveFactor = Math.max(-0.4, Math.min(1.8, net * 0.16));
    payload.x += payload.speed * moveFactor * dt;
    payload.x = Math.max(CONFIG.arenaPadding + 70, Math.min(payload.targetX, payload.x));
    payload.y += (this.laneY - payload.y) * dt * 2.3;
    payload.progress = (payload.x - (CONFIG.arenaPadding + 70)) / Math.max(1, payload.targetX - (CONFIG.arenaPadding + 70));

    if (enemyInfluence > allyInfluence) {
      payload.hp -= (enemyInfluence - allyInfluence) * CONFIG.escortPayloadDpsFactor * dt;
      payload.hp = Math.max(0, payload.hp);
    } else if (allyInfluence > enemyInfluence) {
      payload.hp = Math.min(payload.maxHp, payload.hp + (allyInfluence - enemyInfluence) * 6 * dt);
    }
    const enemyUnits = this.targeting.getOpposingUnits("left", false, null);
    for (const unit of enemyUnits) {
      if (unit.dead) continue;
      if (this.math.dist(unit, payload) <= payload.radius + 22) {
        payload.hp -= (unit.type === "hero" ? 18 : 9) * dt;
      }
    }
    payload.hp = Math.max(0, payload.hp);

    if (payload.hp <= 0) {
      payload.dead = true;
      this.state.winner = "enemy";
      this.showMessage("Escort gescheitert! Payload wurde zerstoert.", 999);
      return;
    }
    if (payload.x >= payload.targetX - 1) {
      this.state.winner = "player";
      this.showMessage("Escort erfolgreich! Payload hat das Ziel erreicht.", 999);
    }
  }

  handleCreepDeath(creep, source) {
    if (this.state.level !== 5) return;
    const deny = !!(source && source.type === "hero" && source.side === creep.side);
    const value = deny ? 2 : 1;
    this.state.soulCoins.push({
      id: `coin-${Date.now()}-${Math.floor(this.math.rand(0, 99999))}`,
      x: creep.x,
      y: creep.y,
      radius: 9,
      value,
      bonus: deny,
      ttl: CONFIG.soulCoinLifetime,
      pulse: this.math.rand(0, Math.PI * 2),
    });
    if (deny && source === this.state.player) {
      this.showMessage("Deny! Bonus Soul Coin gespawnt.", 1.1);
    }
  }

  spawnRelicDrop() {
    const relicTypes = [
      { kind: "fan_shard", name: "Fan Shard", color: "#ff9f7a" },
      { kind: "force_core", name: "Force Core", color: "#86c9ff" },
      { kind: "toxin_idol", name: "Toxin Idol", color: "#79ffca" },
      { kind: "spike_shell", name: "Spike Shell", color: "#e8d3ff" },
    ];
    const relic = relicTypes[Math.floor(this.math.rand(0, relicTypes.length))];
    const x = this.math.rand(CONFIG.arenaPadding + 120, this.W - CONFIG.arenaPadding - 120);
    const y = this.math.rand(this.laneY - 180, this.laneY + 180);
    this.state.relics.push({
      id: `relic-${Date.now()}-${Math.floor(this.math.rand(0, 99999))}`,
      ...relic,
      x,
      y,
      radius: 13,
      ttl: 20,
      pulse: this.math.rand(0, Math.PI * 2),
    });
  }

  applyRelicToHero(hero, relic) {
    hero.relics = hero.relics || [];
    hero.relicMods = hero.relicMods || { tripleShot: false, bonusPush: 0, cloudSize: 1, spikes: false };
    hero.relics.push(relic.kind);
    if (relic.kind === "fan_shard") hero.relicMods.tripleShot = true;
    if (relic.kind === "force_core") hero.relicMods.bonusPush += 22;
    if (relic.kind === "toxin_idol") hero.relicMods.cloudSize = Math.min(2.2, hero.relicMods.cloudSize + 0.35);
    if (relic.kind === "spike_shell") hero.relicMods.spikes = true;
    if (hero === this.state.player) {
      this.showMessage(`Relic erhalten: ${relic.name}`, 1.1);
    }
  }

  updateRelicMode(dt) {
    if (this.state.level !== 5) return;
    this.state.relicSpawnTimer += dt;
    if (this.state.relicSpawnTimer >= CONFIG.relicSpawnEvery) {
      this.state.relicSpawnTimer = 0;
      if (this.state.relics.length < CONFIG.relicMaxOnMap) {
        this.spawnRelicDrop();
      }
    }

    const heroes = [this.state.player, this.state.enemy].filter((h) => h && !h.dead);
    for (let i = this.state.relics.length - 1; i >= 0; i -= 1) {
      const relic = this.state.relics[i];
      relic.ttl -= dt;
      relic.pulse += dt * 2.1;
      if (relic.ttl <= 0) {
        this.state.relics.splice(i, 1);
        continue;
      }
      let picked = false;
      for (const hero of heroes) {
        if (this.math.dist(hero, relic) <= hero.radius + relic.radius + 4) {
          this.applyRelicToHero(hero, relic);
          picked = true;
          break;
        }
      }
      if (picked) this.state.relics.splice(i, 1);
    }

    for (let i = this.state.soulCoins.length - 1; i >= 0; i -= 1) {
      const coin = this.state.soulCoins[i];
      coin.ttl -= dt;
      coin.pulse += dt * 4;
      if (coin.ttl <= 0) {
        this.state.soulCoins.splice(i, 1);
        continue;
      }
      let collected = false;
      for (const hero of heroes) {
        if (this.math.dist(hero, coin) <= hero.radius + coin.radius + 3) {
          hero.soulCoins = (hero.soulCoins || 0) + coin.value;
          if (hero === this.state.player) this.showMessage(`+${coin.value} Soul Coin`, 0.8);
          collected = true;
          break;
        }
      }
      if (collected) this.state.soulCoins.splice(i, 1);
    }

    if (!this.state.winner && (this.state.player.soulCoins || 0) >= CONFIG.level5SoulCoinsToWin) {
      this.state.winner = "player";
      this.showMessage("Relic Hunt gewonnen! Soul-Ziel erreicht.", 999);
      return;
    }
    if (!this.state.winner && (this.state.enemy.soulCoins || 0) >= CONFIG.level5SoulCoinsToWin) {
      this.state.winner = "enemy";
      this.showMessage("Relic Hunt verloren! Gegner hat genug Soul Coins.", 999);
    }
  }

  loop(ts) {
    if (this.isCrashed || this.state.crashed) return;
    try {
      if (!this.state.lastTs) this.state.lastTs = ts;
      const dt = clamp((ts - this.state.lastTs) / 1000, 0.001, 0.033);
      this.state.lastTs = ts;
      this.update(dt);
      this.render.render();
      this.state.rafId = requestAnimationFrame((nextTs) => this.loop(nextTs));
    } catch (error) {
      this.handleCrash(error, "game-loop");
    }
  }

  bindCrashGuards() {
    if (this.boundGlobalErrorHandlers) return;
    this.boundGlobalErrorHandlers = true;
    window.addEventListener("error", (event) => {
      this.handleCrash(event.error || new Error(event.message || "Script error"), "window-error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      this.handleCrash(event.reason || new Error("Unhandled promise rejection"), "promise-rejection");
    });
  }

  mount() {
    this.bindCrashGuards();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if (!this.state.player) return;
      const index = this.state.player.skills.findIndex((s) => s.key === key);
      if (index >= 0) this.skills.tryCastSkill(this.state.player, index);
    });
    this.ui.restartBtn.addEventListener('click', () => this.init());
    if (this.ui.levelBtn) {
      this.ui.levelBtn.addEventListener("click", () => this.nextLevel());
    }
    this.input.attach();
    this.init();
  }

  getCurrentLevelName() {
    if (this.state.level === 1) return "Level 1";
    if (this.state.level === 2) return "Level 2";
    if (this.state.level === 3) return "Level 3";
    if (this.state.level === 4) return "Level 4";
    return "Level 5";
  }

  getCurrentHeroClassName() {
    return getHeroClassById(this.state.selectedHeroClass).name;
  }

  nextLevel() {
    const next = this.state.level >= 5 ? 1 : this.state.level + 1;
    const msg =
      next === 1
        ? "Level 1: Open Lane (ohne Tuerme und Tor)."
        : next === 2
          ? "Level 2: Signature Siege (mit Tuerme und Tor)."
          : next === 3
            ? "Level 3: Hazard Arena mit Loechern und Magnetfeldern."
            : next === 4
              ? "Level 4: Escort! Beschuetze die Payload."
              : "Level 5: Relic Hunt mit Soul Coins und Relics.";
    this.resetMatchToLevel(next, { message: msg, showHeroSelect: true });
  }

  applyHeroClass(classId) {
    const currentClass = getHeroClassById(classId);
    if (!currentClass || !this.state.player) return;
    this.state.selectedHeroClass = currentClass.id;
    const newHero = createHero("left", { W: this.W, laneY: this.laneY }, currentClass);
    const old = this.state.player;
    newHero.level = old.level;
    newHero.exp = old.exp;
    newHero.gold = old.gold;
    newHero.kills = old.kills;
    newHero.deaths = old.deaths;
    newHero.items = old.items;
    newHero.x = old.x;
    newHero.y = old.y;
    newHero.moveTargetX = old.moveTargetX;
    newHero.moveTargetY = old.moveTargetY;
    newHero.dead = old.dead;
    newHero.respawnTimer = old.respawnTimer;
    newHero.buff = old.buff;
    newHero.soulCoins = old.soulCoins || 0;
    newHero.relics = [...(old.relics || [])];
    newHero.relicMods = {
      tripleShot: !!old.relicMods?.tripleShot,
      bonusPush: old.relicMods?.bonusPush || 0,
      cloudSize: old.relicMods?.cloudSize || 1,
      spikes: !!old.relicMods?.spikes,
    };
    newHero.hp = Math.min(newHero.maxHp, old.hp);
    newHero.mana = Math.min(newHero.maxMana, old.mana);
    newHero.skills = this.skills.makeRuntimeSkillList(0, currentClass.id);
    this.state.player = newHero;

    this.uiSystem.buildControls(
      (i) => this.skills.tryCastSkill(this.state.player, i),
      (i) => this.buyItem(i)
    );
    this.uiSystem.update();
    this.showMessage(`${currentClass.name} ausgewaehlt`, 1.4);
  }

  openHeroSelect(title) {
    const overlay = this.ui.heroSelectOverlay;
    const cards = this.ui.heroCards;
    if (!overlay || !cards) return;
    this.state.heroSelectOpen = true;
    if (this.ui.heroSelectTitle) this.ui.heroSelectTitle.textContent = title;
    cards.innerHTML = "";
    this.uiSystem.buildHeroSelect(this.heroClasses, (heroClassId) => {
      this.applyHeroClass(heroClassId);
      this.closeHeroSelect();
    });
    overlay.classList.add("show");
  }

  closeHeroSelect() {
    const overlay = this.ui.heroSelectOverlay;
    if (!overlay) return;
    this.state.heroSelectOpen = false;
    overlay.classList.remove("show");
  }
}
