"""
Test utilities for integration tests.
Shared functions and fixtures for all controller tests.
"""
import os
import sys
import asyncio
import uuid
import httpx
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


def generate_unique_string(prefix: str = "test") -> str:
    """Generate a unique string for testing."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class TestUser:
    """Helper class to manage test user lifecycle."""
    
    def __init__(self, email: str, password: str = "TestPassword123!", 
                 first_name: str = "Test", last_name: str = "User"):
        self.email = email
        self.password = password
        self.first_name = first_name
        self.last_name = last_name
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.user_data: Optional[Dict[str, Any]] = None
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers for authenticated requests."""
        if not self.access_token:
            raise ValueError("User not authenticated. Call authenticate() first.")
        return {"Authorization": f"Bearer {self.access_token}"}


class TestClient:
    """Wrapper around httpx.AsyncClient with test utilities."""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.client = None
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def register_user(self, email: str = None, **kwargs) -> TestUser:
        """Register a new user and return TestUser object."""
        if email is None:
            email = generate_unique_email()
        
        register_data = {
            "email": email,
            "password": kwargs.get("password", "TestPassword123!"),
            "first_name": kwargs.get("first_name", "Test"),
            "last_name": kwargs.get("last_name", "User")
        }
        
        response = await self.client.post(
            f"{self.base_url}/auth/register",
            json=register_data
        )
        
        assert response.status_code == 200, f"Registration failed: {response.status_code} - {response.text}"
        
        user_data = response.json()
        
        user = TestUser(
            email=email,
            password=register_data["password"],
            first_name=register_data["first_name"],
            last_name=register_data["last_name"]
        )
        user.user_data = user_data
        user.user_id = user_data.get("id")
        
        return user
    
    async def get_verification_code(self, email: str) -> str:
        """Get verification code from test endpoint."""
        response = await self.client.get(
            f"{self.base_url}/auth/test/get_verification_code",
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
    
    async def confirm_user(self, email: str, code: str) -> Dict[str, Any]:
        """Confirm user registration with verification code."""
        confirm_data = {
            "email": email,
            "code": code
        }
        
        response = await self.client.post(
            f"{self.base_url}/auth/confirm",
            json=confirm_data
        )
        
        assert response.status_code == 201, f"Confirmation failed: {response.status_code} - {response.text}"
        
        return response.json()
    
    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Login user and return tokens."""
        login_data = {
            "username": email,
            "password": password
        }
        
        response = await self.client.post(
            f"{self.base_url}/auth/login",
            data=login_data
        )
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        tokens = response.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"].lower() == "bearer"
        
        return tokens
    
    async def create_authenticated_user(self) -> TestUser:
        """Create, confirm, and authenticate a test user."""
        # Create user
        user = await self.register_user()
        
        # Wait a bit for verification code
        await asyncio.sleep(1.0)
        
        # Get verification code
        code = await self.get_verification_code(user.email)
        
        # Confirm user
        await self.confirm_user(user.email, code)
        
        # Login user
        tokens = await self.login_user(user.email, user.password)
        
        # Update user object with tokens
        user.access_token = tokens["access_token"]
        user.refresh_token = tokens["refresh_token"]
        
        return user
    
    async def make_request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        """Make HTTP request with proper URL construction."""
        url = f"{self.base_url}{endpoint}"
        
        if method.upper() == "GET":
            return await self.client.get(url, **kwargs)
        elif method.upper() == "POST":
            return await self.client.post(url, **kwargs)
        elif method.upper() == "PUT":
            return await self.client.put(url, **kwargs)
        elif method.upper() == "DELETE":
            return await self.client.delete(url, **kwargs)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")


async def create_test_group(client: TestClient, user: TestUser,
                           group_name: str = None, description: str = None) -> Dict[str, Any]:
    """Create a test group for the given user. Invite token is generated server-side."""
    if group_name is None:
        group_name = f"Test Group {uuid.uuid4().hex[:8]}"
    if description is None:
        description = f"Test group description {uuid.uuid4().hex[:8]}"
    
    group_data = {
        "group_name": group_name,
        "description": description
    }
    
    response = await client.client.post(
        f"{client.base_url}/groups/create",
        json=group_data,
        headers=user.get_auth_headers()
    )
    
    assert response.status_code == 200, f"Group creation failed: {response.status_code} - {response.text}"
    
    return response.json()


async def create_test_task(client: TestClient, user: TestUser, group_id: int,
                          task_name: str = None, description: str = None) -> Dict[str, Any]:
    """Create a test task in the given group."""
    if task_name is None:
        task_name = f"Test Task {uuid.uuid4().hex[:8]}"
    if description is None:
        description = f"Test task description {uuid.uuid4().hex[:8]}"
    
    task_data = {
        "task_name": task_name,
        "description": description,
        "deadline": None,
        "is_p2p_enabled": False
    }
    
    response = await client.client.post(
        f"{client.base_url}/tasks/{group_id}/create",
        json=task_data,
        headers=user.get_auth_headers()
    )
    
    assert response.status_code == 200, f"Task creation failed: {response.status_code} - {response.text}"
    
    return response.json()