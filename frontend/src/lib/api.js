// The narrator server (app.py).

export async function fetchConfig() {
  return (await fetch('/api/config')).json();
}

export const fileUrl = (name, ext, fresh = false) => `/api/files/${name}.${ext}${fresh ? `?v=${Date.now()}` : ''}`;

export function cancelJob(id) {
  return fetch(`/api/render/${id}/cancel`, { method: 'POST' }).catch(() => {});
}

// POST /api/render streams NDJSON: start (job id), progress…, then result, error or cancelled. Yields each
// event; throws on an HTTP error with the server's detail.
export async function* renderEvents(body, signal) {
  const res = await fetch('/api/render', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))).detail;
    throw new Error(typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg).join('; ') : res.statusText);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines.filter((l) => l.trim())) yield JSON.parse(line);
  }
}
