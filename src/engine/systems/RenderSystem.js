export function createRenderSystem(world) {
  const {
    ctx,
    state,
    colors,
    config,
    math,
    targeting,
    progression,
    structureSystem,
    uiSystem,
  } = world;

  function drawArena() {
    const W = world.W;
    const H = world.H;
    const laneY = world.laneY;
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#171d30';
    ctx.fillRect(config.arenaPadding, config.arenaPadding, W - config.arenaPadding * 2, H - config.arenaPadding * 2);

    if (state.level === 2) {
      const defenseX = W - config.defenseZoneFromRight;
      ctx.fillStyle = 'rgba(146, 143, 200, 0.12)';
      ctx.fillRect(defenseX, config.arenaPadding, W - defenseX - config.arenaPadding, H - config.arenaPadding * 2);

      const gate = structureSystem.getGate();
      if (gate && !gate.dead) {
        const innerStart = gate.x - config.gateMinSiegeX;
        ctx.fillStyle = gate.vulnerable ? 'rgba(130, 232, 165, 0.12)' : 'rgba(140, 120, 180, 0.12)';
        ctx.fillRect(innerStart, config.arenaPadding, W - innerStart - config.arenaPadding, H - config.arenaPadding * 2);
      }
    }

    ctx.strokeStyle = '#334060';
    ctx.lineWidth = 4;
    ctx.strokeRect(config.arenaPadding, config.arenaPadding, W - config.arenaPadding * 2, H - config.arenaPadding * 2);

    ctx.strokeStyle = colors.bgLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(config.arenaPadding, laneY);
    ctx.lineTo(W - config.arenaPadding, laneY);
    ctx.stroke();

    ctx.setLineDash([16, 14]);
    ctx.strokeStyle = '#485373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, config.arenaPadding);
    ctx.lineTo(W / 2, H - config.arenaPadding);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.level === 2) {
      for (const tower of structureSystem.getTowers()) {
        if (tower.dead) continue;
        ctx.strokeStyle = 'rgba(255, 199, 134, 0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, config.towerRange, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawStructure(structure) {
    if (structure.dead) return;
    if (structure.kind === 'tower') {
      ctx.fillStyle = '#273552';
      ctx.fillRect(structure.x - 18, structure.y - 24, 36, 48);
      ctx.fillStyle = colors.tower;
      ctx.fillRect(structure.x - 10, structure.y - 16, 20, 32);
    } else {
      const gateTop = structure.y - 105;
      const gateHeight = 210;
      ctx.fillStyle = structure.vulnerable ? colors.gate : colors.gateLocked;
      ctx.fillRect(structure.x - 16, gateTop, 32, gateHeight);
      ctx.fillStyle = '#dbd5ff';
      for (let i = 0; i < 6; i += 1) {
        ctx.fillRect(structure.x - 12, gateTop + 16 + i * 30, 24, 6);
      }
    }

    const hpPct = math.clamp(structure.hp / structure.maxHp, 0, 1);
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(structure.x - 24, structure.y - 34, 48, 6);
    ctx.fillStyle = structure.kind === 'gate' ? (structure.vulnerable ? '#89ff99' : '#8f86b8') : '#9ed5ff';
    ctx.fillRect(structure.x - 24, structure.y - 34, 48 * hpPct, 6);
  }

  function drawHeroByClass(unit, main, accent) {
    const cls = unit.classId || "crimson_hunter";
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.facing);

    if (cls === "emerald_oracle") {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(8, -3, 10, 6);
      ctx.beginPath();
      ctx.arc(-3, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (cls === "void_templar") {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(0, -12);
      ctx.lineTo(-15, 0);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(-7, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-14, -14);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-14, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawUnit(unit) {
    if (unit.dead && unit.type !== 'hero') return;
    if (unit.type === 'hero' && unit.dead) ctx.globalAlpha = 0.25;

    const isLeft = unit.side === 'left';
    const main = unit.visualMain || (isLeft ? colors.ally : colors.enemy);
    const accent = unit.visualAccent || (isLeft ? '#dffcf7' : '#ffe2e2');

    if (unit.type === 'hero') {
      drawHeroByClass(unit, main, accent);
      if (unit.buff) {
        ctx.strokeStyle = colors.overdrive;
        ctx.lineWidth = 3;
        ctx.strokeRect(unit.x - 22, unit.y - 22, 44, 44);
      }
    } else {
      if (unit.role === 'melee') {
        ctx.fillStyle = main;
        ctx.fillRect(unit.x - 11, unit.y - 11, 22, 22);
        ctx.fillStyle = accent;
        ctx.fillRect(unit.x - 5, unit.y - 5, 10, 10);
      } else {
        ctx.fillStyle = main;
        ctx.fillRect(unit.x - 9, unit.y - 9, 18, 18);
        ctx.fillStyle = accent;
        ctx.fillRect(unit.x - 3, unit.y - 13, 6, 26);
      }
    }

    const maxHp = unit.type === 'hero' ? progression.heroStats(unit).maxHp : unit.maxHp;
    const hpPct = math.clamp(unit.hp / maxHp, 0, 1);
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(unit.x - 18, unit.y - 28, 36, 5);
    ctx.fillStyle = '#7cff90';
    ctx.fillRect(unit.x - 18, unit.y - 28, 36 * hpPct, 5);
    ctx.globalAlpha = 1;
  }

  function drawProjectiles() {
    for (const p of state.projectiles) {
      if (p.trail) {
        for (const t of p.trail) {
          ctx.globalAlpha = Math.max(0, t.life / 0.18) * 0.45;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(2, p.radius - 2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (p.kind === "rocket-shot" || p.kind === "rocket-forward") {
        ctx.save();
        ctx.translate(p.x, p.y);
        const rot = Math.atan2(p.vy || 0, p.vx || 1);
        ctx.rotate(rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-9, -3, 18, 6);
        ctx.fillStyle = "#ffe9cf";
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(4, -5);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
      ctx.fill();

      const isPlayerAuto = p.kind === "auto-shot" && p.from && p.from.side === "left";
      const stroke = isPlayerAuto ? (p.trailColor || "#ff1f1f") : "#ffffff";
      ctx.strokeStyle = stroke;
      ctx.lineWidth = isPlayerAuto ? 2.5 : 1.5;
      ctx.stroke();

      if (isPlayerAuto) {
        // Extra glow makes the player's base attack unmistakably visible.
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = p.trailColor || "#ff8f8f";
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawEffects() {
    for (const e of state.effects) {
      const alpha = 1 - e.t / e.life;
      ctx.globalAlpha = alpha;

      if (e.kind === 'beam') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
      } else if (e.kind === 'ring') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === 'poison-cloud') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c7ffd8";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (e.kind === 'text') {
        ctx.fillStyle = e.color;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(String(e.text), e.x, e.y);
      } else {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.size, e.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawHUDMarkers() {
    const W = world.W;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('MID CONTROL', 30, 36);
    const textWidth = ctx.measureText('FORTRESS FRONT').width;
    ctx.fillText('FORTRESS FRONT', W - textWidth - 30, 36);
  }

  function render() {
    ctx.save();
    if (state.cameraShake > 0) {
      ctx.translate(math.rand(-state.cameraShake, state.cameraShake), math.rand(-state.cameraShake, state.cameraShake));
    }

    drawArena();
    drawProjectiles();
    drawEffects();
    if (state.level === 2) {
      for (const structure of state.structures) drawStructure(structure);
    }
    drawUnit(state.player);
    drawUnit(state.enemy);
    for (const creep of state.creeps) drawUnit(creep);
    drawHUDMarkers();
    ctx.restore();
  }

  return { render };
}
