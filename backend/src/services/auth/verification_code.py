from typing import Dict, Optional
from pydantic import BaseModel
import time


class PendingRegistration(BaseModel):
    email: str
    hashed_password: str
    first_name: str
    last_name: str
    code: str
    expires_at: float

class VerificationCode:
    _storage_codes: Dict[str, PendingRegistration] = {}

    @classmethod
    def save(cls, email: str, data: PendingRegistration) -> None:
        cls._storage_codes[email.lower()] = data

    @classmethod
    def get(cls, email: str) -> Optional[PendingRegistration]:
        return cls._storage_codes.get(email.lower())

    @classmethod
    def delete(cls, email: str) -> Optional[PendingRegistration]:
        cls._storage_codes.pop(email.lower(), None)

    @classmethod
    def verify_and_delete_code(cls, email: str, code: str) -> bool:
        email = email.lower()
        record = cls._storage_codes.get(email)
        if not record or time.time() > record["expires_at"]:
            cls._storage_codes.pop(email, None)
            return False
        if record["code"] != code:
            return False
        cls._storage_codes.pop(email, None)
        return True
