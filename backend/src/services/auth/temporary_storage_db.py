from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class UserStorageModel(BaseModel):
    id: int = 0
    email: str
    first_name: str
    last_name: str
    password_hash: str
    refresh_token_hash: Optional[str] = None
    verification_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    is_active: bool=False

class InTemporaryStorage:
    def __init__(self):
        self._users: Dict[str, UserStorageModel] = {}
        self._counter = 0

    def create_user(self, user: UserStorageModel) -> UserStorageModel:
        self._counter += 1
        user.id = self._counter
        self._users[user.email] = user
        print(f"User created: {user.first_name} {user.last_name}"
              f" (code: {user.verification_code})")
        return user

    def get_by_email(self, email: str) -> Optional[UserStorageModel]:
        return self._users.get(email)

    def get_by_name(self, first_name: str) -> Optional[UserStorageModel]:
        for user in self._users.values():
            if user.first_name == first_name:
                return user
        return None

    def update_user(self, email: str, updates: dict) -> Optional[UserStorageModel]:
        user = self._users.get(email)
        if not user:
            return None

        updated_data = user.model_dump()
        updated_data.update(updates)
        self._users[email] = UserStorageModel(**updated_data)
        return self._users[email]

storage = InTemporaryStorage()