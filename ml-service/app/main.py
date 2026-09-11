import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.model import model_manager
from app.inference import ml_inference_service
from app.schemas import MLPredictionOutput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ThermalWatch ML Inference Service")

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing ML model...")
    model_manager.load_model()

class PredictRequest(BaseModel):
    latitude: float
    longitude: float
    timestamp: datetime
    frp: Optional[float] = None

@app.get("/health")
async def health_check():
    if not model_manager.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "healthy", "model_version": model_manager.model_version}

@app.post("/predict", response_model=MLPredictionOutput)
async def predict(req: PredictRequest, db: AsyncSession = Depends(get_db)):
    try:
        pred = await ml_inference_service.predict_observation(
            db=db,
            latitude=req.latitude,
            longitude=req.longitude,
            timestamp=req.timestamp,
            frp=req.frp
        )
        return pred
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
