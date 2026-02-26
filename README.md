
<div align="center">

<img src="Frontend/front/public/favicon-512.png" alt="Adaptive Exam AI" width="110" />

# Adaptive Exam AI

**AI-агент для тестирования и наставничества **  
Персонализированная система экзаменов: генерация тестов → авто-проверка → объяснение ошибок → рекомендации → доп. задания → история и аналитика преподавателя.

<br/>

<img width="1920" height="901" alt="image" src="https://github.com/user-attachments/assets/083bc5b4-f536-404b-be67-f5a82148cff4" />


<br/>

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

## Описание проекта

Adaptive Exam AI — прототип персонализированной системы тестирования, которая объединяет:
- **генерацию тестов** по предмету и уровню сложности,
- **автоматическую проверку** ответов,
- **объяснение ошибок** и рекомендации по темам,
- **дополнительные задания** для закрепления слабых тем,
- **историю попыток** и отслеживание прогресса,
- **аналитику преподавателя** по группам студентов.

---

## Возможности

### Для студента
- регистрация и вход (JWT)
- выбор предмета/уровня/кол-ва вопросов
- генерация теста (учёт слабых тем через `skill_map`)
- отправка ответов
- AI feedback:
  - `score / max_score / percent`
  - `weak_topics`
  - `recommendations`
  - `extra_tasks`
  - `readiness` (готовность)

### Для преподавателя
- создание групп и управление студентами
- аналитика по группе:
  - overview (students_count, attempts_count, avg_percent)
  - слабые темы
  - тренд (динамика среднего процента)
  - студенты “at risk” (ниже порога)

---

## Стек

### Backend (Express)
- Node.js + Express
- PostgreSQL
- JWT (roles: `student`, `teacher`)
- Zod (валидация)

### AI Service (FastAPI + torch)
- FastAPI
- torch
- sentence-transformers (семантическая проверка short-answer)
- transformers (T5 генерация вопросов, hybrid режим)
- pydantic

### Frontend (React)
- React + Vite
- React Router
- React Query
- Zustand
- TailwindCSS
- react-hook-form + zod

### ERD - диаграмма

<img width="1938" height="1144" alt="Untitled" src="https://github.com/user-attachments/assets/5bd3a343-9767-4b84-be65-d2cd6055a6cb" />


---

## Архитектура


React (Vite Frontend)
│
▼
Express API (Node.js Backend)
│
├── PostgreSQL (Database)
│
└── FastAPI AI Service (torch + transformers)


---

## Структура репозитория


Backend/ # Express API
AI/ # FastAPI AI service
Frontend/front/ # React (Vite)


---

## Быстрый старт (локально)

### Требования
- Node.js 18+ (лучше 20)
- Python 3.10+ (лучше 3.11)
- PostgreSQL 14+

---

## 1) PostgreSQL

1) Создай базу:
```sql
CREATE DATABASE hackathon;

Прогони SQL schema (таблицы users, groups, subjects, topics, tests, questions, attempts, attempt_question_feedback).

2) AI Service (FastAPI)
Установка
cd AI
python -m venv .venv

# Windows:
# .venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
requirements.txt (AI/requirements.txt)
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

Создай файл Backend/.env:

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

AI (FastAPI) — http://localhost:8000

Backend (Express) — http://localhost:5000

Frontend (Vite) — http://localhost:5173

Переменные окружения (AI Service)

AI service читает env:

EMBED_MODEL (default: sentence-transformers/all-MiniLM-L6-v2)

GEN_MODEL (default: google/flan-t5-small)

AI_SAFE_MODE=1 — отключить T5 генерацию (останется только bank)

AI_MAX_Q — максимум AI вопросов за тест

AI_FRACTION — доля AI вопросов (например 0.3)

AI_TIMEOUT_SEC — таймаут генерации одного вопроса

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

Скопируй token из ответа:

TOKEN="PASTE_TOKEN_HERE"
3) Список предметов
curl http://localhost:5000/subjects
4) Генерация теста — /tests/generate (student)
curl -X POST http://localhost:5000/tests/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": 1,
    "level": "middle",
    "num_questions": 10
  }'
5) Начать попытку — /attempts/start (student)
curl -X POST http://localhost:5000/attempts/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": 1
  }'
6) Отправить ответы — /attempts/:attemptId/submit (student)
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
7) История попыток — /attempts (student)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/attempts
Скриншоты (опционально)


## Screenshots
<img width="1920" height="903" alt="image" src="https://github.com/user-attachments/assets/06d08ad8-2612-42e0-a3ba-798b53b90a1e" />
<img width="1920" height="899" alt="image" src="https://github.com/user-attachments/assets/88eb1bd3-9f3c-4f9e-909a-97026b855a91" />
<img width="1904" height="902" alt="image" src="https://github.com/user-attachments/assets/6d29308e-67f5-4c79-925f-87e6ae1bf3c4" />
<img width="1905" height="900" alt="image" src="https://github.com/user-attachments/assets/c1342108-6799-45ba-abb8-a917244ab647" />
<img width="1920" height="901" alt="image" src="https://github.com/user-attachments/assets/09b389ae-f1ea-4b04-bd74-c62975713584" />


Безопасность

.env не коммить (у тебя gitignore настроен ✅)

JWT_SECRET должен быть случайным и длинным
