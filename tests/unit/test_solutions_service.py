"""
Unit tests for SolutionService methods.
These tests verify the behavior of service methods in isolation.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from backend.src.services.solutions_service import SolutionService
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus
from backend.src.infrastructure.dbEntities.solution import Solution


@pytest_asyncio.fixture
def mock_session():
    """Create a mock SQLAlchemy session."""
    return AsyncMock(spec=AsyncSession)


@pytest_asyncio.fixture
def mock_s3_service():
    """Create a mock S3 service."""
    return AsyncMock()


@pytest_asyncio.fixture
def solution_service(mock_session, mock_s3_service):
    """Create a SolutionService instance with mock dependencies."""
    return SolutionService(mock_session, mock_s3_service)


class TestSolutionService:
    """Unit tests for SolutionService methods."""
    
    @pytest.mark.asyncio
    async def test_update_solution_status_success(self, solution_service, mock_session):
        """Test successful update of solution status."""
        # Setup
        mock_solution = MagicMock()
        mock_session.get.return_value = mock_solution
        
        # Execute
        result = await solution_service.update_solution_status(1, SolutionStatus.CHECKED)
        
        # Verify
        assert result is mock_solution
        mock_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_solution_status_not_found(self, solution_service, mock_session):
        """Test update solution status when solution not found."""
        # Setup
        mock_session.get.return_value = None
        
        # Execute
        result = await solution_service.update_solution_status(1, SolutionStatus.CHECKED)
        
        # Verify
        assert result is None