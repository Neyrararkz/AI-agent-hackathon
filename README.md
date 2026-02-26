<div align="center">

<img src="Frontend/front/public/favicon-512.png" alt="Adaptive Exam AI" width="110" />

# Adaptive Exam AI

**AI-агент для тестирования и наставничества (ITSTEP College Hackathon)**  
Персонализированная система экзаменов: генерация тестов → авто-проверка → объяснение ошибок → рекомендации → доп. задания → история и аналитика преподавателя.

<br/>
<img width="1920" height="900" alt="image" src="https://github.com/user-attachments/assets/7865cc8f-cf13-4af8-a57e-c9cca497c526" />


![Node.js](https://img.shields.io/badge/Node.js-Express-111?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-111?logo=express&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-AI%20Service-111?logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.2.2-111?logo=pytorch&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-111?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-111?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-111?logo=jsonwebtokens&logoColor=white)

</div>

---

## ITSTEP College — Участники

**Студенты:**
- Кабиденова Элеонора  
- Харитонов Владимир  
- Пан Роман  

**Преподаватель:**
- Джетиберген Мадияр  

---

## Что делает проект

### Для студента
- регистрация/вход (JWT, роли student/teacher)
- выбор предмета и сложности
- генерация **уникального** теста
- прохождение теста и отправка ответов
- AI проверяет и возвращает:
  - score / percent
  - слабые темы (weak topics)
  - рекомендации (recommendations)
  - доп. задания (extra tasks)
  - readiness score (готовность)

### Для преподавателя
- управление группами студентов
- аналитика по группе:
  - overview (средний процент, попытки)
  - слабые темы группы
  - тренд успеваемости
  - “at risk” студенты ниже порога

---

## Стек

### Backend
- Node.js + Express
- PostgreSQL
- JWT + роли
- Zod validation

### AI Service
- FastAPI
- torch
- sentence-transformers (семантическая проверка short-answer)
- transformers (T5 генерация вопросов, hybrid режим)

### Frontend
- React + Vite
- React Router, React Query
- Zustand
- TailwindCSS
- react-hook-form + zod

---

## Архитектура

```mermaid
flowchart LR
  UI[React + Vite<br/>Frontend] -->|HTTP| API[Express API<br/>Backend]
  API -->|SQL| DB[(PostgreSQL)]
  API -->|HTTP JSON| AI[FastAPI AI Service<br/>torch + transformers]
Структура репозитория

у тебя так:

Backend/          # Express API
AI/               # FastAPI AI service
Frontend/front/   # React (Vite)
Быстрый старт (локально)
Требования

Node.js 18+ (лучше 20)

Python 3.10+ (лучше 3.11)

PostgreSQL 14+

1) PostgreSQL

Создай базу:

CREATE DATABASE hackathon;

Прогони schema.sql (тот SQL, который ты прислал — create tables).

2) AI Service (FastAPI)
Установка
cd AI
python -m venv .venv
# Windows:
# .venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
requirements.txt (рекомендую хранить в AI/requirements.txt)
fastapi==0.110.0
uvicorn[standard]==0.29.0
torch==2.2.2
sentence-transformers==2.6.1
transformers==4.39.3
pydantic==2.6.4
Запуск
uvicorn main:app --reload --port 8000

Проверка:

http://localhost:8000/docs

3) Backend (Express)
Установка
cd Backend
npm install
.env (Backend/.env)
AI_URL=http://localhost:8000
PORT=5000
DATABASE_URL=postgresql://postgres:1234@localhost:5432/hackathon
JWT_SECRET=CHANGE_ME_TO_RANDOM_LONG_SECRET
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
AI_TIMEOUT_MS=25000
Запуск
npm run dev

Проверка:

GET http://localhost:5000/health

4) Frontend (React + Vite)
Установка
cd Frontend/front
npm install
Запуск
npm run dev

Открой:

http://localhost:5173

Порядок запуска (важно)

PostgreSQL

AI (FastAPI) :8000

Backend (Express) :5000

Frontend (Vite) :5173

Переменные окружения (AI)

AI сервис поддерживает параметры:

EMBED_MODEL (default: sentence-transformers/all-MiniLM-L6-v2)

GEN_MODEL (default: google/flan-t5-small)

AI_SAFE_MODE=1 — отключить T5 генерацию (будет только bank)

AI_MAX_Q — максимум AI вопросов

AI_FRACTION — доля AI вопросов (например 0.3)

AI_TIMEOUT_SEC — таймаут генерации

API маршруты (Backend)
Auth

POST /auth/register

POST /auth/login

GET /auth/me

Subjects / Topics

GET /subjects

GET /subjects/:subjectId/topics

Tests (student)

POST /tests/generate

GET /tests/:testId

Attempts (student)

POST /attempts/start

POST /attempts/:attemptId/submit

GET /attempts/:attemptId

GET /attempts

Teacher

POST /teacher/groups

GET /teacher/groups

POST /teacher/groups/:groupId/members

GET /teacher/groups/:groupId/members

GET /teacher/groups/:groupId/analytics/overview

GET /teacher/groups/:groupId/analytics/weak-topics?limit=5

GET /teacher/groups/:groupId/analytics/trend

GET /teacher/groups/:groupId/analytics/at-risk?threshold=50

Примеры запросов (curl)
0) Health check
curl http://localhost:5000/health
1) Регистрация
Student
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role":"student",
    "full_name":"Student One",
    "email":"student1@mail.com",
    "password":"123456"
  }'
Teacher
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role":"teacher",
    "full_name":"Teacher One",
    "email":"teacher1@mail.com",
    "password":"123456"
  }'
2) Логин и токен
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student1@mail.com",
    "password":"123456"
  }'

Скопируй token из ответа — дальше будет:

TOKEN="PASTE_TOKEN_HERE"
3) Список предметов
curl http://localhost:5000/subjects
4) Генерация теста /tests/generate

Требуется Bearer token (роль student)

curl -X POST http://localhost:5000/tests/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": 1,
    "level": "middle",
    "num_questions": 10
  }'

Ответ вернёт:

test.id (сохрани его)

questions[] (включая q_index, q_type, prompt, options)

5) Начать попытку /attempts/start
curl -X POST http://localhost:5000/attempts/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": 1
  }'

Ответ вернёт attempt.id.

6) Отправить ответы /attempts/:attemptId/submit

Формат answers — объект, где ключи это "1", "2" ... (q_index), значения:

для mcq: строка (выбранный option)

для short: строка (текст ответа)

curl -X POST http://localhost:5000/attempts/1/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "1": "LEFT JOIN",
      "2": "INNER JOIN",
      "3": "INNER JOIN returns only matched rows; LEFT JOIN returns all left rows and NULLs for non-matches."
    }
  }'

В ответе будет:

attempt (score/max/percent + ai_summary)

per_question_feedback[] (explanation/recommendation/confidence)

user_skill_map (обновлённая карта навыков)

7) История попыток
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/attempts
Скриншоты (опционально, красиво)

Создай папку:

assets/

И добавь:

assets/ui-login.png

assets/ui-student-dashboard.png

assets/ui-test.png

assets/ui-teacher-analytics.png

После этого вставь в README:

## Screenshots
![Login](assets/ui-login.png)
![Student dashboard](assets/ui-student-dashboard.png)
![Test](assets/ui-test.png)
![Teacher analytics](assets/ui-teacher-analytics.png)
Безопасность

.env не коммить (он у тебя в gitignore ✅)

JWT_SECRET должен быть случайным и длинным
