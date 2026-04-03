export function createHero(side, world, heroClass = null) {
  const isPlayer = side === 'left';
  const baseX = isPlayer ? 170 : world.W - 300;
  const classStats = heroClass?.stats || {};
  const classColors = heroClass?.colors || {};
  const defaultMain = isPlayer ? '#7de2d1' : '#ff8a8a';
  const defaultAccent = isPlayer ? '#dffcf7' : '#ffe2e2';
  const defaultAuto = isPlayer ? '#ff3a3a' : '#ffca75';
  return {
    type: 'hero',
    side,
    x: baseX,
    y: world.laneY,
    radius: 22,
    facing: isPlayer ? 0 : Math.PI,
    moveTargetX: baseX,
    moveTargetY: world.laneY,
    maxHp: classStats.maxHp ?? 350,
    hp: classStats.maxHp ?? 350,
    maxMana: classStats.maxMana ?? 160,
    mana: classStats.maxMana ?? 160,
    manaRegen: classStats.manaRegen ?? 8,
    attackDamage: classStats.attackDamage ?? 22,
    attackRange: classStats.attackRange ?? 74,
    attackCd: 0,
    attackSpeed: classStats.attackSpeed ?? 0.8,
    moveSpeed: classStats.moveSpeed ?? 150,
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
    classId: heroClass?.id || null,
    className: heroClass?.name || null,
    classShape: heroClass?.shape || 'triangle',
    visualMain: classColors.main || defaultMain,
    visualAccent: classColors.accent || defaultAccent,
    autoAttackColor: classColors.autoShot || defaultAuto,
    autoAttackTrailColor: classColors.autoTrail || defaultAuto,
    autoShotSpeed: classStats.autoShotSpeed ?? 170,
    autoShotRadius: classStats.autoShotRadius ?? 5,
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
