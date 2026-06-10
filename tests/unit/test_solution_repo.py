"""
Unit tests for SolutionRepo methods.
These tests verify the behavior of repository methods in isolation.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.infrastructure.dbEntities.solution import Solution
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus


@pytest_asyncio.fixture
def mock_session():
    """Create a mock SQLAlchemy session."""
    return AsyncMock(spec=AsyncSession)


@pytest_asyncio.fixture
def solution_repo(mock_session):
    """Create a SolutionRepo instance with mock session."""
    return SolutionRepo(mock_session)


class TestSolutionRepo:
    """Unit tests for SolutionRepo methods."""
    
    @pytest.mark.asyncio
    async def test_batch_assign_reviewers_success(self, solution_repo, mock_session):
        """Test successful batch assignment of reviewers."""
        # Setup
        mock_session.execute.return_value = MagicMock(rowcount=1)
        
        # Execute
        result = await solution_repo.batch_assign_reviewers([
            (1, 2),  # solution_id=1, reviewer_id=2
            (3, 4)   # solution_id=3, reviewer_id=4
        ])
        
        # Verify
        assert result is True
        assert mock_session.execute.call_count == 2
        mock_session.flush.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_batch_assign_reviewers_failure(self, solution_repo, mock_session):
        """Test batch assignment failure when solution not found."""
        # Setup
        mock_session.execute.return_value = MagicMock(rowcount=0)
        
        # Execute
        result = await solution_repo.batch_assign_reviewers([
            (1, 2)
        ])
        
        # Verify
        assert result is False
        mock_session.flush.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_update_solution_status_success(self, solution_repo, mock_session):
        """Test successful update of solution status."""
        # Setup
        mock_solution = MagicMock()
        mock_session.execute.return_value = MagicMock(rowcount=1)
        mock_session.get.return_value = mock_solution
        
        # Execute
        result = await solution_repo.update_solution_status(1, SolutionStatus.CHECKED)
        
        # Verify
        assert result is mock_solution
        mock_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_solution_status_not_found(self, solution_repo, mock_session):
        """Test update solution status when solution not found."""
        # Setup
        mock_session.execute.return_value = MagicMock(rowcount=0)
        
        # Execute
        result = await solution_repo.update_solution_status(1, SolutionStatus.CHECKED)
        
        # Verify
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_solution_for_peer_success(self, solution_repo, mock_session):
        """Test successful retrieval of solutions for peer review."""
        # Setup
        mock_solution = MagicMock()
        mock_session.execute.return_value = MagicMock(scalars=MagicMock(return_value=[mock_solution]))
        
        # Execute
        result = await solution_repo.get_solution_for_peer(1)
        
        # Verify
        assert result == [mock_solution]
        mock_session.execute.assert_called_once()