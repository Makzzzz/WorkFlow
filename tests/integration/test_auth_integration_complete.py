"""
Complete integration tests for authentication endpoints.
Tests cover all main authentication flows with proper error handling.
"""
import os
import sys
import asyncio
import pytest
import pytest_asyncio
import httpx
import uuid
import time
from typing import Dict, Any, Optional

# Add project root to sys.path to import backend modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# Fix for Windows asyncpg issue
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Base URL for the running backend
BASE_URL = "http://localhost:8000"


def generate_unique_email() -> str:
    """Generate a unique email for testing."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


class TestAuthIntegrationComplete:
    """Complete integration tests for authentication endpoints."""
    
    @pytest_asyncio.fixture
    async def client(self):
        """Create HTTP client for tests."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            yield client
    
    async def get_verification_code(self, client: httpx.AsyncClient, email: str) -> str:
        """
        Get verification code from test endpoint.
        Raises AssertionError if endpoint not available or code not found.
        """
        response = await client.get(
            f"{BASE_URL}/auth/test/get_verification_code",
            params={"email": email},
            timeout=5.0
        )
        
        if response.status_code == 200:
            data = response.json()
            code = data.get("code")
            if code:
                return code
            else:
                raise AssertionError(f"Verification code not returned in response: {data}")
        elif response.status_code == 404:
            # Check if endpoint exists or code not found
            try:
                error_data = response.json()
                if "detail" in error_data and "No verification code found" in error_data["detail"]:
                    raise AssertionError(f"No verification code found for email {email}. Response: {error_data}")
                else:
                    raise AssertionError(f"Test endpoint returned 404 with unexpected response: {error_data}")
            except:
                raise AssertionError("Test endpoint not available (404 without JSON)")
        else:
            raise AssertionError(f"Unexpected status code from test endpoint: {response.status_code}, response: {response.text}")
    
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
        
        # Should return 200 for success
        assert response.status_code == 200, f"Registration failed: {response.status_code} - {response.text}"
        
        user_data = response.json()
        assert user_data["email"] == email
        assert user_data["first_name"] == first_name
        assert user_data["last_name"] == last_name
        # User should be inactive until confirmation
        assert user_data["is_active"] is False
        
        return {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "user_data": user_data
        }
    
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
        
        # Should return 201 for successful confirmation
        assert response.status_code == 201, f"Confirmation failed: {response.status_code} - {response.text}"
        
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
        
        # Should return 200 for successful login
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        tokens = response.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"].lower() == "bearer"
        
        return tokens
    
    # ====== TEST CASES ======
    
    @pytest.mark.asyncio
    async def test_backend_accessible(self, client):
        """Test that backend is running and accessible."""
        # Try to access docs or any endpoint
        response = await client.get(f"{BASE_URL}/docs")
        assert response.status_code in [200, 404], f"Backend not accessible: {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_register_success(self, client):
        """Test successful user registration."""
        email = generate_unique_email()
        user_info = await self.register_user(client, email)
        
        assert user_info["email"] == email
        assert user_info["first_name"] == "Test"
        assert user_info["last_name"] == "User"
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client):
        """Test registration with duplicate email fails."""
        email = generate_unique_email()
        
        # First registration should succeed
        await self.register_user(client, email)
        
        # Second registration with same email should fail
        register_data = {
            "email": email,
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/register",
            json=register_data
        )
        
        # Should return error for duplicate email
        assert response.status_code in [400, 409, 422], \
            f"Expected error for duplicate email, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_register_invalid_data(self, client):
        """Test registration with invalid data fails."""
        # Test with invalid email
        register_data = {
            "email": "not-an-email",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/register",
            json=register_data
        )
        
        # Should return validation error
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_confirm_with_invalid_code(self, client):
        """Test confirmation fails with invalid verification code."""
        email = generate_unique_email()
        
        # Register user
        await self.register_user(client, email)
        
        # Try to confirm with invalid code
        confirm_data = {
            "email": email,
            "code": "INVALID123"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/confirm",
            json=confirm_data
        )
        
        # Should return error for invalid code
        assert response.status_code in [400, 404], f"Expected error for invalid code, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client):
        """Test login fails for inactive (unconfirmed) user."""
        email = generate_unique_email()
        
        # Register user (inactive by default)
        await self.register_user(client, email)
        
        # Try to login
        login_data = {
            "username": email,
            "password": "TestPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        
        # Should fail because user is not active
        assert response.status_code in [400, 401, 403], \
            f"Expected error for inactive user, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client):
        """Test login fails with invalid credentials."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data=login_data
        )
        
        # Should fail with invalid credentials
        assert response.status_code in [400, 401], \
            f"Expected error for invalid credentials, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_full_auth_flow_with_test_endpoint(self, client):
        """
        Test complete auth flow using test endpoint.
        """
        # Register user
        email = generate_unique_email()
        user_info = await self.register_user(client, email)
        
        # Wait a bit for verification code
        await asyncio.sleep(1.0)
        
        # Get verification code - will raise AssertionError if not found
        code = await self.get_verification_code(client, email)
        
        # Confirm user
        confirm_response = await self.confirm_user(client, email, code)
        assert confirm_response["email"] == email
        assert confirm_response["is_active"] is True
        
        # Login user
        tokens = await self.login_user(client, email, user_info["password"])
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        
        # Test token refresh
        refresh_data = {
            "refresh_token": tokens["refresh_token"]
        }
        
        refresh_response = await client.post(
            f"{BASE_URL}/auth/refresh",
            json=refresh_data
        )
        
        # Refresh should succeed
        assert refresh_response.status_code == 200, f"Refresh failed: {refresh_response.text}"
        
        refresh_tokens = refresh_response.json()
        assert "access_token" in refresh_tokens
        assert "refresh_token" in refresh_tokens
    
    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client):
        """Test token refresh fails with invalid refresh token."""
        refresh_data = {
            "refresh_token": "invalid.token.here"
        }
        
        response = await client.post(
            f"{BASE_URL}/auth/refresh",
            json=refresh_data
        )
        
        # Should fail with invalid token
        assert response.status_code in [400, 401, 422], \
            f"Expected error for invalid refresh token, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_password_endpoints_exist(self, client):
        """Test password reset endpoints exist."""
        # Forgot password endpoint
        forgot_data = {"email": "test@example.com"}
        forgot_response = await client.post(
            f"{BASE_URL}/auth/forgot_password",
            json=forgot_data
        )
        assert forgot_response.status_code != 404, "Forgot password endpoint not found"
        
        # Reset password endpoint
        reset_data = {
            "email": "test@example.com",
            "code": "TEST123",
            "new_password": "NewPassword123!"
        }
        reset_response = await client.post(
            f"{BASE_URL}/auth/reset_password",
            json=reset_data
        )
        assert reset_response.status_code != 404, "Reset password endpoint not found"
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_with_token(self, client):
        """
        Test accessing protected endpoint with valid token.
        """
        # Create a confirmed user
        email = generate_unique_email()
        user_info = await self.register_user(client, email)
        
        await asyncio.sleep(1.0)
        code = await self.get_verification_code(client, email)
        
        await self.confirm_user(client, email, code)
        tokens = await self.login_user(client, email, user_info["password"])
        
        # Try to access protected endpoint
        headers = {
            "Authorization": f"Bearer {tokens['access_token']}"
        }
        
        # Try common protected endpoints
        endpoints_to_try = [
            f"{BASE_URL}/auth/me",
            f"{BASE_URL}/auth/profile",
            f"{BASE_URL}/users/me"
        ]
        
        for endpoint in endpoints_to_try:
            response = await client.get(endpoint, headers=headers)
            # If endpoint exists (not 404), token should be accepted (not 401)
            if response.status_code != 404:
                assert response.status_code != 401, f"Token rejected for {endpoint}"
                break
    
    @pytest.mark.asyncio
    async def test_all_auth_endpoints_listed(self, client):
        """Verify all expected auth endpoints exist."""
        endpoints = [
            ("POST", "/auth/register"),
            ("POST", "/auth/confirm"),
            ("POST", "/auth/login"),
            ("POST", "/auth/refresh"),
            ("POST", "/auth/forgot_password"),
            ("POST", "/auth/reset_password"),
        ]
        
        for method, endpoint in endpoints:
            # Try to make request and check not 404
            if method == "POST":
                response = await client.post(
                    f"{BASE_URL}{endpoint}",
                    json={}  # Empty payload, will likely fail but not 404
                )
            else:
                response = await client.get(f"{BASE_URL}{endpoint}")
            
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
            print(f"✓ Endpoint {endpoint} exists (status: {response.status_code})")