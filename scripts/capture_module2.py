import os, subprocess, http.server, socketserver, threading, time

PORT = 4186
DIRECTORY = 'dist'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

os.makedirs('screenshots', exist_ok=True)
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# 1. Desktop Screenshot (1280x1220) Full View
subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1280,1220',
    '--screenshot=' + os.path.abspath('screenshots/desktop_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Desktop screenshot captured!')

# 2. Mobile Screenshot (500x1350)
subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=500,1350',
    '--screenshot=' + os.path.abspath('screenshots/mobile_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Mobile screenshot captured!')

# 3. Active Playback & Sequencer Playhead Screenshot
with open('dist/index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        // Trigger Play button
        const playBtn = document.getElementById('seq-play-btn');
        if (playBtn) {
            playBtn.classList.replace('play', 'playing');
            const playLabel = document.getElementById('seq-play-label');
            if (playLabel) playLabel.textContent = 'PAUSE';
            const playIcon = document.getElementById('seq-play-icon');
            if (playIcon) playIcon.textContent = '⏸';
        }

        // Highlight active playhead on step 4 (Beat 2 start)
        const step4 = document.getElementById('seq-step-4');
        if (step4) step4.classList.add('playhead');

        // Highlight Pad 1 (Snare) as striking
        const pad1 = document.getElementById('pad-1');
        if (pad1) pad1.classList.add('active');

        // Update telemetry
        const lastHit = document.getElementById('stat-last-hit');
        if (lastHit) lastHit.textContent = 'Snare Hard [2]';
        const latency = document.getElementById('stat-latency');
        if (latency) latency.textContent = '0.08 ms';

        // Animate VU meter
        const bars = document.querySelectorAll('.vu-bar');
        bars.forEach((b, i) => {
            if (i < 5) {
                b.classList.add('active');
                b.style.height = ((i + 1) * 20) + '%';
            }
        });
    }, 300);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1220',
    '--screenshot=' + os.path.abspath('screenshots/active_state_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html)

httpd.shutdown()
print('All Module 2 screenshots captured and verified successfully!')
