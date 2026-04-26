import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.models import User, Run
from app.services.market_engine import run_agent_turn, close_expired_runs, expire_stale_negotiations
from app.config import settings
from app.api import auth, onboarding, marketplace, analytics, admin, survey

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()


def market_tick():
    """Runs one agent turn per active participant across all active runs."""
    db: Session = SessionLocal()
    try:
        close_expired_runs(db)
        expire_stale_negotiations(db)

        active_runs = db.query(Run).filter(Run.status == "active").all()
        users = db.query(User).filter(User.onboarding_complete == 1).all()

        logger.info('"market_tick_start active_runs=%s users=%s"', len(active_runs), len(users))

        for run in active_runs:
            for user in users:
                try:
                    run_agent_turn(user, run, db)
                except Exception as exc:
                    logger.error(
                        '"agent_turn_failed user_id=%s run_id=%s error=%s"',
                        user.id, run.id, str(exc),
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
    logger.info('"scheduler_started interval_seconds=%s"', settings.scheduler_interval_seconds)
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
app.include_router(admin.router)
app.include_router(survey.router)


@app.get("/health")
def health():
    return {"status": "ok"}
