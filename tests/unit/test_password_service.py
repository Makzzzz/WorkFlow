"""
Unit tests for PasswordService.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY
from backend.src.services.auth.password_services import PasswordService
from backend.src.infrastructure.repositories.user_repo import UserRepo


class TestPasswordService:
    """Unit tests for PasswordService."""
    
    @pytest.fixture
    def mock_user_repo(self):
        """Create a mock UserRepo."""
        return AsyncMock(spec=UserRepo)
    
    @pytest.fixture
    def password_service(self, mock_user_repo):
        """Create PasswordService instance with mock repo."""
        return PasswordService(mock_user_repo)
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "TestPassword123!"
        
        # Hash password
        hashed = PasswordService.hash_password(password)
        
        # Should return a string
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        # Should not be the same as original password
        assert hashed != password
    
    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "TestPassword123!"
        hashed = PasswordService.hash_password(password)
        
        # Verify with correct password
        result = PasswordService.verify_password(password, hashed)
        
        assert result is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword123!"
        hashed = PasswordService.hash_password(password)
        
        # Verify with wrong password
        result = PasswordService.verify_password(wrong_password, hashed)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_change_password_success(self, password_service, mock_user_repo):
        """Test successful password change."""
        user_id = 1
        old_password = "OldPassword123!"
        new_password = "NewPassword123!"
        
        # Mock user with old password hash
        mock_user = MagicMock()
        mock_user.password_hash = PasswordService.hash_password(old_password)
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        
        # Change password
        result = await password_service.change_password(user_id, old_password, new_password)
        
        # Should succeed
        assert result is True
        
        # Verify interactions
        mock_user_repo.get_user_by_id.assert_called_once_with(user_id)
        # update_user should be called with UserUpdate object and user.id
        mock_user_repo.update_user.assert_called_once()
        call_args = mock_user_repo.update_user.call_args
        assert call_args[0][1] == mock_user.id  # user_id parameter
        # First argument should be a UserUpdate with password field
        user_update = call_args[0][0]
        assert hasattr(user_update, 'password')
        assert user_update.password is not None
        
        # New password hash should be different from old
        new_hash = user_update.password
        assert new_hash != mock_user.password_hash
    
    @pytest.mark.asyncio
    async def test_change_password_user_not_found(self, password_service, mock_user_repo):
        """Test password change for non-existent user."""
        user_id = 999
        old_password = "OldPassword123!"
        new_password = "NewPassword123!"
        
        mock_user_repo.get_user_by_id.return_value = None
        
        # Should raise ValueError
        with pytest.raises(ValueError, match="User not found"):
            await password_service.change_password(user_id, old_password, new_password)
    
    @pytest.mark.asyncio
    async def test_change_password_wrong_old_password(self, password_service, mock_user_repo):
        """Test password change with wrong old password."""
        user_id = 1
        old_password = "OldPassword123!"
        wrong_old_password = "WrongOldPassword123!"
        new_password = "NewPassword123!"
        
        # Mock user with correct old password hash
        mock_user = MagicMock()
        mock_user.password_hash = PasswordService.hash_password(old_password)
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        
        # Try to change with wrong old password
        result = await password_service.change_password(user_id, wrong_old_password, new_password)
        
        # Should fail
        assert result is False
        
        # User should not be updated
        mock_user_repo.update_user.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_reset_password_success(self, password_service, mock_user_repo):
        """Test successful password reset (admin function)."""
        user_id = 1
        new_password = "NewPassword123!"
        
        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user_repo.get_user_by_id.return_value = mock_user
        
        # Reset password
        result = await password_service.reset_password(user_id, new_password)
        
        # Should succeed
        assert result is True
        
        # Verify interactions
        mock_user_repo.get_user_by_id.assert_called_once_with(user_id)
        # update_user should be called with UserUpdate object and user.id
        mock_user_repo.update_user.assert_called_once()
        call_args = mock_user_repo.update_user.call_args
        assert call_args[0][1] == user_id  # user_id parameter
        # First argument should be a UserUpdate with password field
        user_update = call_args[0][0]
        assert hasattr(user_update, 'password')
        assert user_update.password is not None
    
    @pytest.mark.asyncio
    async def test_reset_password_user_not_found(self, password_service, mock_user_repo):
        """Test password reset for non-existent user."""
        user_id = 999
        new_password = "NewPassword123!"
        
        mock_user_repo.get_user_by_id.return_value = None
        
        # Should raise ValueError
        with pytest.raises(ValueError, match="User not found"):
            await password_service.reset_password(user_id, new_password)
    
    def test_generate_random_password(self):
        """Test random password generation."""
        password = PasswordService.generate_random_password()
        
        # Should be a string
        assert isinstance(password, str)
        assert len(password) >= 8  # At least 8 characters
        
        # Should contain different character types (not enforced, but likely)
        # Just check it's not empty
        assert password != ""
    
    def test_validate_password_strength_strong(self):
        """Test password strength validation with strong password."""
        strong_passwords = [
            "TestPassword123!",
            "MyP@ssw0rd2024",
            "A1b2C3d4E5f6!",
            "LongPasswordWithSpecialChars@123"
        ]
        
        for password in strong_passwords:
            result = PasswordService.validate_password_strength(password)
            assert result is True, f"Password '{password}' should be strong"
    
    def test_validate_password_strength_weak(self):
        """Test password strength validation with weak passwords."""
        weak_passwords = [
            "12345678",  # Only digits
            "abcdefgh",  # Only lowercase
            "ABCDEFGH",  # Only uppercase
            "abc123",    # Too short
            "password",  # Common word
            "",          # Empty
        ]
        
        for password in weak_passwords:
            result = PasswordService.validate_password_strength(password)
            assert result is False, f"Password '{password}' should be weak"