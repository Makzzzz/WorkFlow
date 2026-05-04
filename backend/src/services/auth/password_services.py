import secrets

from pwdlib import PasswordHash

from backend.src.services.auth.temporary_storage_db import verification_code

hash_protocol = PasswordHash.recommended()

def get_hashed_password(password):
    return hash_protocol.hash(password)

def verify_password(plain_password, hashed_password):
    try:
        return hash_protocol.verify(plain_password, hashed_password)
    except Exception:
        return False

async def request_password_reset(email: str) -> bool:

    from backend.src.services.auth.user_services import get_user_by_email
    from backend.src.services.auth.temporary_storage_db import verification_code
    from backend.src.services.auth.email_services import send_verification_code_to_email

    user = get_user_by_email(email)
    if not user:
        return True

    reset_code = secrets.token_hex(3).upper()
    verification_code.store_code(email, reset_code, ttl_minutes=5)
    await send_verification_code_to_email(email, reset_code)
    return True

def verify_password_reset_code(email: str, code: str, new_password: str):

    from backend.src.services.auth.user_services import get_user_by_email
    from backend.src.services.auth.temporary_storage_db import storage

    if not verification_code.verify_and_delete(email, code):
        raise ValueError("Incorrect verification code")

    user = get_user_by_email(email)
    if not user:
        raise ValueError("Incorrect email or password")

    storage.update_user(email, {
        "password_hash": get_hashed_password(new_password),
        "verification_code": None
    })
