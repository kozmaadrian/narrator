// Kokoro voice ids look like "af_heart": accent + gender prefix, then the name.
export function voiceLabel(id) {
  const groups = { af: 'American · female', am: 'American · male', bf: 'British · female', bm: 'British · male' };
  const name = id.split('_')[1] || id;
  return [groups[id.slice(0, 2)] || 'Other', name.charAt(0).toUpperCase() + name.slice(1)];
}

// [{ label, voices: [{ id, label }] }] in the order the groups first appear.
export function voiceGroups(ids) {
  const groups = new Map();
  for (const id of ids) {
    const [group, label] = voiceLabel(id);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ id, label });
  }
  return [...groups].map(([label, voices]) => ({ label, voices }));
}
