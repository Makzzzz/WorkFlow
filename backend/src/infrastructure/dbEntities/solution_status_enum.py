import enum


class SolutionStatus(str, enum.Enum):
    NOT_PASSED = "Не сдано"
    IN_PROGRESS = "Ждет проверки"
    CHECKED = "Проверено"
