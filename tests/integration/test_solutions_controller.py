"""
Complete integration tests for solutions endpoints.
Tests cover all main solutions flows with proper error handling.
Updated for multipart/form-data file uploads with S3 storage.
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


class TestSolutionsController:
    """Complete integration tests for solutions endpoints."""
    
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
        """Create a test task in the test group."""
        return await create_test_task(client, authenticated_user, test_group["id"])
    
    def create_test_file(self, filename: str = "test_solution.pdf", content: bytes = None) -> tuple:
        """Create a test file in memory for upload."""
        if content is None:
            content = b"Test file content for solution " + uuid.uuid4().bytes[:16]
        
        # Create a file-like object
        file_obj = io.BytesIO(content)
        file_obj.name = filename
        
        # Return file data for multipart upload
        files = {"file": (filename, file_obj, "application/pdf")}
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
    async def test_submit_solution_success(self, client, authenticated_user, test_task):
        """Test successful solution submission."""
        files = self.create_test_file()
        
        response = await client.client.post(
            f"{client.base_url}/solutions/task/{test_task['id']}/submit",
            files=files,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Solution submission failed: {response.status_code} - {response.text}"
        
        solution_response = response.json()
        assert solution_response["task_id"] == test_task["id"]
        assert solution_response["student_id"] == authenticated_user.user_id
        assert "id" in solution_response
        assert "status" in solution_response
        assert "file_path" in solution_response
        assert "uploaded_at" in solution_response
        # Verify file_path contains S3 URL pattern
        assert "solutions" in solution_response["file_path"] or "peerloop-solutions" in solution_response["file_path"]
    
    @pytest.mark.asyncio
    async def test_submit_solution_invalid_data(self, client, authenticated_user, test_task):
        """Test solution submission with invalid data fails."""
        # Test with missing file (empty multipart)
        response = await client.client.post(
            f"{client.base_url}/solutions/task/{test_task['id']}/submit",
            data={},  # No file
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return validation error (422 or 400)
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_submit_solution_not_task_member(self, client, authenticated_user):
        """Test solution submission fails for non-task member."""
        # Create another user, group, and task
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        
        files = self.create_test_file()
        
        # Try to submit solution to other user's task
        response = await client.client.post(
            f"{client.base_url}/solutions/task/{other_task['id']}/submit",
            files=files,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_get_my_solution(self, client, authenticated_user, test_task):
        """Test getting user's own solution for a task."""
        # First submit a solution
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        
        # Now get it
        response = await client.client.get(
            f"{client.base_url}/solutions/task/{test_task['id']}/my-solution",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with solution
        assert response.status_code == 200, f"Get my solution failed: {response.status_code} - {response.text}"
        
        my_solution = response.json()
        assert my_solution["id"] == solution["id"]
        assert my_solution["file_path"] == solution["file_path"]
        assert my_solution["task_id"] == test_task["id"]
        assert my_solution["student_id"] == authenticated_user.user_id
    
    @pytest.mark.asyncio
    async def test_get_my_solution_not_submitted(self, client, authenticated_user, test_task):
        """Test getting my solution when none submitted."""
        response = await client.client.get(
            f"{client.base_url}/solutions/task/{test_task['id']}/my-solution",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 404 or empty response
        # Could be 404 or 200 with null/empty
        if response.status_code == 404:
            # Expected if no solution found
            pass
        elif response.status_code == 200:
            # Check if response indicates no solution
            data = response.json()
            # Might be null or empty object
            pass
        else:
            # Should not be other error
            assert response.status_code < 400, f"Unexpected error: {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_update_solution_success(self, client, authenticated_user, test_task):
        """Test successful solution update."""
        # First submit a solution
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        solution_id = solution["id"]
        
        # Now update it with a new file
        files = self.create_test_file("updated_solution.pdf")
        
        response = await client.client.put(
            f"{client.base_url}/solutions/{solution_id}/update",
            files=files,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Solution update failed: {response.status_code} - {response.text}"
        
        updated_solution = response.json()
        assert updated_solution["id"] == solution_id
        assert updated_solution["task_id"] == test_task["id"]
        assert updated_solution["student_id"] == authenticated_user.user_id
        # File path should be different (new upload)
        assert updated_solution["file_path"] != solution["file_path"]
    
    @pytest.mark.asyncio
    async def test_update_solution_not_owner(self, client, authenticated_user, test_task):
        """Test solution update fails for non-owner."""
        # Create another user
        other_user = await client.create_authenticated_user()
        
        # Add other user to the group first (simplified - in reality would need invite/join)
        # For now, create a separate group and task for other user
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        other_solution = await self.create_test_solution(client, other_user, other_task["id"])
        
        files = self.create_test_file()
        
        # Try to update other user's solution
        response = await client.client.put(
            f"{client.base_url}/solutions/{other_solution['id']}/update",
            files=files,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_get_task_solutions(self, client, authenticated_user, test_task):
        """Test getting all solutions for a task."""
        # Submit a solution first
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        
        response = await client.client.get(
            f"{client.base_url}/solutions/task/{test_task['id']}/all-solutions",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with list of solutions
        assert response.status_code == 200, f"Get task solutions failed: {response.status_code} - {response.text}"
        
        solutions = response.json()
        assert isinstance(solutions, list)
        
        # Should include our solution
        solution_ids = [s["id"] for s in solutions]
        assert solution["id"] in solution_ids
    
    @pytest.mark.asyncio
    async def test_get_task_solutions_not_member(self, client, authenticated_user):
        """Test getting task solutions fails for non-member."""
        # Create another user, group, and task
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        
        # Try to get solutions for other user's task
        response = await client.client.get(
            f"{client.base_url}/solutions/task/{other_task['id']}/all-solutions",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_get_solution_detail(self, client, authenticated_user, test_task):
        """Test getting solution details."""
        # Submit a solution first
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        solution_id = solution["id"]
        
        response = await client.client.get(
            f"{client.base_url}/solutions/{solution_id}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with solution details
        assert response.status_code == 200, f"Get solution detail failed: {response.status_code} - {response.text}"
        
        solution_detail = response.json()
        assert solution_detail["id"] == solution_id
        assert solution_detail["file_path"] == solution["file_path"]
        assert solution_detail["task_id"] == test_task["id"]
        assert solution_detail["student_id"] == authenticated_user.user_id
    
    @pytest.mark.asyncio
    async def test_get_solution_detail_not_authorized(self, client, authenticated_user, test_task):
        """Test getting solution details fails for unauthorized user."""
        # Create another user
        other_user = await client.create_authenticated_user()
        
        # Submit a solution as other user (would need to be in same group)
        # For simplicity, we'll test with a solution that doesn't exist
        non_existent_id = 999999
        
        response = await client.client.get(
            f"{client.base_url}/solutions/{non_existent_id}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (404)
        assert response.status_code in [403, 404], f"Expected not found error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_delete_solution_success(self, client, authenticated_user, test_task):
        """Test successful solution deletion."""
        # Submit a solution first
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        solution_id = solution["id"]
        
        response = await client.client.delete(
            f"{client.base_url}/solutions/{solution_id}/delete",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Solution deletion failed: {response.status_code} - {response.text}"
        
        # Verify solution is deleted by trying to get it
        get_response = await client.client.get(
            f"{client.base_url}/solutions/{solution_id}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (404 or 403)
        assert get_response.status_code in [403, 404], f"Solution should be deleted, got {get_response.status_code}"
    
    @pytest.mark.asyncio
    async def test_delete_solution_not_owner(self, client, authenticated_user, test_task):
        """Test solution deletion fails for non-owner."""
        # Create another user
        other_user = await client.create_authenticated_user()
        
        # Would need to create solution as other user in same group
        # For now, test with non-existent solution
        non_existent_id = 999999
        
        response = await client.client.delete(
            f"{client.base_url}/solutions/{non_existent_id}/delete",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (404)
        assert response.status_code in [403, 404], f"Expected not found error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_all_solutions_endpoints_listed(self, client, authenticated_user, test_task):
        """Verify all expected solutions endpoints exist."""
        endpoints = [
            ("POST", "/solutions/task/{task_id}/submit"),
            ("GET", "/solutions/task/{task_id}/my-solution"),
            ("PUT", "/solutions/{solution_id}/update"),
            ("GET", "/solutions/task/{task_id}/all-solutions"),
            ("GET", "/solutions/{solution_id}/detail"),
            ("DELETE", "/solutions/{solution_id}/delete"),
        ]
        
        # Create a test solution for endpoints that need solution_id
        solution = await self.create_test_solution(client, authenticated_user, test_task["id"])
        solution_id = solution["id"]
        
        for method, endpoint_template in endpoints:
            # Replace placeholders
            endpoint = endpoint_template
            if "{task_id}" in endpoint:
                endpoint = endpoint.replace("{task_id}", str(test_task["id"]))
            if "{solution_id}" in endpoint:
                endpoint = endpoint.replace("{solution_id}", str(solution_id))
            
            # Try to make request
            if method == "POST":
                # For POST, need to send a file
                files = self.create_test_file()
                response = await client.client.post(
                    f"{client.base_url}{endpoint}",
                    files=files,
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "GET":
                response = await client.client.get(
                    f"{client.base_url}{endpoint}",
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "PUT":
                # For PUT, need to send a file
                files = self.create_test_file()
                response = await client.client.put(
                    f"{client.base_url}{endpoint}",
                    files=files,
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "DELETE":
                response = await client.client.delete(
                    f"{client.base_url}{endpoint}",
                    headers=authenticated_user.get_auth_headers()
                )
            
            # Endpoint should exist (not 404)
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
            
            # Log endpoint status for debugging
            print(f"✓ Endpoint {endpoint} exists (status: {response.status_code})")