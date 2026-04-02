import { SiegeEngine } from "./engine/SiegeEngine.js";

const engine = new SiegeEngine(document);
window.__siegeEngine = engine;
engine.mount();
