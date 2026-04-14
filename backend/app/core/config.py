from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "CipherTrust"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ciphertrust"

    @property
    def async_database_url(self) -> str:
        """Return DATABASE_URL with asyncpg driver, handling Render's postgres:// scheme."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "change_this_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # SMTP (for OTP emails)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@ciphertrust.io"
    SMTP_TLS: bool = True

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "https://ciphertrust.vercel.app"]

    # Algorand
    ALGORAND_NODE_URL: str = "https://testnet-api.algonode.cloud"
    ALGORAND_INDEXER_URL: str = "https://testnet-idx.algonode.cloud"
    ALGORAND_NETWORK: str = "testnet"
    ALGORAND_DEPLOYER_MNEMONIC: str = ""

    # Smart Contract App IDs (set after deployment)
    IDENTITY_APP_ID: int = 0
    CONSENT_REGISTRY_APP_ID: int = 0
    PROOF_VERIFIER_APP_ID: int = 0
    COMPLIANCE_CERT_APP_ID: int = 0

    # ZK Circuits
    ZK_CIRCUITS_PATH: str = "./zk-circuits/build"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
