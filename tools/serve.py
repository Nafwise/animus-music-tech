"""Preview the Animus Music Tech site on this computer, the way GitHub Pages serves it.

    python tools/serve.py               the site as it is, at http://127.0.0.1:8765
    python tools/serve.py --echo        the feedback form posts to this server instead of FormSubmit, which saves each
                                        submission in tests/out/ - to check the form without sending an email
    python tools/serve.py --relay URL   the feedback form posts to URL for this run only - to switch FormSubmit on (see the
                                        README) without putting an email address in config.js

Only this computer can reach it (it listens on 127.0.0.1). A missing page gets 404.html, as on GitHub Pages. Ctrl+C stops it.
"""
import argparse
import datetime
import http.server
import json
import pathlib
import re
import sys
import urllib.parse

SITE = pathlib.Path(__file__).resolve().parent.parent
OUT = SITE / "tests" / "out"
MAX_POST = 12 * 1024 * 1024


def parse_multipart(body, content_type):
    """A multipart/form-data body -> ({name: [values]}, [(name, filename, content type, bytes)]).
    A file box left empty (no filename, no bytes) is left out, as a mail relay would."""
    m = re.search(r'boundary="?([^";]+)"?', content_type)
    if not m:
        raise ValueError("multipart with no boundary")
    fields, files = {}, []
    for chunk in body.split(b"--" + m.group(1).encode("latin-1"))[1:]:
        if chunk.startswith(b"--"):
            break                                            # the closing delimiter
        head, _, data = chunk[2:].partition(b"\r\n\r\n")     # [2:]: the line break after the delimiter
        if data.endswith(b"\r\n"):
            data = data[:-2]                                 # the line break before the next delimiter belongs to it
        headers = {}
        for line in head.decode("utf-8", "replace").split("\r\n"):
            key, _, value = line.partition(":")
            headers[key.strip().lower()] = value.strip()
        disposition = headers.get("content-disposition", "")
        name = re.search(r'(?:^|;)\s*name="([^"]*)"', disposition)
        filename = re.search(r'(?:^|;)\s*filename="([^"]*)"', disposition)
        name = name.group(1) if name else ""
        if filename is None:
            fields.setdefault(name, []).append(data.decode("utf-8", "replace"))
        elif filename.group(1) or data:
            files.append((name, filename.group(1), headers.get("content-type", ""), data))
    return fields, files


class Handler(http.server.SimpleHTTPRequestHandler):
    relay = None      # when set, what config.js's feedbackAction is served as
    echo = False      # take the form's posts at /echo

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")        # every reload shows the latest edit
        super().end_headers()

    def send_body(self, code, body, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self):
        if self.relay is not None and urllib.parse.urlsplit(self.path).path == "/assets/js/config.js":
            text = (SITE / "assets" / "js" / "config.js").read_text(encoding="utf-8")
            text, n = re.subn(r'feedbackAction:\s*"[^"]*"', lambda _: "feedbackAction: " + json.dumps(self.relay), text)
            if n != 1:
                self.send_error(500, "config.js has no feedbackAction to replace")
                return
            self.send_body(200, text.encode("utf-8"), "text/javascript; charset=utf-8")
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)                                 # GitHub Pages doesn't list folders either
        return None

    def send_error(self, code, message=None, explain=None):
        page = SITE / "404.html"
        if code == 404 and self.command in ("GET", "HEAD") and page.is_file():
            self.send_body(404, page.read_bytes(), "text/html; charset=utf-8")
            return
        super().send_error(code, message, explain)

    def do_POST(self):
        if not self.echo or urllib.parse.urlsplit(self.path).path != "/echo":
            self.send_error(405, "This preview takes posts only at /echo, with --echo")
            return
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_POST:
            self.send_error(413, "Nothing sent, or more than 12 MB")
            return
        body = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "")
        try:
            if content_type.startswith("multipart/form-data"):
                fields, files = parse_multipart(body, content_type)
            else:
                fields, files = urllib.parse.parse_qs(body.decode("utf-8"), keep_blank_values=True), []
        except ValueError as e:
            self.send_error(400, str(e))
            return

        folder = OUT / datetime.datetime.now().strftime("submission-%Y%m%d-%H%M%S-%f")
        folder.mkdir(parents=True)
        listed = []
        for name, filename, file_type, data in files:
            safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name + "--" + filename)[:100]
            (folder / safe).write_bytes(data)
            listed.append({"field": name, "filename": filename, "type": file_type, "bytes": len(data), "saved_as": safe})
        (folder / "fields.json").write_text(json.dumps({"fields": fields, "files": listed}, indent=1, ensure_ascii=False),
                                            encoding="utf-8")
        print("[echo] %d fields, %d files -> %s" % (len(fields), len(listed), folder), flush=True)

        # Back to the thank-you page, as FormSubmit does - but only on this server.
        back = (fields.get("_next") or [""])[0]
        if urllib.parse.urlsplit(back).netloc == self.headers.get("Host"):
            self.send_response(303)
            self.send_header("Location", back)
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            self.send_body(200, ("Received - saved in %s\n" % folder).encode("utf-8"), "text/plain; charset=utf-8")


def main():
    p = argparse.ArgumentParser(description="Preview the Animus Music Tech site on this computer.")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--echo", action="store_true", help="the feedback form posts to this server, which saves each submission in tests/out/")
    p.add_argument("--relay", metavar="URL", help="the feedback form posts to URL, for this run only")
    a = p.parse_args()
    if a.echo and a.relay:
        p.error("--echo or --relay, not both")
    Handler.echo = a.echo
    Handler.relay = "/echo" if a.echo else a.relay

    server = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    how = "  (the form posts here, saved in tests/out/)" if a.echo else ("  (the form posts to %s)" % a.relay if a.relay else "")
    print("Animus Music Tech site: http://127.0.0.1:%d/%s" % (a.port, how), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
