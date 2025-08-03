import os

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict

load_dotenv()


class GlobalConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = os.environ.get("TITLE")
    description: str = os.environ.get("DESCRIPTION")
    version: str = os.environ.get("VERSION", "1.0.0")
    cors_origins: str = os.environ.get("CORS_ORIGINS")
    # openapi_prefix: str = os.environ.get("OPENAPI_PREFIX")
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    openapi_url: str = "/openapi.json"
    api_prefix: str = "/api"
    # debug: bool = os.environ.get("DEBUG")

    postgres_user: str = os.environ.get("POSTGRES_USER")
    postgres_password: str = os.environ.get("POSTGRES_PASSWORD")
    postgres_server: str = os.environ.get("POSTGRES_SERVER")
    postgres_port: int = int(os.environ.get("POSTGRES_PORT"))
    postgres_db: str = os.environ.get("POSTGRES_DB")
    # postgres_db_tests: str = os.environ.get("POSTGRES_DB_TESTS")
    # db_echo_log: bool = True if os.environ.get("DEBUG") == "True" else False

    redis_server: str = os.environ.get("REDIS_SERVER")
    redis_port: int = int(os.environ.get("REDIS_PORT"))
    IMAGES_BASE_PATH: str = os.path.join(os.getcwd(), "imagens")

    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM")
    JWT_EXPIRATION_TIME: int = int(os.environ.get("JWT_EXPIRATION_TIME"))

    KEYCLOAK_SERVER_URL: str = os.environ.get("KEYCLOAK_SERVER_URL") or Field(..., description="Keycloak server URL is required")
    KEYCLOAK_CLIENT_ID: str = os.environ.get("KEYCLOAK_CLIENT_ID") or Field(..., description="Keycloak client ID is required")
    KEYCLOAK_REALM_NAME: str = os.environ.get("KEYCLOAK_REALM_NAME") or Field(..., description="Keycloak realm name is required")
    KEYCLOAK_CLIENT_SECRET_KEY: str = os.environ.get("KEYCLOAK_CLIENT_SECRET_KEY") or Field(..., description="Keycloak client secret key is required")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins:
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return []

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_server}:{self.postgres_port}/{self.postgres_db}"

    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_server}:{self.postgres_port}/{self.postgres_db}"


settings = GlobalConfig()
