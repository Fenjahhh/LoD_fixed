export function createHero(side, world) {
  const isPlayer = side === 'left';
  const baseX = isPlayer ? 170 : world.W - 300;
  return {
    type: 'hero',
    side,
    x: baseX,
    y: world.laneY,
    radius: 22,
    facing: isPlayer ? 0 : Math.PI,
    moveTargetX: baseX,
    moveTargetY: world.laneY,
    maxHp: 350,
    hp: 350,
    maxMana: 160,
    mana: 160,
    manaRegen: 8,
    attackDamage: 22,
    attackRange: 74,
    attackCd: 0,
    attackSpeed: 0.8,
    moveSpeed: 150,
    level: 1,
    exp: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    items: [],
    dead: false,
    respawnTimer: 0,
    buff: null,
    skills: [],
    retreating: false,
  };
}

export function heroStatsWithItems(hero) {
  let bonusHp = 0;
  let bonusMana = 0;
  let bonusDamage = 0;
  let bonusRegen = 0;
  let bonusSpeed = 0;
  for (const item of hero.items) {
    bonusHp += item.bonusHp || 0;
    bonusMana += item.bonusMana || 0;
    bonusDamage += item.bonusDamage || 0;
    bonusRegen += item.bonusRegen || 0;
    bonusSpeed += item.bonusSpeed || 0;
  }
  return {
    maxHp: hero.maxHp + bonusHp,
    maxMana: hero.maxMana + bonusMana,
    attackDamage: hero.attackDamage + bonusDamage,
    manaRegen: hero.manaRegen + bonusRegen,
    moveSpeed: hero.moveSpeed + bonusSpeed,
  };
}
