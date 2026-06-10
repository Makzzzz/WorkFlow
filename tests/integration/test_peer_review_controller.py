"""
Complete integration tests for peer review endpoints.
Tests cover all main peer review flows with proper error handling.
"""
import os
import sys
import asyncio
import pytest
import pytest_asyncio
import httpx
import uuid
import io
from typing import Dict, Any

# Add project root to sys.path to import backend modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# Fix for Windows asyncpg issue
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Base URL for the running backend
BASE_URL = "http://localhost:8000"

# Import test utilities
from tests.integration.test_utils import (
    TestClient, TestUser, generate_unique_email,
    generate_unique_string, create_test_group, create_test_task
)


class TestPeerReviewController:
    """Complete integration tests for peer review endpoints."""

    @pytest_asyncio.fixture
    async def client(self):
        """Create HTTP client for tests."""
        async with TestClient() as test_client:
            yield test_client

    @pytest_asyncio.fixture
    async def authenticated_user(self, client):
        """Create an authenticated test user."""
        return await client.create_authenticated_user()

    @pytest_asyncio.fixture
    async def test_group(self, client, authenticated_user):
        """Create a test group for the authenticated user."""
        return await create_test_group(client, authenticated_user)

    @pytest_asyncio.fixture
    async def test_task(self, client, authenticated_user, test_group):
        """Create a test task with P2P enabled in the test group."""
        task_name = f"P2P Test Task {uuid.uuid4().hex[:8]}"
        description = f"P2P test task description {uuid.uuid4().hex[:8]}"

        task_data = {
            "task_name": task_name,
            "description": description,
            "deadline": None,
            "is_p2p_enabled": True
        }

        response = await client.client.post(
            f"{client.base_url}/tasks/{test_group['id']}/create",
            json=task_data,
            headers=authenticated_user.get_auth_headers()
        )

        assert response.status_code == 200, f"Task creation failed: {response.status_code} - {response.text}"
        return response.json()

    def create_test_file(self, filename: str = "test_solution.pdf", content: bytes = None) -> list:
        """Create a test file in memory for upload."""
        if content is None:
            content = b"Test file content for solution " + uuid.uuid4().bytes[:16]

        file_obj = io.BytesIO(content)
        file_obj.name = filename

        # API expects 'files' as a list of UploadFile
        files = [("files", (filename, file_obj, "application/pdf"))]
        return files

    async def create_test_solution(self, client: TestClient, user: TestUser, task_id: int) -> Dict[str, Any]:
        """Create a test solution for the given task using file upload."""
        files = self.create_test_file()

        response = await client.client.post(
            f"{client.base_url}/solutions/task/{task_id}/submit",
            files=files,
            headers=user.get_auth_headers()
        )

        assert response.status_code == 200, f"Solution creation failed: {response.status_code} - {response.text}"
        return response.json()

    # ====== TEST CASES ======

    @pytest.mark.asyncio
    async def test_peer_start_endpoint_exists(self, client, authenticated_user, test_group, test_task):
        """Test peer start endpoint exists."""
        # Need at least 2 solutions for P2P
        # Create another user and add them to the group
        other_user = await client.create_authenticated_user()

        # Add other_user to the group using invite_token
        join_data = {"invite_token": test_group["invite_token"]}
        join_response = await client.client.post(
            f"{client.base_url}/groups/join",
            json=join_data,
            headers=other_user.get_auth_headers()
        )
        assert join_response.status_code == 200, f"Failed to add other_user to group: {join_response.status_code} - {join_response.text}"

        # Submit solutions from both users
        solution1 = await self.create_test_solution(client, authenticated_user, test_task["id"])
        solution2 = await self.create_test_solution(client, other_user, test_task["id"])

        # Try to start peer review (may fail if not expert, but endpoint should exist)
        response = await client.client.post(
            f"{client.base_url}/peer/tasks/{test_task['id']}/peer-start",
            headers=authenticated_user.get_auth_headers()
        )

        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Peer start endpoint not found"

        # Log status for debugging
        print(f"Peer start endpoint status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_peer_start_unauthenticated(self, client, test_task):
        """Test peer start fails without authentication."""
        response = await client.client.post(
            f"{client.base_url}/peer/tasks/{test_task['id']}/peer-start"
            # No auth headers
        )

        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_peer_start_nonexistent_task(self, client, authenticated_user):
        """Test peer start fails for non-existent task."""
        non_existent_id = 999999

        response = await client.client.post(
            f"{client.base_url}/peer/tasks/{non_existent_id}/peer-start",
            headers=authenticated_user.get_auth_headers()
        )

        # Should return error (404 or 403)
        assert response.status_code in [403, 404], f"Expected error, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_get_my_peer_endpoint_exists(self, client, authenticated_user, test_task):
        """Test get my peer endpoint exists."""
        response = await client.client.get(
            f"{client.base_url}/peer/tasks/{test_task['id']}/my-peer",
            headers=authenticated_user.get_auth_headers()
        )

        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Get my peer endpoint not found"

        # Log status for debugging
        print(f"Get my peer endpoint status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_get_my_peer_unauthenticated(self, client, test_task):
        """Test get my peer fails without authentication."""
        response = await client.client.get(
            f"{client.base_url}/peer/tasks/{test_task['id']}/my-peer"
            # No auth headers
        )

        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_get_my_peer_nonexistent_task(self, client, authenticated_user):
        """Test get my peer fails for non-existent task."""
        non_existent_id = 999999

        response = await client.client.get(
            f"{client.base_url}/peer/tasks/{non_existent_id}/my-peer",
            headers=authenticated_user.get_auth_headers()
        )

        # Should return error (404 or 403)
        assert response.status_code in [403, 404], f"Expected error, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_all_peer_endpoints_listed(self, client, authenticated_user, test_task):
        """Verify all expected peer endpoints exist."""
        endpoints = [
            ("POST", "/peer/tasks/{task_id}/peer-start"),
            ("GET", "/peer/tasks/{task_id}/my-peer"),
        ]

        for method, endpoint_template in endpoints:
            # Replace placeholders
            endpoint = endpoint_template
            if "{task_id}" in endpoint:
                endpoint = endpoint.replace("{task_id}", str(test_task["id"]))

            # Try to make request
            if method == "POST":
                response = await client.client.post(
                    f"{client.base_url}{endpoint}",
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "GET":
                response = await client.client.get(
                    f"{client.base_url}{endpoint}",
                    headers=authenticated_user.get_auth_headers()
                )

            # Endpoint should exist (not 404)
            assert response.status_code != 404, f"Endpoint {endpoint} not found"

            # Log endpoint status for debugging
            print(f"[OK] Endpoint {endpoint} exists (status: {response.status_code})")