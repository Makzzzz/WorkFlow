# Запуск приложения в Docker

## Созданные файлы

1. **Dockerfile.backend** - Dockerfile для бэкенда FastAPI
2. **Dockerfile.frontend** - Dockerfile для фронтенда React (требует доработки для vite)
3. **docker-compose.yml** - Конфигурация для запуска всего стека
4. **requirements_docker.txt** - Зависимости Python для бэкенда
5. **init-db.sql** - SQL-скрипт для инициализации PostgreSQL
6. **.env.example** - Пример файла с переменными окружения

## Запуск приложения

### 1. Создайте файл .env
Скопируйте .env.example в .env и настройте переменные:
```bash
cp .env.example .env
```

### 2. Запустите весь стек с помощью Docker Compose
```bash
docker-compose up -d
```

### 3. Проверьте статус сервисов
```bash
docker-compose ps
```

### 4. Остановите стек
```bash
docker-compose down
```

## Доступ к сервисам

- **Бэкенд API**: http://localhost:8000
- **Документация Swagger**: http://localhost:8000/docs
- **Документация ReDoc**: http://localhost:8000/redoc
- **Фронтенд**: http://localhost:3000 (после исправления Dockerfile.frontend)
- **PostgreSQL**: localhost:5432

## Проблемы и решения

### Проблема с фронтендом
Фронтенд Dockerfile имеет проблему с установкой vite в Alpine Linux. Для временного решения:

1. **Вариант 1**: Запустите фронтенд локально
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Вариант 2**: Используйте другой базовый образ
   Измените `Dockerfile.frontend`:
   ```dockerfile
   FROM node:18-bullseye
   ```

### Миграции базы данных
Миграции Alembic выполняются автоматически при запуске бэкенда через команду:
```bash
alembic upgrade head
```

### Переменные окружения
Обязательные переменные окружения:
- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_SECRET_KEY` - Секретный ключ для JWT токенов
- `MAIL_*` - Настройки email для отправки писем

## Структура Docker Compose

1. **postgres**: PostgreSQL 15 с предварительно созданной БД "peerloop"
2. **backend**: FastAPI приложение с автоматическими миграциями
3. **frontend**: React приложение (требует исправления)

## Мониторинг логов

```bash
# Все логи
docker-compose logs

# Логи бэкенда
docker-compose logs backend

# Логи фронтенда
docker-compose logs frontend

# Логи базы данных
docker-compose logs postgres
```

## Резервное копирование данных

Данные PostgreSQL сохраняются в Docker volume `postgres_data`. Для резервного копирования:
```bash
docker-compose exec postgres pg_dump -U peerloop_user peerloop > backup.sql
```

## Производительность

Для продакшн-среды рекомендуется:
1. Использовать `.env.production` с другими настройками
2. Настроить Nginx как reverse proxy
3. Включить SSL/TLS сертификаты
4. Настроить мониторинг и логирование