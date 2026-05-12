from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.dbEntities.user import User
from backend.src.api.schemas.user_schemas import UserRegisterModel, UserUpdate


class UserRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_user(self, user: UserRegisterModel) -> User:
        user = User(
            email=user.email.lower(),
            first_name=user.first_name,
            last_name=user.last_name,
            password=user.password
        )
        self.session.add(user)
        return user

    async def get_user_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def delete_user(self, user_id: int) -> bool:
        stmt = delete(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_user(self, updated_user: UserUpdate, user_id: int) -> User | None:
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        update_data = updated_user.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        return user
