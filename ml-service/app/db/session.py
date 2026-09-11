from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.async_database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"statement_cache_size": 0},
    # Read-only configuration is ideally enforced at the PG role level,
    # but we ensure the app only performs reads.
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
