import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4181;
const DIST = path.resolve('dist');

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(DIST, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
  fs.mkdirSync('screenshots', { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpProfile = path.join(process.env.TEMP || 'C:\\tmp', 'chrome_cdp_profile_' + Date.now());
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${tmpProfile}`,
    '--remote-debugging-port=9222',
    `http://127.0.0.1:${PORT}`
  ]);

  try {
    // Poll until remote debugging port is ready
    let ver = null;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9222/json/version');
        if (res.ok) {
          ver = await res.json();
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }
    if (!ver) throw new Error('Could not connect to Chrome debugging port');
    const ws = new WebSocket(ver.webSocketDebuggerUrl);

    await new Promise((resolve) => { ws.onopen = resolve; });

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        const onMsg = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', onMsg);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    // Attach to target page
    const targets = await send('Target.getTargets');
    const pageTarget = targets.targetInfos.find(t => t.type === 'page');
    const session = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    const sessionId = session.sessionId;

    function sendSession(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        const onMsg = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', onMsg);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: curId, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('DOM.enable');

    // 1. Desktop Screenshot (1280x850)
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 850,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sendSession('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
    await new Promise(r => setTimeout(r, 1200));

    const deskShot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/desktop_view.png', Buffer.from(deskShot.data, 'base64'));
    console.log('Desktop screenshot saved: screenshots/desktop_view.png');

    // 2. Mobile Screenshot (iPhone 14/15 390x844)
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sendSession('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
    await new Promise(r => setTimeout(r, 1200));

    const mobileShot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/mobile_view.png', Buffer.from(mobileShot.data, 'base64'));
    console.log('Mobile screenshot saved: screenshots/mobile_view.png');

    // 3. Trigger Pad 1 (Kick 808) for Active State Screenshot
    await sendSession('Runtime.evaluate', {
      expression: `
        const pad1 = document.getElementById('pad-0');
        if (pad1) {
          pad1.classList.add('active');
          const lastHit = document.getElementById('stat-last-hit');
          const latency = document.getElementById('stat-latency');
          if (lastHit) lastHit.textContent = 'Kick 808 [1]';
          if (latency) latency.textContent = '0.12 ms';
        }
      `
    });
    await new Promise(r => setTimeout(r, 300));

    const activeShot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/active_state_view.png', Buffer.from(activeShot.data, 'base64'));
    console.log('Active state screenshot saved: screenshots/active_state_view.png');

    ws.close();
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    chromeProc.kill();
    server.close();
    process.exit(0);
  }
});
