import asyncio
from datetime import datetime
import json

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.model import model_manager
from app.inference import ml_inference_service

# We need to query from postgres using raw sql or similar to get a 4-Sep and 5-Sep point
import asyncpg
import os

DATABASE_URL = os.environ.get('DATABASE_URL').replace("postgresql://", "postgresql+asyncpg://").replace(":6543/", ":5432/")

async def main():
    model_manager.load_model()

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        from sqlalchemy import text
        # Get one from Sep 4
        res4 = await db.execute(text("SELECT latitude, longitude, timestamp, frp FROM hotspots WHERE DATE(timezone('Asia/Kolkata', timestamp)) = '2026-09-04' LIMIT 1"))
        row4 = res4.fetchone()
        if row4:
            print(f"\n--- 4 Sep Point: {row4} ---")
            pred4 = await ml_inference_service.predict_observation(
                db=db,
                latitude=row4[0],
                longitude=row4[1],
                timestamp=row4[2],
                frp=row4[3]
            )
            print(json.dumps(pred4.model_dump(), indent=2))

        # Get one from Sep 5
        res5 = await db.execute(text("SELECT latitude, longitude, timestamp, frp FROM hotspots WHERE DATE(timezone('Asia/Kolkata', timestamp)) = '2026-09-05' LIMIT 1"))
        row5 = res5.fetchone()
        if row5:
            print(f"\n--- 5 Sep Point: {row5} ---")

            from app.source_features import build_source_features
            vec = await build_source_features(
                db=db,
                latitude=row5[0],
                longitude=row5[1],
                cutoff_ts=row5[2],
                current_frp=row5[3],
                allow_single_obs_fallback=True
            )
            print("Feature Vector:", vec.to_list())

            pred5 = await ml_inference_service.predict_observation(
                db=db,
                latitude=row5[0],
                longitude=row5[1],
                timestamp=row5[2],
                frp=row5[3]
            )
            print(json.dumps(pred5.model_dump(), indent=2))

if __name__ == '__main__':
    asyncio.run(main())
