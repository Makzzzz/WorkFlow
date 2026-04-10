import jwt
from websockets.legacy.framing import encode_data

from config import JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_SECRET_KEY
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel

fake_user_db = {
    "testuser": {
        "username": "testuser",
        "email": "testuser@gmail.com",
        "disabled": False,
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$wagCPXjifgvUFBzq4hqe3w$CYaIb8sB+wtD+Vu/P4uod1+Qof8h+1g7bbDlBID48Rc",
    }
}

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class User(BaseModel):
    username: str
    email: str
    disabled: bool | None = None

class UserInDb(BaseModel):
    hashed_password: str

password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummypassword")
app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_hashed_password(password):
    return password_hash.hash(password)

def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDb(**user_dict)

def authenticate_user(fake_db, username: str, password:str):
    user = get_user(fake_db, username)
    if not user:
        verify_password(password, DUMMY_HASH)
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expire_delta: timedelta | None = None):
    to_encode = data.copy()
    if expire_delta:
        expire = datetime.now(timezone.utc) + expire_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoding_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, JWT_ALGORITHM)
    return encoding_jwt