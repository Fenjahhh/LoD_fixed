import { rand } from "../core/math.js";

export function createCreep(side, role, x, y) {
  const melee = role === "melee";
  return {
    type: "creep",
    role,
    side,
    x,
    y,
    radius: melee ? 14 : 12,
    hp: melee ? 94 : 68,
    maxHp: melee ? 94 : 68,
    damage: melee ? 11 : 10,
    range: melee ? 30 : 150,
    speed: melee ? 37 : 31,
    attackCd: rand(0, 0.4),
    attackSpeed: melee ? 1.02 : 1.25,
    dead: false,
  };
}
