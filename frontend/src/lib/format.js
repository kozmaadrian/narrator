// Time formatting and parsing shared by the whole UI.

// m:ss.s, with a minus sign for negative times (a voice intro before the video).
export const fmt = (t) => {
  t = t || 0;
  const sign = t < -0.05 ? '-' : '';
  t = Math.round(Math.abs(t) * 10) / 10;
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${sign}${m}:${s.toFixed(1).padStart(4, '0')}`;
};

// Rounded-up durations for the progress card: "8s", "1m 05s".
export const secs = (t) => {
  t = Math.ceil(t);
  return t < 60 ? `${t}s` : `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s`;
};

// "1:05.5", "65.5", "-2" → seconds; null when it can't be read.
export function parseTime(value) {
  const m = String(value).trim().match(/^(-)?(\d+(?::\d{1,2}){0,2}(?:\.\d+)?)$/);
  if (!m) return null;
  const s = m[2].split(':').reduce((acc, x) => acc * 60 + Number(x), 0);
  return m[1] ? -s : s;
}
