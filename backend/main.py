# FastAPI Backend for AI Contract Parser & Billing Configurator
# main entry point

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routers import contracts_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (use Alembic for production migrations)."""
    logger.info("Starting Contract Parser API...")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Contract Parser API",
    description="AI-powered B2B contract parsing and billing configuration extraction",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow the Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(contracts_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "contract-parser-api"}


@app.get("/")
def root():
    return {
        "name": "Contract Parser API",
        "docs": "/docs",
        "health": "/health"
    }