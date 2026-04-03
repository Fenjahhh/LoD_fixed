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

    Object.assign(this.state, createInitialState());
    const selectedClass = getHeroClassById(this.state.selectedHeroClass);
    this.state.player = createHero("left", { W: this.W, laneY: this.laneY }, selectedClass);
    this.state.enemy = createHero("right", { W: this.W, laneY: this.laneY });
    this.state.level = 1;
    this.state.player.skills = this.skills.makeRuntimeSkillList(0, selectedClass.id);
    this.state.enemy.skills = this.skills.makeRuntimeSkillList(() => rand(0.4, 3.2), selectedClass.id);
    this.structures.setEnabled(this.state.level === 2);
    this.state.structures = this.structures.buildSiegeStructures(this.laneY, this.W);
    this.wave.spawnWave();

    this.uiSystem.buildControls(
      (i) => this.skills.tryCastSkill(this.state.player, i),
      (i) => this.buyItem(i)
    );
    this.uiSystem.update();
    this.showMessage("Signature Siege: gleiche Waves, aktiver Gegner-Daemon, 2 Tuerme + Gate.", 3.2);
    this.openHeroSelect("Waehle deinen Helden fuer Level 1");
    this.state.rafId = requestAnimationFrame((ts) => this.loop(ts));
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
          const tickDamage = zone.baseDamage + zone.source.level * zone.scaling;
          this.combat.damageUnit(unit, tickDamage, zone.source);
          this.effects.burst(unit.x, unit.y, zone.color, 3);
        }
      }
    }
  }

  loop(ts) {
    if (!this.state.lastTs) this.state.lastTs = ts;
    const dt = clamp((ts - this.state.lastTs) / 1000, 0.001, 0.033);
    this.state.lastTs = ts;
    this.update(dt);
    this.render.render();
    this.state.rafId = requestAnimationFrame((nextTs) => this.loop(nextTs));
  }

  mount() {
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
    return this.state.level === 1 ? "Level 1" : "Level 2";
  }

  getCurrentHeroClassName() {
    return getHeroClassById(this.state.selectedHeroClass).name;
  }

  nextLevel() {
    this.state.level = this.state.level === 1 ? 2 : 1;
    this.state.creeps = [];
    this.state.projectiles = [];
    this.state.effects = [];
    this.structures.setEnabled(this.state.level === 2);
    this.state.structures = this.structures.buildSiegeStructures(this.laneY, this.W);
    this.wave.spawnWave();
    this.showMessage(
      this.state.level === 1
        ? "Level 1: Open Lane (ohne Tuerme und Tor)."
        : "Level 2: Signature Siege (mit Tuerme und Tor).",
      2.2
    );
    this.openHeroSelect(`Waehle deinen Helden fuer ${this.getCurrentLevelName()}`);
    this.uiSystem.update();
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
