# [AUNEA-BE-BOOT-INIT-010] START — ASGI entry point
# PURPOSE: Expose the FastAPI app instance for ASGI servers (uvicorn/gunicorn).
# CHANGE_RISK: LOW.
from .api import app
# [AUNEA-BE-BOOT-INIT-010] END
