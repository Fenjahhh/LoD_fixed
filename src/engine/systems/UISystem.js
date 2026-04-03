import { xpToNext } from './ProgressionSystem.js';

export class UISystem {
  constructor(engine, uiRefs) {
    this.engine = engine;
    this.ui = uiRefs;
  }

  buildControls(onSkill, onBuy) {
    const { skillsEl, shopEl } = this.ui;
    skillsEl.innerHTML = '';
    for (let i = 0; i < 4; i += 1) {
      const btn = document.createElement('button');
      btn.className = 'skill';
      const trigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSkill(i);
      };
      btn.addEventListener('pointerdown', trigger);
      btn.addEventListener('click', trigger);
      skillsEl.appendChild(btn);
    }

    shopEl.innerHTML = '';
    this.engine.shopItems.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'shopItem';
      const trigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onBuy(i);
      };
      btn.addEventListener('pointerdown', trigger);
      btn.addEventListener('click', trigger);
      shopEl.appendChild(btn);
    });
  }

  update() {
    const { state, combat, shopItems, config } = this.engine;
    const p = state.player;
    const e = state.enemy;
    const ps = combat.heroStats(p);
    const es = combat.heroStats(e);
    const gate = this.engine.structures.getGate(state.level);
    const towersAlive = this.engine.structures.getTowers(state.level).filter((t) => !t.dead).length;
    const levelName = this.engine.getCurrentLevelName();
    const heroClassName = this.engine.getCurrentHeroClassName();

    this.ui.playerHpFill.style.width = (100 * p.hp / ps.maxHp) + '%';
    this.ui.playerManaFill.style.width = (100 * p.mana / ps.maxMana) + '%';
    this.ui.enemyHpFill.style.width = (100 * e.hp / es.maxHp) + '%';
    this.ui.enemyManaFill.style.width = (100 * e.mana / es.maxMana) + '%';

    this.ui.playerText.textContent = `HP ${Math.ceil(p.hp)}/${ps.maxHp} | Mana ${Math.ceil(p.mana)}/${ps.maxMana} | AD ${ps.attackDamage} | SPD ${ps.moveSpeed}`;
    this.ui.enemyText.textContent = `HP ${Math.ceil(e.hp)}/${es.maxHp} | Mana ${Math.ceil(e.mana)}/${es.maxMana} | Modus ${e.retreating ? 'Rückzug' : 'Kampf'}`;

    const levelObjectivePill =
      state.level === 1
        ? `<div class="pill">L1->L2 Ziel <strong>${p.kills} / 5 Kills</strong></div>`
        : state.level === 2
          ? `<div class="pill">L2->L3 Ziel <strong>${p.kills} / 10 Kills</strong></div>`
          : state.level === 3
            ? `<div class="pill">L3->L4 Ziel <strong>${p.kills} / 14 Kills</strong></div>`
            : `<div class="pill">Escort <strong>${Math.round(state.escortPayload?.progress || 0)}%</strong></div>`;

    this.ui.statsEl.innerHTML = `
      <div class="pill">Level <strong>${levelName}</strong></div>
      <div class="pill">Klasse <strong>${heroClassName}</strong></div>
      ${levelObjectivePill}
      <div class="pill">Level <strong>${p.level}</strong></div>
      <div class="pill">XP <strong>${p.exp}</strong> / ${xpToNext(p.level)}</div>
      <div class="pill">Gold <strong>${p.gold}</strong></div>
      <div class="pill">Kills <strong>${p.kills}</strong></div>
      <div class="pill">Tode <strong>${p.deaths}</strong> / ${config.playerDeathLimit}</div>
      <div class="pill">Türme <strong>${towersAlive}</strong> / 2</div>
      <div class="pill">Tor <strong>${gate ? Math.ceil(gate.hp) : 0}</strong> ${gate && gate.vulnerable ? '(offen)' : '(gesperrt)'}</div>
    `;

    const skillButtons = this.ui.skillsEl.querySelectorAll('button');
    skillButtons.forEach((btn, i) => {
      const skill = p.skills[i];
      if (!skill) {
        btn.disabled = true;
        btn.innerHTML = "<div>-</div><small>Keine Skill</small>";
        return;
      }
      btn.disabled = p.dead || skill.cd > 0 || p.mana < skill.cost || !!state.winner;
      btn.innerHTML = `<div>${skill.key} · ${skill.name}</div><small>${skill.cd > 0 ? `CD ${skill.cd.toFixed(1)}s` : `${skill.cost} Mana`}</small>`;
    });

    const shopButtons = this.ui.shopEl.querySelectorAll('button');
    shopButtons.forEach((btn, i) => {
      const item = shopItems[i];
      btn.disabled = p.gold < item.cost || !!state.winner;
      btn.innerHTML = `<div>${item.name} · ${item.cost}g</div><small>${item.desc}</small>`;
    });
  }

  buildHeroSelect(heroClasses, onSelect) {
    if (!this.ui.heroCards) return;
    this.ui.heroCards.innerHTML = "";
    for (const heroClass of heroClasses) {
      const btn = document.createElement("button");
      btn.className = "heroCard";
      btn.style.borderColor = heroClass.colors.main;
      btn.innerHTML = `
        <h4 style="color:${heroClass.colors.main}">${heroClass.name}</h4>
        <p>${heroClass.description}</p>
        <div class="shapePreview">Form: ${heroClass.shape}</div>
      `;
      btn.addEventListener("click", () => onSelect(heroClass.id));
      this.ui.heroCards.appendChild(btn);
    }
  }

  showHeroSelect(show) {
    if (!this.ui.heroSelectOverlay) return;
    this.ui.heroSelectOverlay.classList.toggle("show", !!show);
  }
}
