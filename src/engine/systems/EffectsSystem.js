export function createEffectsSystem({ state, math }) {
  let messageEl = null;

  function bindMessageEl(el) {
    messageEl = el;
  }

  function showMessage(text, duration = 2.2) {
    state.message = text;
    state.uiMessageTimer = duration;
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.add("show");
  }

  function beam(x1, y1, x2, y2, color) {
    state.effects.push({
      kind: "beam",
      x1,
      y1,
      x2,
      y2,
      color,
      life: 0.18,
      t: 0,
    });
  }

  function ring(x, y, radius, color, life = 0.28) {
    state.effects.push({
      kind: "ring",
      x,
      y,
      radius,
      color,
      life,
      t: 0,
    });
  }

  function burst(x, y, color, count, number = null) {
    for (let i = 0; i < count; i += 1) {
      state.effects.push({
        kind: "particle",
        x,
        y,
        vx: math.rand(-45, 45),
        vy: math.rand(-60, 30),
        life: math.rand(0.25, 0.6),
        t: 0,
        color,
        size: math.rand(2, 4),
      });
    }
    if (number !== null) {
      state.effects.push({
        kind: "text",
        x,
        y: y - 14,
        vy: -30,
        life: 0.7,
        t: 0,
        text: Math.round(number),
        color: "#ffffff",
      });
    }
  }

  function update(dt) {
    for (let i = state.effects.length - 1; i >= 0; i -= 1) {
      const e = state.effects[i];
      e.t += dt;
      if (e.t >= e.life) {
        state.effects.splice(i, 1);
      } else {
        e.x += (e.vx || 0) * dt;
        e.y += (e.vy || 0) * dt;
      }
    }
  }

  return { bindMessageEl, showMessage, beam, ring, burst, update };
}
