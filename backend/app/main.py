"""Start: uvicorn app.main:app --reload (z katalogu backend/)."""

from fastapi import FastAPI

from .api.routes import router

app = FastAPI(title="Lunar Landing Site Navigator API")
app.include_router(router)
