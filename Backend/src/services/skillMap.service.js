function updateSkillMap(currentMap, weakTopics = []) {
  const next = { ...(currentMap || {}) };

  for (const code of weakTopics) {
    const v = typeof next[code] === "number" ? next[code] : 0.6;
    next[code] = Math.max(0, Number((v - 0.05).toFixed(3)));
  }
  return next;
}

module.exports = { updateSkillMap };