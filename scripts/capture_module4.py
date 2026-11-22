import os, subprocess, http.server, socketserver, threading, time

PORT = 4188
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
    '--screenshot=' + os.path.abspath('screenshots/desktop_module4.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Desktop Module 4 screenshot captured!')

# 2. Export Modal View
with open('dist/index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

export_snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const bounceBtn = document.getElementById('btn-open-bounce');
        if (bounceBtn) bounceBtn.click();
    }, 400);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', export_snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1200',
    '--screenshot=' + os.path.abspath('screenshots/export_modal_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Export modal screenshot captured!')

# 3. Guide Modal View
guide_snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const guideBtn = document.getElementById('btn-open-help');
        if (guideBtn) guideBtn.click();
    }, 400);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', guide_snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1200',
    '--screenshot=' + os.path.abspath('screenshots/guide_modal_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Guide modal screenshot captured!')

# 4. Live Recording Active View
rec_snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const recBtn = document.getElementById('btn-master-rec');
        const recLabel = document.getElementById('master-rec-label');
        if (recBtn) recBtn.classList.add('is-recording');
        if (recLabel) recLabel.textContent = 'STOP (00:14)';

        // Playhead & active pad
        const step4 = document.getElementById('seq-step-4');
        if (step4) step4.classList.add('playhead');
        const pad0 = document.getElementById('pad-0');
        if (pad0) pad0.classList.add('active');

        // Play button active
        const playBtn = document.getElementById('seq-play-btn');
        if (playBtn) {
            playBtn.classList.replace('play', 'playing');
            const playLabel = document.getElementById('seq-play-label');
            if (playLabel) playLabel.textContent = 'PAUSE';
        }
    }, 400);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', rec_snippet + '</body>'))

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=1280,1680',
    '--screenshot=' + os.path.abspath('screenshots/live_recording_active.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Live recording screenshot captured!')

# 5. Mobile View (500x1950)
with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html)

subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=2000',
    '--window-size=500,1950',
    '--screenshot=' + os.path.abspath('screenshots/mobile_module4.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)
print('Mobile Module 4 screenshot captured!')

httpd.shutdown()
print('All Module 4 screenshots captured successfully!')
