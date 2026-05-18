"""
Complete integration tests for tasks endpoints.
Tests cover all main tasks flows with proper error handling.
"""
import os
import sys
import asyncio
import pytest
import pytest_asyncio
import httpx
import uuid
from typing import Dict, Any
from datetime import datetime, timedelta

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


class TestTasksController:
    """Complete integration tests for tasks endpoints."""
    
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
    
    # ====== TEST CASES ======
    
    @pytest.mark.asyncio
    async def test_create_task_success(self, client, authenticated_user, test_group):
        """Test successful task creation."""
        task_name = f"Test Task {uuid.uuid4().hex[:8]}"
        description = f"Test task description {uuid.uuid4().hex[:8]}"
        deadline = (datetime.now() + timedelta(days=7)).isoformat()
        
        task_data = {
            "task_name": task_name,
            "description": description,
            "deadline": deadline,
            "is_p2p_enabled": True
        }
        
        response = await client.client.post(
            f"{client.base_url}/tasks/{test_group['id']}/create",
            json=task_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Task creation failed: {response.status_code} - {response.text}"
        
        task_response = response.json()
        assert task_response["task_name"] == task_name
        assert task_response["description"] == description
        assert task_response["is_p2p_enabled"] is True
        assert task_response["group_id"] == test_group["id"]
        assert "id" in task_response
    
    @pytest.mark.asyncio
    async def test_create_task_invalid_data(self, client, authenticated_user, test_group):
        """Test task creation with invalid data fails."""
        # Test with missing required field
        task_data = {
            "description": "Test description"
            # Missing task_name
        }
        
        response = await client.client.post(
            f"{client.base_url}/tasks/{test_group['id']}/create",
            json=task_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return validation error
        assert response.status_code == 422, f"Expected 422 for invalid data, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_create_task_not_group_member(self, client, authenticated_user):
        """Test task creation fails for non-group member."""
        # Create another user and group
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        
        task_data = {
            "task_name": "Test Task",
            "description": "Test description",
            "deadline": None,
            "is_p2p_enabled": False
        }
        
        # Try to create task in other user's group
        response = await client.client.post(
            f"{client.base_url}/tasks/{other_group['id']}/create",
            json=task_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_get_group_tasks(self, client, authenticated_user, test_group, test_task):
        """Test getting tasks for a group."""
        response = await client.client.get(
            f"{client.base_url}/tasks/group/{test_group['id']}",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with list of tasks
        assert response.status_code == 200, f"Get group tasks failed: {response.status_code} - {response.text}"
        
        tasks = response.json()
        assert isinstance(tasks, list)
        
        # Should include the test task we created
        task_ids = [task["id"] for task in tasks]
        assert test_task["id"] in task_ids
    
    @pytest.mark.asyncio
    async def test_get_task_detail(self, client, authenticated_user, test_task):
        """Test getting task details."""
        task_id = test_task["id"]
        
        response = await client.client.get(
            f"{client.base_url}/tasks/{task_id}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with task details
        assert response.status_code == 200, f"Get task detail failed: {response.status_code} - {response.text}"
        
        task_detail = response.json()
        assert task_detail["id"] == task_id
        assert task_detail["task_name"] == test_task["task_name"]
        assert task_detail["description"] == test_task["description"]
        assert "group_id" in task_detail
    
    @pytest.mark.asyncio
    async def test_get_task_detail_not_authorized(self, client, authenticated_user):
        """Test getting task details fails for unauthorized user."""
        # Create another user, group, and task
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        
        # Try to access other user's task
        response = await client.client.get(
            f"{client.base_url}/tasks/{other_task['id']}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_update_task_success(self, client, authenticated_user, test_task):
        """Test successful task update."""
        task_id = test_task["id"]
        
        update_data = {
            "task_name": f"Updated Task {uuid.uuid4().hex[:8]}",
            "description": f"Updated description {uuid.uuid4().hex[:8]}",
            "is_p2p_enabled": True
        }
        
        response = await client.client.put(
            f"{client.base_url}/tasks/{task_id}/update",
            json=update_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Task update failed: {response.status_code} - {response.text}"
        
        updated_task = response.json()
        assert updated_task["id"] == task_id
        assert updated_task["task_name"] == update_data["task_name"]
        assert updated_task["description"] == update_data["description"]
        assert updated_task["is_p2p_enabled"] == update_data["is_p2p_enabled"]
    
    @pytest.mark.asyncio
    async def test_update_task_not_owner(self, client, authenticated_user):
        """Test task update fails for non-owner."""
        # Create another user, group, and task
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        
        update_data = {
            "task_name": "Attempted Update",
            "description": "Should fail"
        }
        
        # Try to update other user's task
        response = await client.client.put(
            f"{client.base_url}/tasks/{other_task['id']}/update",
            json=update_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_delete_task_success(self, client, authenticated_user, test_task):
        """Test successful task deletion."""
        task_id = test_task["id"]
        
        response = await client.client.delete(
            f"{client.base_url}/tasks/{task_id}/delete",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Task deletion failed: {response.status_code} - {response.text}"
        
        # Verify task is deleted by trying to get it
        get_response = await client.client.get(
            f"{client.base_url}/tasks/{task_id}/detail",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (404 or 403)
        assert get_response.status_code in [403, 404], f"Task should be deleted, got {get_response.status_code}"
    
    @pytest.mark.asyncio
    async def test_delete_task_not_owner(self, client, authenticated_user):
        """Test task deletion fails for non-owner."""
        # Create another user, group, and task
        other_user = await client.create_authenticated_user()
        other_group = await create_test_group(client, other_user)
        other_task = await create_test_task(client, other_user, other_group["id"])
        
        # Try to delete other user's task
        response = await client.client.delete(
            f"{client.base_url}/tasks/{other_task['id']}/delete",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return error (403 or 404)
        assert response.status_code in [403, 404], f"Expected access error, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_add_criteria_success(self, client, authenticated_user, test_task):
        """Test successful criteria addition to task."""
        task_id = test_task["id"]
        
        criteria_data = {
            "criteria_name": f"Test Criteria {uuid.uuid4().hex[:8]}",
            "description": f"Test criteria description {uuid.uuid4().hex[:8]}"
        }
        
        response = await client.client.post(
            f"{client.base_url}/tasks/{task_id}/criteria/create",
            json=criteria_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Criteria creation failed: {response.status_code} - {response.text}"
        
        criteria_response = response.json()
        assert criteria_response["criteria_name"] == criteria_data["criteria_name"]
        assert criteria_response["description"] == criteria_data["description"]
        assert criteria_response["task_id"] == task_id
        assert "id" in criteria_response
    
    @pytest.mark.asyncio
    async def test_get_task_criteria(self, client, authenticated_user, test_task):
        """Test getting criteria for a task."""
        task_id = test_task["id"]
        
        # First add a criteria
        criteria_data = {
            "criteria_name": f"Test Criteria {uuid.uuid4().hex[:8]}",
            "description": "Test description"
        }
        
        await client.client.post(
            f"{client.base_url}/tasks/{task_id}/criteria/create",
            json=criteria_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Now get all criteria
        response = await client.client.get(
            f"{client.base_url}/tasks/{task_id}/criteria",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 with list of criteria
        assert response.status_code == 200, f"Get task criteria failed: {response.status_code} - {response.text}"
        
        criteria_list = response.json()
        assert isinstance(criteria_list, list)
        assert len(criteria_list) > 0
    
    @pytest.mark.asyncio
    async def test_update_criteria(self, client, authenticated_user, test_task):
        """Test updating criteria."""
        task_id = test_task["id"]
        
        # First create a criteria
        criteria_data = {
            "criteria_name": f"Test Criteria {uuid.uuid4().hex[:8]}",
            "description": "Original description"
        }
        
        create_response = await client.client.post(
            f"{client.base_url}/tasks/{task_id}/criteria/create",
            json=criteria_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        criteria = create_response.json()
        criteria_id = criteria["id"]
        
        # Now update it
        update_data = {
            "criteria_name": f"Updated Criteria {uuid.uuid4().hex[:8]}",
            "description": "Updated description"
        }
        
        response = await client.client.put(
            f"{client.base_url}/tasks/criteria/{criteria_id}/update",
            json=update_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Criteria update failed: {response.status_code} - {response.text}"
        
        updated_criteria = response.json()
        assert updated_criteria["id"] == criteria_id
        assert updated_criteria["criteria_name"] == update_data["criteria_name"]
        assert updated_criteria["description"] == update_data["description"]
    
    @pytest.mark.asyncio
    async def test_delete_criteria(self, client, authenticated_user, test_task):
        """Test deleting criteria."""
        task_id = test_task["id"]
        
        # First create a criteria
        criteria_data = {
            "criteria_name": f"Test Criteria {uuid.uuid4().hex[:8]}",
            "description": "To be deleted"
        }
        
        create_response = await client.client.post(
            f"{client.base_url}/tasks/{task_id}/criteria/create",
            json=criteria_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        criteria = create_response.json()
        criteria_id = criteria["id"]
        
        # Now delete it
        response = await client.client.delete(
            f"{client.base_url}/tasks/criteria/{criteria_id}/delete",
            headers=authenticated_user.get_auth_headers()
        )
        
        # Should return 200 for success
        assert response.status_code == 200, f"Criteria deletion failed: {response.status_code} - {response.text}"
    
    @pytest.mark.asyncio
    async def test_all_tasks_endpoints_listed(self, client, authenticated_user, test_group, test_task):
        """Verify all expected tasks endpoints exist."""
        endpoints = [
            ("POST", "/tasks/{group_id}/create"),
            ("GET", "/tasks/group/{group_id}"),
            ("GET", "/tasks/{task_id}/detail"),
            ("PUT", "/tasks/{task_id}/update"),
            ("DELETE", "/tasks/{task_id}/delete"),
            ("POST", "/tasks/{task_id}/criteria/create"),
            ("GET", "/tasks/{task_id}/criteria"),
            ("PUT", "/tasks/criteria/{criteria_id}/update"),
            ("DELETE", "/tasks/criteria/{criteria_id}/delete"),
        ]
        
        # Create a test criteria for endpoints that need criteria_id
        criteria_data = {
            "criteria_name": f"Test Criteria {uuid.uuid4().hex[:8]}",
            "description": "Test description"
        }
        
        criteria_response = await client.client.post(
            f"{client.base_url}/tasks/{test_task['id']}/criteria/create",
            json=criteria_data,
            headers=authenticated_user.get_auth_headers()
        )
        
        criteria = criteria_response.json()
        criteria_id = criteria["id"]
        
        for method, endpoint_template in endpoints:
            # Replace placeholders
            endpoint = endpoint_template
            if "{group_id}" in endpoint:
                endpoint = endpoint.replace("{group_id}", str(test_group["id"]))
            if "{task_id}" in endpoint:
                endpoint = endpoint.replace("{task_id}", str(test_task["id"]))
            if "{criteria_id}" in endpoint:
                endpoint = endpoint.replace("{criteria_id}", str(criteria_id))
            
            # Try to make request
            if method == "POST":
                response = await client.client.post(
                    f"{client.base_url}{endpoint}",
                    json={},  # Empty payload for existence check
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "GET":
                response = await client.client.get(
                    f"{client.base_url}{endpoint}",
                    headers=authenticated_user.get_auth_headers()
                )
            elif method == "PUT":
                response = await client.client.put(
                    f"{client.base_url}{endpoint}",
                    json={},  # Empty payload for existence check
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
            print(f"[OK] Endpoint {endpoint} exists (status: {response.status_code})")