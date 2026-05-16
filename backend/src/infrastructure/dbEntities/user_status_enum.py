import enum


class UserStatus(str, enum.Enum):
    EXPERT = 'Эксперт'
    STUDENT = 'Студент'
