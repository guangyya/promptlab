// Loaded only with VITE_PREVIEW_ENGINE=native; excluded from the static artifact.
export async function request(url, body, signal) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal } : { signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
export function createSession(config, callbacks) {
  const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/terminal`);
  socket.onopen = () => socket.send(JSON.stringify({ type: 'start', config }));
  socket.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.type === 'data') callbacks.onData(Uint8Array.from(atob(m.data), c => c.charCodeAt(0)));
    else if (m.type === 'ready') callbacks.onReady?.();
    else if (m.type === 'error') callbacks.onError?.(m.message);
    else if (m.type === 'closed') callbacks.onClosed?.();
  };
  socket.onerror = () => callbacks.onError?.('Connection failed. Check the local service and restart the session.');
  socket.onclose = () => callbacks.onClosed?.();
  return socket;
}
