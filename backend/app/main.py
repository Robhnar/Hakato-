"""Start: uvicorn app.main:app --reload (from the backend/ directory)."""

from fastapi import FastAPI

from .api.routes import router

app = FastAPI(title="Lunar Landing Site Navigator API")
app.include_router(router)
