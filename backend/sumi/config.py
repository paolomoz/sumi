from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    google_api_key: str = ""
    fal_api_key: str = ""

    # Model settings
    claude_model: str = "claude-sonnet-4-20250514"
    imagen_model: str = "imagen-4.0-generate-preview-06-06"

    # Server
    cors_origins: list[str] = ["http://localhost:3000"]
    output_dir: str = str(Path(__file__).resolve().parent.parent / "output")

    # Limits
    max_concurrent_jobs: int = 5


settings = Settings()
