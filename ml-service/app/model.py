"""
Model Loader Singleton.
Loads trained XGBoost model from models/thermalwatch_model.joblib into memory once on startup.
"""
import os
import logging
import joblib
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

from app.config import settings

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = settings.model_path

# Authoritative V1 feature contract (8 features)
_DEFAULT_FEATURE_COLUMNS_V1: List[str] = [
    "obs_count",
    "log_mean_frp",
    "log_std_frp",
    "frp_cv",
    "months_active",
    "nearest_osm_distance_km",
    "active_duration_days",
    "first_seen_month",
]


class MLModelManager:
    """Thread-safe singleton managing ML model lifecycle and inference execution."""

    _instance: Optional["MLModelManager"] = None
    _model: Any = None
    _class_names: List[str] = ["industrial_thermal_source", "mining_thermal_source", "natural_fire", "unknown"]
    _feature_columns: List[str] = _DEFAULT_FEATURE_COLUMNS_V1
    _model_version: str = "thermalwatch-v1"
    _loaded: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLModelManager, cls).__new__(cls)
        return cls._instance

    def load_model(self) -> bool:
        """Loads model weights from joblib file into memory."""
        if self._loaded and self._model is not None:
            return True

        if not os.path.exists(MODEL_PATH):
            logger.warning(f"ML Model file not found at {MODEL_PATH}. Running in abstention mode.")
            return False

        try:
            artifact = joblib.load(MODEL_PATH)
            if isinstance(artifact, dict):
                self._model = artifact.get("model")
                le = artifact.get("label_encoder")
                if le is not None and hasattr(le, "classes_"):
                    self._class_names = [str(c) for c in le.classes_]
                else:
                    self._class_names = artifact.get("class_names", self._class_names)

                self._feature_columns = artifact.get("feature_columns", self._feature_columns)
                self._model_version = artifact.get("model_version", "thermalwatch-v1")
            else:
                self._model = artifact

            self._loaded = True
            logger.info(f"Successfully loaded ML model version '{self._model_version}' with {len(self._feature_columns)} features into memory.")
            return True
        except Exception as e:
            logger.error(f"Error loading ML model from {MODEL_PATH}: {e}")
            return False

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self._model is not None

    @property
    def model(self) -> Any:
        return self._model

    @property
    def class_names(self) -> List[str]:
        return self._class_names

    @property
    def feature_columns(self) -> List[str]:
        return self._feature_columns

    @property
    def model_version(self) -> str:
        return self._model_version


model_manager = MLModelManager()
