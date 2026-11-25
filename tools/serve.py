"""Preview the Animus Music Tech site on this computer, the way GitHub Pages serves it.

    python tools/serve.py               the site at http://127.0.0.1:8765
    python tools/serve.py --port 9000   on another port

Only this computer can reach it (it listens on 127.0.0.1). A missing page gets 404.html and a folder isn't listed, as on
GitHub Pages. Every reload shows the latest edit. Ctrl+C stops it.
"""
import argparse
import http.server
import pathlib
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def send_error(self, code, message=None, explain=None):
        page = SITE / "404.html"
        if code == 404 and self.command in ("GET", "HEAD") and page.is_file():
            body = page.read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command == "GET":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)


def main():
    p = argparse.ArgumentParser(description="Preview the Animus Music Tech site on this computer.")
    p.add_argument("--port", type=int, default=8765)
    a = p.parse_args()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    print("Animus Music Tech site: http://127.0.0.1:%d/" % a.port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
