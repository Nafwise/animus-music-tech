"""Preview the Animus Music Tech site on this computer, the way GitHub Pages serves it.

    python tools/serve.py               the site at http://127.0.0.1:8765/animus-music-tech/
    python tools/serve.py --port 9000   on another port

GitHub Pages serves this repository as a project site, under /animus-music-tech/, so the preview does too - that's what the
404 page's <base href> expects. http://127.0.0.1:8765/ forwards there. Only this computer can reach it (it listens on
127.0.0.1). A missing page gets 404.html and a folder isn't listed, as on GitHub Pages. Every reload shows the latest edit.
Ctrl+C stops it.
"""
import argparse
import http.server
import pathlib
import sys
import urllib.parse

SITE = pathlib.Path(__file__).resolve().parent.parent
BASE = "/animus-music-tech/"      # the repository's name: where GitHub Pages puts the site


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def under_base(self):
        """Only what's under BASE is the site. True: self.path now names the file; False: already answered."""
        path = urllib.parse.urlsplit(self.path).path
        if path in ("/", BASE.rstrip("/")):
            self.send_response(301)
            self.send_header("Location", BASE)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return False
        if not path.startswith(BASE):
            self.send_error(404)
            return False
        self.path = "/" + self.path[len(BASE):]
        return True

    def do_GET(self):
        if self.under_base():
            super().do_GET()

    def do_HEAD(self):
        if self.under_base():
            super().do_HEAD()

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
    print("Animus Music Tech site: http://127.0.0.1:%d%s" % (a.port, BASE), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
