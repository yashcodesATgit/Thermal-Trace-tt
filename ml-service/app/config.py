import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:pass@localhost:5432/thermaldb"

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url.replace(":6543/", ":5432/")

    model_path: str = os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "thermalwatch_model.joblib"))
    port: int = 8001

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
