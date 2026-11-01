import os, subprocess, http.server, socketserver, threading, time

PORT = 4183
DIRECTORY = 'dist'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

with open('dist/index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

snippet = """
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        const p = document.getElementById('pad-0');
        if (p) p.classList.add('active');
        const h = document.getElementById('stat-last-hit');
        if (h) h.textContent = 'Kick 808 [1]';
        const lat = document.getElementById('stat-latency');
        if (lat) lat.textContent = '0.14 ms';
        const bars = document.querySelectorAll('.vu-bar');
        bars.forEach((b, i) => {
            if (i < 4) {
                b.classList.add('active');
                b.style.height = ((i + 1) * 22) + '%';
            }
        });
    }, 100);
});
</script>
"""

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html.replace('</body>', snippet + '</body>'))

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
subprocess.run([
    chrome_path, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1280,850',
    '--screenshot=' + os.path.abspath('screenshots/active_state_view.png'),
    f'http://127.0.0.1:{PORT}'
], check=True)

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(orig_html)

httpd.shutdown()
print('Active state screenshot generated successfully!')
