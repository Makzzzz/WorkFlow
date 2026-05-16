import secrets

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from backend.src.services.auth.config import settings
from backend.src.services.auth.temporary_storage_db import verification_code, storage

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

def generate_verification_code() -> str:
    return secrets.token_hex(3).upper()

async def send_verification_code_to_email(email: str, code: str):
    message = MessageSchema(
        subject="Код подтверждения регистрации",
        recipients=[email],
        body=f"Твой код: {code}\nКод действителен 5 минут.",
        subtype="plain"
    )

    fm = FastMail(MAIL_CONFIG)
    await fm.send_message(message)
    print(f"Code sent to {email}")

def verify_email_code(email: str, ver_code: str) -> bool:
    if not verification_code.verify_and_delete(email, ver_code):
        return False

    storage.update_user(email, {"is_active": True})
    return True
