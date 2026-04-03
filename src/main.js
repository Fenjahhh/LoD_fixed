import { SiegeEngine } from "./engine/SiegeEngine.js";

// #region agent log
globalThis.__agentAppendLog = (payload) => {
  try {
    const line = JSON.stringify(payload);
    fetch("/__agent_log", {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: `${line}\n`,
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
};
// #endregion

const engine = new SiegeEngine(document);
window.__siegeEngine = engine;
engine.mount();
