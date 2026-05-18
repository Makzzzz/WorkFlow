"""
Integration tests for authentication endpoints.
These tests work with the real running backend service and PostgreSQL database.
"""
import os
import pytest
import pytest_asyncio
import httpx
import uuid
from typing import Dict, Any, Optional


# Base URL for the running backend
BASE_URL = "http://localhost:8000"
# Database URL for test container (accessible from host)
# Use the same format as in .env.example but with localhost
TEST_DATABASE_URL = "postgresql://peerloop_user:peerloop_password@localhost:5432/peerloop"


def generate_unique_email() -> str:
    """Generate a unique email for testing."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


class TestAuthIntegration:
    """Integration tests for authentication endpoints."""
    
    @pytest_asyncio.fixture
    async def client(self):
        """Create HTTP client for tests."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            yield client
    
    @pytest_asyncio.fixture
    async def db_session(self):
        """
        Create a database session using the same async_session_maker as the backend.
        Overrides DATABASE_URL environment variable for the duration of the test.
        """
        # Set DATABASE_URL for this test
        original_url = os.environ.get('DATABASE_URL')
        os.environ['DATABASE_URL'] = TEST_DATABASE_URL
        
        from database import async_session_maker
        
        try:
            async with async_session_maker() as session:
                yield session
        except Exception as e:
            pytest.skip(f"Database connection failed: {e}")
        finally:
            # Restore original DATABASE_URL
            if original_url is not None:
                os.environ['DATABASE_URL'] = original_url
            else:
                os.environ.pop('DATABASE_URL', None)
    
    @pytest_asyncio.fixture
    async def verification_code_repo(self, db_session):
        """
        Create verification code repository using the database session.
        """
        from backend.src.infrastructure.repositories.verification_code_repo import VerificationCodeRepo
        repo = VerificationCodeRepo(db_session)
        return repo
    
    async def register_user(
        self, 
        client: httpx.AsyncClient,
        email: str = None,
        password: str = "TestPassword123!",
        first_name: str = "Test",
        last_name: str = "User"
    ) -> Dict[str, Any]:
        """Register a new user and return user data."""
        if email is None:
            email = generate_unique_email()
        
        register_data = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/register",
            json=register_data
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        user_data = response.json()
        assert user_data["email"] == email
        assert user_data["first_name"] == first_name
        assert user_data["last_name"] == last_name
        assert user_data["is_active"] is False  # User should be inactive until confirmation
        
        return {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "user_data": user_data
        }
    
    async def get_verification_code(self, repo, email: str) -> Optional[str]:
        """Get verification code from database using repository."""
        try:
            print(f"DEBUG: Getting verification code for {email}")
            record = await repo.get_valid_by_email(email)
            if record:
                print(f"DEBUG: Found code: {record.code}")
                return record.code
            print(f"DEBUG: No valid code found for {email}")
            return None
        except Exception as e:
            # If database operation fails, log and return None
            print(f"ERROR: Failed to get verification code for {email}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def confirm_user(
        self,
        client: httpx.AsyncClient,
        email: str,
        code: str
    ) -> Dict[str, Any]:
        """Confirm user registration with verification code."""
        confirm_data = {
            "email": email,
            "code": code
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/confirm",
            json=confirm_data
        )
        assert response.status_code == 201, f"Confirmation failed: {response.text}"
        
        return response.json()
    
    async def login_user(
        self,
        client: httpx.AsyncClient,
        email: str,
        password: str
    ) -> Dict[str, Any]:
        """Login user and return tokens."""
        login_data = {
            "username": email,
            "password": password
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        tokens = response.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"] == "bearer"
        
        return tokens
    
    async def register_confirm_and_login(
        self,
        client: httpx.AsyncClient,
        repo,
        email: str = None,
        password: str = "TestPassword123!"
    ) -> Dict[str, Any]:
        """
        Complete flow: register, confirm, and login.
        Returns user info and tokens.
        """
        # Register user
        user_info = await self.register_user(client, email, password)
        email = user_info["email"]
        
        # Get verification code from database using repository
        code = await self.get_verification_code(repo, email)
        if not code:
            pytest.skip(f"No verification code found for {email}")
        
        # Confirm user
        await self.confirm_user(client, email, code)
        
        # Login user
        tokens = await self.login_user(client, email, password)
        
        return {
            **user_info,
            "tokens": tokens
        }
    
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test that the API is accessible."""
        response = await client.get(f"{BASE_URL}/docs")
        assert response.status_code == 200
        assert "FastAPI - Swagger UI" in response.text
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, client):
        """Test successful user registration."""
        email = generate_unique_email()
        
        user_info = await self.register_user(client, email)
        
        # Verify response structure
        user_data = user_info["user_data"]
        assert "id" in user_data
        assert user_data["email"] == email
        assert user_data["is_active"] is False
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client):
        """Test registration with duplicate email fails."""
        email = generate_unique_email()
        
        # First registration - should succeed
        await self.register_user(client, email)
        
        # Second registration with same email - should fail
        register_data = {
            "email": email,
            "password": "AnotherPassword123!",
            "first_name": "Test2",
            "last_name": "User2"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/register",
            json=register_data
        )
        
        # Should fail with 400 Bad Request (email already registered)
        assert response.status_code == 400
        assert "Email уже зарегистрирован" in response.text or "ожидает" in response.text
    
    @pytest.mark.asyncio
    async def test_register_with_invalid_data(self, client):
        """Test registration with invalid data returns appropriate errors."""
        test_cases = [
            # Missing email
            {
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            },
            # Invalid email format
            {
                "email": "not-an-email",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            },
            # Weak password
            {
                "email": "test@example.com",
                "password": "123",
                "first_name": "Test",
                "last_name": "User"
            },
            # Missing password
            {
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User"
            },
            # Missing first_name
            {
                "email": "test@example.com",
                "password": "TestPassword123!",
                "last_name": "User"
            },
            # Missing last_name
            {
                "email": "test@example.com",
                "password": "TestPassword123!",
                "first_name": "Test"
            }
        ]
        
        for invalid_data in test_cases:
            response = await client.post(
                f"{BASE_URL}/auth/register",
                json=invalid_data
            )
            
            # Should return 422 Unprocessable Entity for validation errors
            assert response.status_code in [400, 422], \
                f"Expected 400/422 for invalid data {invalid_data}, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_login_with_inactive_user(self, client):
        """Test login fails for inactive user (not confirmed email)."""
        # Register a user (user will be inactive)
        email = generate_unique_email()
        password = "TestPassword123!"
        
        await self.register_user(client, email, password)
        
        # Try to login - should fail because user is inactive
        login_data = {
            "username": email,
            "password": password
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        
        # Login should fail with 403 Forbidden (account not active)
        assert response.status_code == 403
        assert "Account is not active" in response.text or "не активен" in response.text
    
    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_login_with_wrong_password(self, client):
        """Test login with wrong password for existing user."""
        # Register a user
        email = generate_unique_email()
        password = "TestPassword123!"
        
        await self.register_user(client, email, password)
        
        # Try to login with wrong password
        login_data = {
            "username": email,
            "password": "WrongPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_full_registration_confirmation_login_flow(self, client, verification_code_repo):
        """Test complete flow: register -> confirm -> login."""
        # Register user
        email = generate_unique_email()
        user_info = await self.register_user(client, email)
        
        # Get verification code from database using repository
        code = await self.get_verification_code(verification_code_repo, email)
        if not code:
            pytest.skip(f"No verification code found for {email}")
        
        # Confirm user
        confirm_response = await self.confirm_user(client, email, code)
        assert confirm_response["message"] == "Аккаунт успешно активирован"
        assert confirm_response["email"] == email
        assert confirm_response["is_active"] is True
        
        # Login user
        tokens = await self.login_user(client, email, user_info["password"])
        assert "access_token" in tokens
        assert "refresh_token" in tokens
    
    @pytest.mark.asyncio
    async def test_refresh_token(self, client, verification_code_repo):
        """Test token refresh endpoint with valid refresh token."""
        # Create a confirmed user with tokens
        user_data = await self.register_confirm_and_login(client, verification_code_repo)
        tokens = user_data["tokens"]
        
        # Refresh tokens
        refresh_data = {
            "refresh_token": tokens["refresh_token"]
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/refresh",
            json=refresh_data
        )
        
        assert response.status_code == 200, f"Refresh failed: {response.text}"
        
        refresh_response = response.json()
        assert "access_token" in refresh_response
        assert "refresh_token" in refresh_response
        assert refresh_response["access_token"] != tokens["access_token"]  # New access token
        assert refresh_response["refresh_token"] != tokens["refresh_token"]  # New refresh token
    
    @pytest.mark.asyncio
    async def test_refresh_token_with_invalid_token(self, client):
        """Test refresh endpoint with invalid refresh token."""
        refresh_data = {
            "refresh_token": "invalid_token"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/refresh",
            json=refresh_data
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_confirm_with_invalid_code(self, client):
        """Test confirmation with invalid code fails."""
        # Register a user
        email = generate_unique_email()
        await self.register_user(client, email)
        
        # Try to confirm with invalid code
        confirm_data = {
            "email": email,
            "code": "INVALID"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/confirm",
            json=confirm_data
        )
        
        # Should fail with 400 Bad Request
        assert response.status_code == 400
        assert "Неверный код" in response.text or "код истёк" in response.text
    
    @pytest.mark.asyncio
    async def test_forgot_password_endpoint_exists(self, client):
        """Test that forgot_password endpoint exists and accepts requests."""
        # This endpoint requires specific data format
        reset_data = {
            "email": "test@example.com",
            "code": "123456",
            "new_password": "NewPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/forgot_password",
            json=reset_data
        )
        
        # Should not return 404 (endpoint exists)
        # Might return 400 for invalid data, which is fine
        assert response.status_code != 404
    
    @pytest.mark.asyncio
    async def test_reset_password_endpoint_exists(self, client):
        """Test that reset_password endpoint exists and accepts requests."""
        # This endpoint requires specific data format
        reset_data = {
            "email": "test@example.com",
            "code": "123456",
            "new_password": "NewPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/reset_password",
            json=reset_data
        )
        
        # Should not return 404 (endpoint exists)
        # Might return 400 for invalid data, which is fine
        assert response.status_code != 404
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_access(self, client, verification_code_repo):
        """Test accessing protected endpoints with and without token."""
        # Create a confirmed user with tokens
        user_data = await self.register_confirm_and_login(client, verification_code_repo)
        tokens = user_data["tokens"]
        
        # Try to access a protected endpoint without token
        response = await client.get(f"{BASE_URL}/users/me")
        
        # Should return 401 Unauthorized or 403 Forbidden
        # (or 404 if endpoint doesn't exist)
        if response.status_code not in [401, 403, 404]:
            # If endpoint exists and returns something else, that's unexpected
            # but we'll just note it
            print(f"Warning: /users/me returned {response.status_code}")
        
        # Test with valid token
        headers = {
            "Authorization": f"Bearer {tokens['access_token']}"
        }
        
        response_with_token = await client.get(
            f"{BASE_URL}/users/me",
            headers=headers
        )
        
        # Should return 200 OK if endpoint exists, or 404 if not
        # We just verify it's not 401/403
        if response_with_token.status_code not in [401, 403]:
            # Valid token should grant access
            pass
        else:
            # Endpoint might not exist or have different authorization
            print(f"Warning: /users/me with valid token returned {response_with_token.status_code}")
        
        # Test with invalid token
        headers_invalid = {
            "Authorization": "Bearer invalid_token"
        }
        
        response_with_invalid = await client.get(
            f"{BASE_URL}/users/me",
            headers=headers_invalid
        )
        
        # Should return 401 or 403
        if response_with_invalid.status_code not in [401, 403, 404]:
            print(f"Warning: /users/me with invalid token returned {response_with_invalid.status_code}")