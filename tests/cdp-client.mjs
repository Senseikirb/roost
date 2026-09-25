// Small shared client for focused browser journeys; no test/runtime dependency.
export async function connectApp({ url = process.env.ROOST_APP_URL || 'http://127.0.0.1:8765/index.html', width = 390, seed = '' } = {}) {
  const port = process.env.ROOST_CDP_PORT || '9223';
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer); pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };
  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function navigate(nextUrl = url, nextWidth = width) {
    await send('Emulation.setDeviceMetricsOverride', { width: nextWidth, height: 900, deviceScaleFactor: 1, mobile: nextWidth < 600 });
    // A navigation can acknowledge before the previous document goes away.
    // Never mistake its existing hooks for completion of the new page.
    try { await evaluate('window.__roostTestNavigating = true'); } catch {}
    await send('Page.navigate', { url: nextUrl });
    for (let attempt = 0; attempt < 200; attempt++) {
      try { if (await evaluate('!window.__roostTestNavigating && !!window.roostTestHooks && !!document.getElementById("roost-dock") && document.readyState !== "loading"')) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Roost did not initialize');
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.bringToFront');
  // Ordinary journeys must execute the current source, not a prior development shell.
  // The dedicated offline suite explicitly re-enables its real worker after installation.
  await send('Network.setBypassServiceWorker', { bypass: true });
  // External content does not determine these local journeys.
  await send('Network.setBlockedURLs', { urls: ['https://*', 'http://*.com/*'] });
  if (seed) await send('Page.addScriptToEvaluateOnNewDocument', { source: typeof seed === 'string' ? seed : `localStorage.clear(); Object.entries(${JSON.stringify(seed)}).forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));` });
  await navigate();
  return { send, evaluate, errors, navigate, async close() { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`); } };
}
