import asyncio
import pytest
import pytest_asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from fastapi import Depends

# Add parent directory to sys.path to import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db_session
from backend.src.main import app
from backend.src.services.s3_service import S3StorageService
from unittest.mock import AsyncMock, MagicMock


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Create async engine for SQLite in-memory database."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def async_session(async_engine):
    """Create async session for tests."""
    async_session_maker = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session

@pytest_asyncio.fixture(scope="function")
async def db_session(async_session):
    """Fixture to replace get_db_session dependency."""
    yield async_session

@pytest.fixture(scope="function")
def test_client(db_session):
    """Create FastAPI test client with overridden database dependency and mocked S3."""
    from backend.src.api.routes.solutions_router import get_s3_service, get_solution_service
    from backend.src.services.s3_service import S3StorageService
    from unittest.mock import AsyncMock
    
    # Create mock S3 service
    mock_s3 = AsyncMock(spec=S3StorageService)
    mock_s3.upload_file.return_value = "https://mock-s3.example.com/solutions/task_1/test_file.pdf"
    
    # Override the get_db_session dependency
    async def override_get_db_session():
        yield db_session
    
    # Override get_s3_service to return mock
    def override_get_s3_service():
        return mock_s3
    
    # Override get_solution_service to use mock S3
    def override_get_solution_service(
        session=Depends(override_get_db_session),
        s3_service=Depends(override_get_s3_service)
    ):
        from backend.src.services.solutions_service import SolutionService
        return SolutionService(session, s3_service)
    
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_s3_service] = override_get_s3_service
    app.dependency_overrides[get_solution_service] = override_get_solution_service
    
    with TestClient(app) as client:
        yield client
    
    # Clear overrides after test
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_settings():
    """Override settings for testing."""
    from backend.src.services.auth.config import Settings, get_settings
    
    class TestSettings(Settings):
        model_config = {
            "env_file": ".env.test",
            "extra": "ignore"
        }
        JWT_SECRET_KEY: str = "test-secret-key"
        JWT_ALGORITHM: str = "HS256"
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
        MAIL_SERVER: str = "smtp.test.com"
        MAIL_PORT: int = 587
        MAIL_USERNAME: str = "test@example.com"
        MAIL_PASSWORD: str = "test-password"
        MAIL_FROM: str = "test@example.com"
    
    # Override get_settings dependency
    app.dependency_overrides[get_settings] = lambda: TestSettings()
    yield TestSettings()
    app.dependency_overrides.pop(get_settings, None)