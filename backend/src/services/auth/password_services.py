import secrets
from datetime import datetime, timedelta
from pwdlib import PasswordHash

from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.infrastructure.repositories.verification_code_repo import VerificationCodeRepo
from backend.src.api.schemas.user_schemas import UserUpdate
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
        
        # Create verification code using repository
        expires_at = datetime.now() + timedelta(minutes=5)
        verification_repo = VerificationCodeRepo(self.user_repo.session)
        await verification_repo.save(
            email=email,
            code=reset_code,
            user_id=user.id,
            expires_at=expires_at
        )
        
        await EmailService.send_verification_code_to_email(email, reset_code)
        return True

    async def verify_password_reset_code(self, email: str, code: str, new_password: str):
        # Verify code using repository
        verification_repo = VerificationCodeRepo(self.user_repo.session)
        if not await verification_repo.verify_and_delete(email, code):
            raise ValueError("Incorrect verification code")

        user = await self.user_repo.get_user_by_email(email)
        if not user:
            raise ValueError("Incorrect email or password")

        hashed_password = PasswordService.hash_password(new_password)
        await self.user_repo.update_user(UserUpdate(password=hashed_password), user.id)
        return True

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change password for a user after verifying old password."""
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        if not self.verify_password(old_password, user.password_hash):
            return False
        
        hashed_password = PasswordService.hash_password(new_password)
        await self.user_repo.update_user(UserUpdate(password=hashed_password), user.id)
        return True

    async def reset_password(self, user_id: int, new_password: str) -> bool:
        """Admin function to reset password without old password."""
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        hashed_password = PasswordService.hash_password(new_password)
        await self.user_repo.update_user(UserUpdate(password=hashed_password), user.id)
        return True

    @staticmethod
    def generate_random_password(length: int = 12) -> str:
        """Generate a random password with letters, digits, and special characters."""
        import secrets
        import string
        
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        while True:
            password = ''.join(secrets.choice(alphabet) for _ in range(length))
            # Ensure password has at least one of each type
            if (any(c.islower() for c in password) and
                any(c.isupper() for c in password) and
                any(c.isdigit() for c in password) and
                any(c in "!@#$%^&*" for c in password)):
                return password

    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """Validate password strength."""
        if len(password) < 8:
            return False
        
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*" for c in password)
        
        # Require at least 3 of the 4 categories
        categories = [has_lower, has_upper, has_digit, has_special]
        return sum(categories) >= 3
