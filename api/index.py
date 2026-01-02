import sys
import os
from typing import Callable, Awaitable

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.append(BACKEND_DIR)

from main import app as backend_app  # your FastAPI app in backend/main.py


class StripPrefixMiddleware:
    def __init__(self, app, prefix: str = "/api"):
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path.startswith(self.prefix):
                scope = dict(scope)
                scope["path"] = path[len(self.prefix):] or "/"
                # keep correct root_path for docs/urls
                scope["root_path"] = scope.get("root_path", "") + self.prefix
        await self.app(scope, receive, send)


# Vercel will use this `app`
app = StripPrefixMiddleware(backend_app, prefix="/api")
