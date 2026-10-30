#!/usr/bin/env python3
"""A no-cache dev server for the web folder and the tools pages. Usage: tools/serve.py [port]"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
                      '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    # A page loads dozens of modules at once; the default backlog of 5 resets some of them.
    request_queue_size = 128


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8651
Server(('127.0.0.1', port), Handler).serve_forever()
