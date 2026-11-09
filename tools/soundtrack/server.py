"""Local render server for the RogueWave soundtrack.

Serves this folder (open http://127.0.0.1:8769/music.html) and stores the WAV
files the page POSTs to /__save/<name> in the out/ folder next to this file.
Binds to 127.0.0.1 only.
"""
import http.server
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
PORT = 8769


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(HERE), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        clean = self.path.split("?", 1)[0]
        if not clean.startswith("/__save/"):
            self.send_error(404)
            return
        rel = pathlib.PurePosixPath(clean[len("/__save/"):])
        if rel.is_absolute() or ".." in rel.parts or not rel.parts:
            self.send_error(400)
            return
        target = OUT.joinpath(*rel.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        length = int(self.headers.get("Content-Length", "0"))
        target.write_bytes(self.rfile.read(length))
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        if self.command != "POST":
            sys.stderr.write(fmt % args + "\n")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
