import secrets
import logging

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from fastapi_mail.errors import ConnectionErrors

from backend.src.api.schemas.user_schemas import UserUpdate
from backend.src.services.auth.config import settings
from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.infrastructure.repositories.verification_code_repo import VerificationCodeRepo

logger = logging.getLogger(__name__)

MAIL_CONFIG = ConnectionConfig(
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

class EmailService:
    def __init__(self, user_repo: UserRepo):
        self.user_repo = user_repo
        self.mail_client = FastMail(MAIL_CONFIG)

    @staticmethod
    def generate_verification_code() -> str:
        return secrets.token_hex(3).upper()

    async def send_verification_code_to_email(self, email: str, code: str):
        message = MessageSchema(
            subject="Код подтверждения регистрации",
            recipients=[email],
            body=f"Ваш код: {code}\nКод действителен 5 минут.",
            subtype=MessageType.plain
        )

        try:
            await self.mail_client.send_message(message)
            logger.info(f"Verification code sent to {email}")
        except ConnectionErrors as e:
            # лог, чтобы можно было тестить если упал smtp
            logger.warning(f"Failed to send verification email to {email}: {e}. "
                          "This is acceptable in test/development environment.")
        except Exception as e:
            logger.error(f"Unexpected error sending verification email to {email}: {e}")
            # тож самое

    async def verify_email_code(self, email: str, user_id: int, ver_code: str) -> bool:
        verification_repo = VerificationCodeRepo(self.user_repo.session)
        if not await verification_repo.verify_and_delete(email, ver_code):
            return False

        await self.user_repo.update_user(UserUpdate(is_active=True), user_id)
        return True
