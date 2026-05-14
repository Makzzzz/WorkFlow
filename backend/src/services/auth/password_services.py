import secrets
from pwdlib import PasswordHash

from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.models.user_model import UserUpdate
from backend.src.services.auth.verification_code import VerificationCode
from backend.src.services.auth.email_services import EmailService


hash_protocol = PasswordHash.recommended()

class PasswordService:
    def __init__(self, user_repo: UserRepo):
        self.user_repo = user_repo

    @staticmethod
    def hash_password(password):
        return hash_protocol.hash(password)

    @staticmethod
    def verify_password(plain_password, hashed_password):
        try:
            return hash_protocol.verify(plain_password, hashed_password)
        except Exception:
            return False

    async def request_password_reset(self, email: str) -> bool:
        user = await self.user_repo.get_user_by_email(email)
        if not user:
            return True

        reset_code = secrets.token_hex(3).upper()
        VerificationCode.save(email, reset_code, ttl_minutes=5)
        await EmailService.send_verification_code_to_email(email, reset_code)
        return True

    async def verify_password_reset_code(self, email: str, code: str, new_password: str):
        if not VerificationCode.verify_and_delete_code(email, code):
            raise ValueError("Incorrect verification code")

        user = await self.user_repo.get_user_by_email(email)
        if not user:
            raise ValueError("Incorrect email or password")

        hashed_password = PasswordService.hash_password(new_password)
        await self.user_repo.update_user(UserUpdate(password=hashed_password), user.id)
        return True
