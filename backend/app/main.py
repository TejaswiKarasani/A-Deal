from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.models import User, Run
from app.services.market_engine import run_agent_turn
from app.config import settings
from app.api import auth, onboarding, marketplace, analytics

Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()


def market_tick():
    """Called on every scheduler interval — runs one agent turn per active participant."""
    db: Session = SessionLocal()
    try:
        active_runs = db.query(Run).filter(Run.status == "active").all()
        users = db.query(User).filter(User.onboarding_complete == 1).all()
        for run in active_runs:
            for user in users:
                try:
                    run_agent_turn(user, run, db)
                except Exception as exc:
                    # Never let one agent crash the whole tick
                    import logging
                    logging.getLogger(__name__).error(
                        "Agent turn failed user=%s run=%s: %s", user.id, run.id, exc
                    )
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        market_tick,
        "interval",
        seconds=settings.scheduler_interval_seconds,
        id="market_tick",
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="A-Deal API",
    description="Open-source AI-agent marketplace inspired by Anthropic's Project Deal",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(marketplace.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
