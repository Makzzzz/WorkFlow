import hashlib
from typing import Optional, Dict
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

class UserStorage(BaseModel):
    email: str
    first_name: str
    last_name: str
    password_hash: str
    refresh_token_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    is_active: bool=False

class InTemporaryStorage:
    def __init__(self):
        self._users: Dict[str, UserStorage] = {}
        self._counter = 0

    def create_user(self, user: UserStorage) -> UserStorage:
        self._counter += 1
        user.id = self._counter
        self._users[user.email] = user
        print(f"User created: {user.first_name} {user.last_name}"
              f" (code: {user.verification_code})")
        return user

    def get_by_email(self, email: str) -> Optional[UserStorage]:
        return self._users.get(email)

    def get_by_name(self, first_name: str) -> Optional[UserStorage]:
        for user in self._users.values():
            if user.first_name == first_name:
                return user
        return None

    def update_user(self, email: str, updates: dict) -> Optional[UserStorage]:
        user = self._users.get(email)
        if not user:
            return None

        updated_data = user.model_dump()
        updated_data.update(updates)
        self._users[email] = UserStorage(**updated_data)
        return self._users[email]


class VerificationCodeStorage:
    def __init__(self):
        self._codes: Dict[str, dict] = {}

    def store_code(self, email: str, code: str, ttl_minutes: int = 10):
        import hashlib
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        expires = datetime.now() + timedelta(minutes=ttl_minutes)
        self._codes[email] = {"hash": code_hash, "expires_at": expires}

    def verify_and_delete(self, email: str, input_code: str) -> bool:
        record = self._codes.get(email)
        if not record:
            return False

        if datetime.now() > record["expires_at"]:
            self._codes.pop(email, None)
            return False

        input_hash = hashlib.sha256(input_code.encode()).hexdigest()
        if input_hash == record["hash"]:
            self._codes.pop(email, None)
            return True
        return False

storage = InTemporaryStorage()
verification_code = VerificationCodeStorage()