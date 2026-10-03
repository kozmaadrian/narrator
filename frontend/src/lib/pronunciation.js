// Pronunciation list. narrate.py reads it as text, one `word = how to say it` rule per line.

let nextId = 1;
export const makeRule = (word = '', say = '') => ({ id: nextId++, word, say });

export function parsePron(text) {
  const rules = [];
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.includes('=>') ? '=>' : '=', at = line.indexOf(sep);
    if (at < 0) continue;
    const word = line.slice(0, at).trim();
    if (word) rules.push(makeRule(word, line.slice(at + sep.length).trim()));
  }
  return rules;
}

// The rules as text for narrate.py; rows still missing how to say it only go into storage (all).
export function pronText(rules, all = false) {
  return rules.map((r) => ({ word: r.word.trim(), say: r.say.trim() }))
    .filter((r) => r.word && (all || r.say))
    .map((r) => `${r.word} ${(r.word + r.say).includes('=') ? '=>' : '='} ${r.say}`.trimEnd())
    .join('\n');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word, case-sensitive matches in the spoken lines of the script, as narrate.py replaces them.
export function scriptMatches(text, word) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(word)}(?![\\p{L}\\p{N}_])`, 'gu');
  return text.split('\n').filter((l) => !l.trim().startsWith('#'))
    .reduce((n, l) => n + (l.match(re) || []).length, 0);
}

// The script's selection, if it looks like a word or short phrase to add.
export function selectedWord(text, start, end) {
  const s = text.slice(start, end).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return s && s.length <= 40 && !s.includes('\n') ? s : '';
}

// Per rule, why it may not do anything ('' when fine).
export function ruleHints(rules, text) {
  const seen = new Set();
  return rules.map((rule) => {
    const word = rule.word.trim();
    let hint = '';
    if (word && seen.has(word)) hint = 'Listed twice; only the first one is used.';
    else if (word && !scriptMatches(text, word)) hint = 'Not in the script. Matches are case-sensitive, whole words.';
    seen.add(word);
    return hint;
  });
}
