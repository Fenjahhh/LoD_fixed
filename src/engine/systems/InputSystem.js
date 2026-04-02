export function createInputSystem(engine) {
  const { state, canvas, config } = engine;

  function setPointerTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.input.mouseX = engine.math.clamp((clientX - rect.left) * scaleX, config.arenaPadding, engine.W - config.arenaPadding);
    state.input.mouseY = engine.math.clamp((clientY - rect.top) * scaleY, config.arenaPadding, engine.H - config.arenaPadding);
  }

  function attach() {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      setPointerTarget(e.clientX, e.clientY);
      state.input.moving = true;
      state.player.moveTargetX = state.input.mouseX;
      state.player.moveTargetY = state.input.mouseY;
    });

    window.addEventListener('mouseup', () => {
      state.input.moving = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      setPointerTarget(e.clientX, e.clientY);
      if (state.input.moving) {
        state.player.moveTargetX = state.input.mouseX;
        state.player.moveTargetY = state.input.mouseY;
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        setPointerTarget(t.clientX, t.clientY);
        state.input.moving = true;
        state.player.moveTargetX = state.input.mouseX;
        state.player.moveTargetY = state.input.mouseY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        setPointerTarget(t.clientX, t.clientY);
        state.player.moveTargetX = state.input.mouseX;
        state.player.moveTargetY = state.input.mouseY;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      state.input.moving = false;
    }, { passive: true });
  }

  return { attach };
}
