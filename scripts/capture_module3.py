import os, subprocess, http.server, socketserver, threading, time

PORT = 4187
DIRECTORY = 'dist'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

os.makedirs('screenshots', exist_ok=True)
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# 1. Desktop Full View (1280x1680)
subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1680',
    '--screenshot=' + os.path.abspath('screenshots/desktop_module3.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Desktop Module 3 screenshot captured!')

# 2. Key Mapping Modal View
with open('dist/index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

modal_snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const keymapBtn = document.getElementById('btn-open-keymap');
        if (keymapBtn) keymapBtn.click();
    }, 400);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', modal_snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1200',
    '--screenshot=' + os.path.abspath('screenshots/keymap_modal_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Keymapper modal screenshot captured!')

# 3. Active Playback & FX Active View
fx_active_snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        // Activate Play button
        const playBtn = document.getElementById('seq-play-btn');
        if (playBtn) {
            playBtn.classList.replace('play', 'playing');
            const playLabel = document.getElementById('seq-play-label');
            if (playLabel) playLabel.textContent = 'PAUSE';
            const playIcon = document.getElementById('seq-play-icon');
            if (playIcon) playIcon.textContent = '⏸';
        }

        // Highlight step 04 playhead
        const step4 = document.getElementById('seq-step-4');
        if (step4) step4.classList.add('playhead');

        // Highlight Pad 0 (Kick 808) as active
        const pad0 = document.getElementById('pad-0');
        if (pad0) pad0.classList.add('active');

        // Turn on Drive, Delay and Reverb units in UI
        const unitDrive = document.getElementById('unit-drive');
        if (unitDrive) {
            unitDrive.classList.add('is-active');
            const btnDrive = document.getElementById('btn-power-drive');
            if (btnDrive) btnDrive.classList.add('active-led');
        }

        const unitDelay = document.getElementById('unit-delay');
        if (unitDelay) {
            unitDelay.classList.add('is-active');
            const btnDelay = document.getElementById('btn-power-delay');
            if (btnDelay) btnDelay.classList.add('active-led');
        }

        const unitReverb = document.getElementById('unit-reverb');
        if (unitReverb) {
            unitReverb.classList.add('is-active');
            const btnReverb = document.getElementById('btn-power-reverb');
            if (btnReverb) btnReverb.classList.add('active-led');
        }

        // Animate VU meter
        const bars = document.querySelectorAll('.vu-bar');
        bars.forEach((b, i) => {
            if (i < 5) {
                b.classList.add('active');
                b.style.height = ((i + 1) * 20) + '%';
            }
        });

        const lastHit = document.getElementById('stat-last-hit');
        if (lastHit) lastHit.textContent = 'Kick 808 [1]';
        const latency = document.getElementById('stat-latency');
        if (latency) latency.textContent = '0.06 ms';
    }, 400);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', fx_active_snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1680',
    '--screenshot=' + os.path.abspath('screenshots/fx_active_state.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('FX active state screenshot captured!')

# 4. Mobile Responsive View (500x1900)
with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html)

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=500,1950',
    '--screenshot=' + os.path.abspath('screenshots/mobile_module3.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Mobile screenshot captured!')

httpd.shutdown()
print('All Module 3 screenshots captured successfully!')
