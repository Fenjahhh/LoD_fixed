export function xpToNext(level) {
  return 55 + (level - 1) * 35;
}

export function gainGold(hero, amount) {
  hero.gold += amount;
}

export function gainExp(state, hero, amount, showMessage) {
  hero.exp += amount;
  while (hero.exp >= xpToNext(hero.level)) {
    hero.exp -= xpToNext(hero.level);
    hero.level += 1;
    hero.maxHp += 30;
    hero.maxMana += 18;
    hero.attackDamage += 4;
    hero.hp += 30;
    hero.mana += 18;
    showMessage((hero === state.player ? "Level Up! " : "Gegner Level Up! ") + "Level " + hero.level, 1.4);
  }
}
