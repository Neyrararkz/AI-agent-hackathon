from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
import random
import math
import json
import re
import os
import time
import concurrent.futures

import torch
from sentence_transformers import SentenceTransformer
from transformers import pipeline

app = FastAPI(title="Adaptive Exam AI Service (Fast & Safe)")

EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
GEN_MODEL = os.getenv("GEN_MODEL", "google/flan-t5-small")
AI_SAFE_MODE = os.getenv("AI_SAFE_MODE", "0") == "1"

AI_MAX_Q = int(os.getenv("AI_MAX_Q", "3"))
AI_FRACTION = float(os.getenv("AI_FRACTION", "0.3"))

AI_MAX_NEW_TOKENS_MCQ = int(os.getenv("AI_MAX_NEW_TOKENS_MCQ", "120"))
AI_MAX_NEW_TOKENS_SHORT = int(os.getenv("AI_MAX_NEW_TOKENS_SHORT", "140"))
AI_TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SEC", "2.5"))

try:
    torch.set_num_threads(int(os.getenv("TORCH_THREADS", "2")))
except Exception:
    pass

embedder = SentenceTransformer(EMBED_MODEL)

t5 = None
if not AI_SAFE_MODE:
    try:
        t5 = pipeline("text2text-generation", model=GEN_MODEL)
    except Exception:
        t5 = None

TOPICS: Dict[str, List[Tuple[str, str]]] = {
    "SQL": [
        ("SQL_JOIN", "JOINs"),
        ("SQL_WHERE", "WHERE filters"),
        ("SQL_GROUP_BY", "GROUP BY"),
        ("SQL_AGG", "Aggregations"),
        ("SQL_SUBQUERY", "Subqueries"),
    ],
    "Python": [
        ("PY_LISTS", "Lists"),
        ("PY_DICTS", "Dictionaries"),
        ("PY_FUNCS", "Functions"),
        ("PY_OOP", "OOP"),
        ("PY_FILES", "Files"),
    ],
    "Math": [
        ("MATH_ALG", "Algebra"),
        ("MATH_FRAC", "Fractions"),
        ("MATH_GEOM", "Geometry"),
        ("MATH_EQ", "Equations"),
        ("MATH_PROB", "Probability"),
    ],
}

TASK_BANK: Dict[str, List[str]] = {
    "SQL_AGG": [
        "В таблице users(id,email) посчитай количество уникальных email: SELECT COUNT(DISTINCT email) ...",
        "В таблице orders(id,total) найди MIN(total), MAX(total), AVG(total).",
        "В таблице orders(user_id,total) посчитай сумму заказов по каждому user_id (GROUP BY).",
    ],
    "SQL_JOIN": [
        "Напиши запрос, который найдёт пользователей без заказов (LEFT JOIN + WHERE orders.id IS NULL).",
        "Покажи всех пользователей и сумму их заказов, у кого нет заказов — сумма 0 (LEFT JOIN + COALESCE).",
        "Сделай INNER JOIN users и orders, чтобы получить только пользователей с заказами.",
    ],
    "SQL_WHERE": [
        "Сделай выборку пользователей возраст 18..25 включительно (BETWEEN).",
        "Отфильтруй заказы total > 100 и created_at за последний месяц (WHERE + AND).",
        "Покажи строки, где email заканчивается на '@gmail.com' (LIKE).",
    ],
    "SQL_SUBQUERY": [
        "Найди пользователей, у которых есть хотя бы один заказ (EXISTS).",
        "Выведи пользователей, у которых сумма заказов больше среднего по всем пользователям (подзапрос).",
        "Найди товары, которые ни разу не заказывали (NOT EXISTS).",
    ],
    "SQL_GROUP_BY": [
        "Сгруппируй заказы по user_id и посчитай COUNT(*) для каждого.",
        "Сделай GROUP BY category и посчитай AVG(price) по категориям.",
        "Используй HAVING: оставь только группы, где COUNT(*) >= 3.",
    ],
    "PY_LISTS": [
        "Дан список nums. Напиши код: вывести только чётные числа и их количество.",
        "Сделай срезы: из списка взять элементы с 2 по 5 (включительно по смыслу) и объясни почему правая граница не включается.",
        "Напиши: найти максимум и минимум списка без использования max/min (циклом).",
    ],
    "PY_DICTS": [
        "Дан словарь products={name:price}. Найди самый дорогой товар (циклом по items()).",
        "Сделай подсчёт частот букв в строке s через словарь (pattern counting).",
        "Сделай dict comprehension: {x: x*x for x in range(1,6)} и объясни.",
    ],
    "PY_FUNCS": [
        "Напиши функцию validate_age(age), которая возвращает True/False и не печатает внутри.",
        "Напиши функцию sum_digits(n) -> int (сумма цифр), потом используй её 3 раза.",
        "Объясни разницу print vs return на своём примере из 2 функций.",
    ],
    "PY_OOP": [
        "Создай класс Student(name, grade). Метод info() возвращает строку, не печатает.",
        "Добавь метод upgrade(points) который увеличивает grade, но не даёт grade > 100 (инкапсуляция правил).",
        "Сделай наследование: class PremiumStudent(Student) с бонусным методом gift().",
    ],
    "PY_FILES": [
        "Создай файл data.txt и запиши туда 5 строк, затем прочитай построчно и выведи только строки длиной > 3.",
        "Прочитай файл и посчитай количество строк и количество символов.",
        "Сделай безопасное чтение через with open(..., encoding='utf-8') и объясни почему так лучше.",
    ],
}

QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "SQL_JOIN": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "Which JOIN returns all rows from the left table and matching rows from the right (NULL when no match)?",
            "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN"],
            "correct": {"answer": "LEFT JOIN"},
            "explain_hint": "LEFT JOIN keeps all left rows; unmatched right columns become NULL.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "You need rows only where a match exists in both tables. Which JOIN is correct?",
            "options": ["LEFT JOIN", "INNER JOIN", "CROSS JOIN", "FULL JOIN"],
            "correct": {"answer": "INNER JOIN"},
            "explain_hint": "INNER JOIN keeps only matched pairs.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain INNER JOIN vs LEFT JOIN in 2-3 sentences.",
            "correct": {
                "answer_text": "INNER JOIN returns only rows where the join condition matches in both tables. LEFT JOIN returns all rows from the left table and matched rows from the right; if no match, right-side columns are NULL."
            },
            "explain_hint": "Mention matched rows and NULLs for non-matches.",
        },
    ],
    "SQL_WHERE": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "Which clause filters rows BEFORE grouping/aggregation happens?",
            "options": ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
            "correct": {"answer": "WHERE"},
            "explain_hint": "WHERE filters rows; HAVING filters groups after aggregation.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "How to filter where age is between 18 and 25 inclusive?",
            "options": ["age IN (18..25)", "age BETWEEN 18 AND 25", "age >= 18 OR age <= 25", "age LIKE '18-25'"],
            "correct": {"answer": "age BETWEEN 18 AND 25"},
            "explain_hint": "BETWEEN is inclusive.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain WHERE vs HAVING and give one example use-case.",
            "correct": {
                "answer_text": "WHERE filters individual rows before GROUP BY and aggregations. HAVING filters aggregated groups after GROUP BY. Example: WHERE year=2026, GROUP BY customer, HAVING COUNT(*)>5."
            },
            "explain_hint": "WHERE=rows pre-aggregation; HAVING=groups post-aggregation.",
        },
    ],
    "SQL_GROUP_BY": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "What does GROUP BY do?",
            "options": ["Sorts rows", "Combines rows into groups for aggregation", "Joins tables", "Deletes duplicates automatically"],
            "correct": {"answer": "Combines rows into groups for aggregation"},
            "explain_hint": "GROUP BY prepares groups for SUM/COUNT/AVG.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "Which rule is correct with GROUP BY?",
            "options": [
                "Any column can be selected without aggregation",
                "All selected columns must be in GROUP BY or aggregated",
                "GROUP BY only works with COUNT",
                "ORDER BY must come before GROUP BY",
            ],
            "correct": {"answer": "All selected columns must be in GROUP BY or aggregated"},
            "explain_hint": "Non-aggregated columns must appear in GROUP BY.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Why does SELECT name, COUNT(*) FROM users; error without GROUP BY name?",
            "correct": {
                "answer_text": "Because COUNT(*) aggregates rows, but name is non-aggregated. SQL requires non-aggregated selected columns to be grouped so the DB knows how to combine rows."
            },
            "explain_hint": "Mixing aggregated and non-aggregated columns requires GROUP BY.",
        },
    ],
    "SQL_AGG": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "Which function counts rows?",
            "options": ["SUM()", "COUNT()", "AVG()", "MIN()"],
            "correct": {"answer": "COUNT()"},
            "explain_hint": "COUNT counts rows.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "Which query counts distinct emails in users table?",
            "options": [
                "SELECT COUNT(email) FROM users;",
                "SELECT COUNT(DISTINCT email) FROM users;",
                "SELECT DISTINCT COUNT(email) FROM users;",
                "SELECT UNIQUE COUNT(email) FROM users;",
            ],
            "correct": {"answer": "SELECT COUNT(DISTINCT email) FROM users;"},
            "explain_hint": "Use COUNT(DISTINCT col).",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain COUNT(*) vs COUNT(column) and when they differ.",
            "correct": {
                "answer_text": "COUNT(*) counts all rows. COUNT(column) counts only rows where that column is NOT NULL. They differ when the column contains NULL values."
            },
            "explain_hint": "NULL handling is key.",
        },
    ],
    "SQL_SUBQUERY": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "A subquery is:",
            "options": ["A query inside another query", "A database index", "A stored procedure", "A type of JOIN"],
            "correct": {"answer": "A query inside another query"},
            "explain_hint": "Subquery = nested SELECT.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "Which keyword is used to check if a subquery returns at least one row?",
            "options": ["EXISTS", "HAVING", "OFFSET", "RETURNING"],
            "correct": {"answer": "EXISTS"},
            "explain_hint": "EXISTS checks for at least one row.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain EXISTS and why it can be faster than IN sometimes.",
            "correct": {
                "answer_text": "EXISTS is true if the subquery returns at least one row and can stop early after finding a match. IN may scan/materialize more of the subquery depending on the planner."
            },
            "explain_hint": "Early stop and planner behavior.",
        },
    ],
    "PY_LISTS": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "Which method adds an element to the end of a Python list?",
            "options": ["add()", "append()", "push()", "insert_end()"],
            "correct": {"answer": "append()"},
            "explain_hint": "append adds one item to the end.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "What does slicing lst[1:4] return?",
            "options": ["Elements at indexes 1,2,3", "Elements 1..4 inclusive", "Only index 4", "A reversed list"],
            "correct": {"answer": "Elements at indexes 1,2,3"},
            "explain_hint": "Right boundary is exclusive.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain append(x) vs extend(iterable).",
            "correct": {
                "answer_text": "append(x) adds x as a single element. extend(iterable) iterates and adds each element from iterable into the list."
            },
            "explain_hint": "append adds one, extend adds many.",
        },
    ],
    "PY_DICTS": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "How to get a value by key from dict d safely (no KeyError), returning None if missing?",
            "options": ["d[key]", "d.get(key)", "d.find(key)", "d.value(key)"],
            "correct": {"answer": "d.get(key)"},
            "explain_hint": "get avoids KeyError and can return default.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "Which creates dict comprehension mapping x -> x*x for x in range(3)?",
            "options": ["{x: x*x for x in range(3)}", "{x = x*x}", "dict(x: x*x)", "[x: x*x]"],
            "correct": {"answer": "{x: x*x for x in range(3)}"},
            "explain_hint": "Dict comprehension is {k:v for ...}.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain what d.setdefault(key, default) does.",
            "correct": {
                "answer_text": "If key exists, returns its value. If missing, inserts key with default and returns default. Useful for grouping/counting patterns."
            },
            "explain_hint": "It may insert when missing.",
        },
    ],
    "PY_FUNCS": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "What keyword returns a value from a function?",
            "options": ["print", "yield", "return", "break"],
            "correct": {"answer": "return"},
            "explain_hint": "return sends a value back to the caller.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "What is printed: def f(x): return x*2; print(f(3)) ?",
            "options": ["3", "6", "9", "Error"],
            "correct": {"answer": "6"},
            "explain_hint": "3*2=6.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain print() vs return inside a function.",
            "correct": {
                "answer_text": "print outputs to console and returns None. return stops the function and sends a value to the caller to be used elsewhere."
            },
            "explain_hint": "print is output; return is a value.",
        },
    ],
    "PY_OOP": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "In Python, what does __init__ define?",
            "options": ["Destructor", "Constructor/initializer", "A loop", "A module"],
            "correct": {"answer": "Constructor/initializer"},
            "explain_hint": "__init__ runs when the object is created.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "What does self represent in a class method?",
            "options": ["The class name", "The current instance", "A global variable", "A parent class"],
            "correct": {"answer": "The current instance"},
            "explain_hint": "self points to the object instance.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain encapsulation in OOP in 2-3 sentences.",
            "correct": {
                "answer_text": "Encapsulation bundles data and methods in a class and controls access to internal state to protect invariants. Usually done with public methods and hidden/private attributes."
            },
            "explain_hint": "Control access and keep invariants.",
        },
    ],
    "PY_FILES": [
        {
            "difficulty": "easy",
            "q_type": "mcq",
            "prompt": "Which mode opens a file for reading text in Python?",
            "options": ["'w'", "'a'", "'r'", "'rb'"],
            "correct": {"answer": "'r'"},
            "explain_hint": "r=read, w=write, a=append.",
        },
        {
            "difficulty": "middle",
            "q_type": "mcq",
            "prompt": "Why is 'with open(...) as f:' recommended?",
            "options": [
                "It speeds up reading",
                "It automatically closes the file even on errors",
                "It makes file global",
                "It prevents encoding issues always",
            ],
            "correct": {"answer": "It automatically closes the file even on errors"},
            "explain_hint": "Context manager closes file safely.",
        },
        {
            "difficulty": "hard",
            "q_type": "short",
            "prompt": "Explain f.read() vs iterating line by line.",
            "correct": {
                "answer_text": "f.read() loads whole file into memory as one string. Line-by-line iteration streams content and uses less memory for large files."
            },
            "explain_hint": "Memory usage differs.",
        },
    ],
}

def cosine_sim(a: torch.Tensor, b: torch.Tensor) -> float:
    return torch.nn.functional.cosine_similarity(a, b, dim=0).item()

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def normalize_level(level: str) -> str:
    level = (level or "middle").strip().lower()
    if level not in ("easy", "middle", "hard"):
        return "middle"
    return level

def topic_list(subject: str) -> List[Tuple[str, str]]:
    return TOPICS.get(subject, [("GEN_BASIC", "Basics")])

def is_trash_prompt(s: str) -> bool:
    t = (s or "").strip().lower()
    if len(t) < 10:
        return True
    bad = [
        "the option is correct",
        "the correct option is",
        "option is correct",
        "choose the correct option",
    ]
    return any(x in t for x in bad)

def is_trash_options(opts: List[str]) -> bool:
    if not isinstance(opts, list) or len(opts) != 4:
        return True
    norm = [str(x).strip() for x in opts]
    if set(norm) == {"A", "B", "C", "D"}:
        return True
    if sum(1 for x in norm if len(x) <= 1) >= 3:
        return True
    return False

def try_extract_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return None
    chunk = m.group(0).replace("\n", " ").strip()
    try:
        return json.loads(chunk)
    except Exception:
        return None

def _t5_call(prompt: str, max_new_tokens: int) -> Optional[str]:
    if not t5:
        return None
    out = t5(
        prompt,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        num_beams=1,
    )
    if not out or not isinstance(out, list):
        return None
    if isinstance(out[0], dict):
        return out[0].get("generated_text") or ""
    return None

def t5_generate_json(prompt: str, max_new_tokens: int, timeout_sec: float) -> Optional[Dict[str, Any]]:
    if not t5:
        return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(_t5_call, prompt, max_new_tokens)
        try:
            text = fut.result(timeout=timeout_sec)
        except Exception:
            return None
    return try_extract_json(text or "")

def pick_from_bank(topic_code: str, level: str) -> Dict[str, Any]:
    items = QUESTION_BANK.get(topic_code, [])
    level = normalize_level(level)
    candidates = [x for x in items if x.get("difficulty") == level]
    if not candidates:
        candidates = items[:] if items else []
    if not candidates:
        return {
            "q_type": "mcq",
            "prompt": f"({topic_code}) Choose the correct option.",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct": {"answer": "Option 1"},
            "explain_hint": f"Review topic {topic_code}.",
        }
    return dict(random.choice(candidates))

def generate_mcq_with_ai(topic_title: str, level: str) -> Optional[Dict[str, Any]]:
    prompt = (
        "Create ONE multiple-choice question for a student exam.\n"
        f"Topic: {topic_title}\n"
        f"Difficulty: {level}\n"
        "Return strict JSON only (no extra text) with keys:\n"
        '{"prompt":"...","options":["...","...","...","..."],"answer":"one of options exactly"}\n'
        "Rules:\n"
        "- options must be meaningful (NOT A/B/C/D)\n"
        "- answer must match exactly one option\n"
        "- prompt must be specific and clear\n"
    )
    data = t5_generate_json(prompt, AI_MAX_NEW_TOKENS_MCQ, AI_TIMEOUT_SEC)
    if not data:
        return None
    pr = str(data.get("prompt", "")).strip()
    opts = data.get("options", [])
    ans = str(data.get("answer", "")).strip()
    if is_trash_prompt(pr):
        return None
    if not isinstance(opts, list) or len(opts) != 4:
        return None
    opts = [str(x).strip() for x in opts]
    if is_trash_options(opts):
        return None
    if ans not in opts:
        return None
    return {"prompt": pr, "options": opts, "correct": {"answer": ans}}

def generate_short_with_ai(topic_title: str, level: str) -> Optional[Dict[str, Any]]:
    prompt = (
        "Create ONE short-answer exam question.\n"
        f"Topic: {topic_title}\n"
        f"Difficulty: {level}\n"
        "Return strict JSON only (no extra text) with keys:\n"
        '{"prompt":"...","answer_text":"2-4 sentences reference answer"}\n'
        "Rules:\n"
        "- prompt must require explanation\n"
        "- answer_text must be correct\n"
    )
    data = t5_generate_json(prompt, AI_MAX_NEW_TOKENS_SHORT, AI_TIMEOUT_SEC)
    if not data:
        return None
    pr = str(data.get("prompt", "")).strip()
    ref = str(data.get("answer_text", "")).strip()
    if is_trash_prompt(pr):
        return None
    if len(ref) < 35:
        return None
    return {"prompt": pr, "correct": {"answer_text": ref}}

def build_question(
    subject: str,
    level: str,
    topic_code: str,
    topic_title: str,
    idx: int,
    allow_ai: bool,
) -> Dict[str, Any]:
    base = pick_from_bank(topic_code, level)
    q_type = base.get("q_type", "mcq")

    if q_type == "mcq":
        ai_q = generate_mcq_with_ai(topic_title, level) if allow_ai else None
        if ai_q:
            prompt = ai_q["prompt"]
            options = ai_q["options"]
            correct = ai_q["correct"]
            generator = "ai"
        else:
            prompt = str(base.get("prompt", "")).strip()
            options = list(base.get("options", []))
            correct = base.get("correct", {}) if isinstance(base.get("correct", {}), dict) else {}
            generator = "bank"

        if is_trash_prompt(prompt) or is_trash_options(options):
            prompt = f"({topic_title}) Choose the correct statement."
            options = ["Option 1", "Option 2", "Option 3", "Option 4"]
            correct = {"answer": "Option 1"}

        return {
            "q_index": idx,
            "q_type": "mcq",
            "prompt": f"[{subject}/{level}] ({topic_title}) {prompt}",
            "options": options,
            "correct": correct,
            "topic_code": topic_code,
            "topic_title": topic_title,
            "meta": {"generator": generator},
        }

    short_ai = generate_short_with_ai(topic_title, level) if allow_ai else None
    if short_ai:
        prompt = short_ai["prompt"]
        correct = short_ai["correct"]
        generator = "ai"
    else:
        prompt = str(base.get("prompt", "")).strip()
        correct = base.get("correct", {}) if isinstance(base.get("correct", {}), dict) else {}
        generator = "bank"

    if "answer_text" not in correct:
        correct = {"answer_text": f"Explain the key idea of {topic_title} in 2-4 sentences."}

    return {
        "q_index": idx,
        "q_type": "short",
        "prompt": f"[{subject}/{level}] ({topic_title}) {prompt}",
        "options": [],
        "correct": correct,
        "topic_code": topic_code,
        "topic_title": topic_title,
        "meta": {"generator": generator},
    }

def weighted_topics(
    subject: str,
    n: int,
    skill_map: Optional[Dict[str, Any]],
    prefer_topics: Optional[List[str]],
) -> List[Tuple[str, str]]:
    arr = topic_list(subject)
    prefer = set(prefer_topics or [])
    if not skill_map:
        weights = []
        for code, _ in arr:
            w = 1.0 + (0.8 if code in prefer else 0.0)
            weights.append(w)
        return random.choices(arr, weights=weights, k=n)

    weights = []
    for code, _ in arr:
        v = skill_map.get(code, None)
        if isinstance(v, (int, float)):
            w = 0.25 + (1.2 - float(v))
        else:
            w = 1.0
        if code in prefer:
            w *= 1.6
        weights.append(max(0.05, w))
    return random.choices(arr, weights=weights, k=n)

def tasks_for_weak_topics(weak_topics: List[str], max_tasks: int = 6) -> List[str]:
    tasks: List[str] = []
    for code in weak_topics:
        pool = TASK_BANK.get(code, [])
        if pool:
            take = 2 if len(tasks) < max_tasks - 1 else 1
            tasks.extend(random.sample(pool, k=min(take, len(pool))))
        if len(tasks) >= max_tasks:
            break
    if not tasks:
        return ["Сделай 3 смешанных задания по теме предмета (минимум 3 разных вопроса)."]
    return tasks[:max_tasks]

def readiness_formula(percent: float, weak_topics_count: int, attempts_count: int) -> int:
    base = float(percent)
    penalty = min(35, int(weak_topics_count) * 8)
    bonus = min(10, math.log1p(max(0, int(attempts_count))) * 4)
    return int(max(1, min(99, round(base - penalty + bonus))))

class GenerateTestIn(BaseModel):
    subject: str
    level: str = Field(default="middle")
    num_questions: int = Field(default=10, ge=3, le=20)
    skill_map: Optional[Dict[str, Any]] = None
    prefer_topics: Optional[List[str]] = None

class QuestionOut(BaseModel):
    q_index: int
    q_type: str
    prompt: str
    options: List[str] = []
    correct: Dict[str, Any] = {}
    topic_code: Optional[str] = None
    topic_title: Optional[str] = None

class GenerateTestOut(BaseModel):
    title: str
    level: str
    questions: List[QuestionOut]
    meta: Dict[str, Any] = {}

class GradeIn(BaseModel):
    subject: str
    questions: List[Dict[str, Any]]
    answers: Dict[str, Any]
    attempts_count: int = 1

class PerQuestion(BaseModel):
    q_index: int
    is_correct: bool
    earned: int
    max_points: int = 1
    explanation: str
    recommendation: Optional[str] = None
    topic_code: Optional[str] = None
    confidence: float = 0.7

class GradeOut(BaseModel):
    score: int
    max_score: int
    percent: float
    weak_topics: List[str]
    recommendations: List[str]
    extra_tasks: List[str]
    per_question_feedback: List[PerQuestion]
    readiness: int

class ReadinessIn(BaseModel):
    percent: float
    weak_topics_count: int
    attempts_count: int

class ReadinessOut(BaseModel):
    readiness: int
    note: str

@app.post("/generate_test", response_model=GenerateTestOut)
def generate_test(data: GenerateTestIn):
    t0 = time.time()

    subject = (data.subject or "SQL").strip()
    level = normalize_level(data.level)
    num_q = int(data.num_questions)

    allow_ai = t5 is not None
    ai_budget = 0
    if allow_ai:
        ai_budget = min(AI_MAX_Q, int(round(num_q * AI_FRACTION)))
        ai_budget = max(0, min(ai_budget, num_q))

    topics = weighted_topics(subject, num_q, data.skill_map, data.prefer_topics)

    questions_raw: List[Dict[str, Any]] = []
    seen = set()

    for i, (topic_code, topic_title) in enumerate(topics, start=1):
        use_ai_now = allow_ai and (ai_budget > 0)
        q = build_question(subject, level, topic_code, topic_title, i, allow_ai=use_ai_now)

        key = (q["topic_code"], q["q_type"], q["prompt"].strip().lower())
        if key in seen:
            q = build_question(subject, level, topic_code, topic_title, i, allow_ai=False)
            key = (q["topic_code"], q["q_type"], q["prompt"].strip().lower())

        seen.add(key)
        questions_raw.append(q)

        if use_ai_now:
            ai_budget -= 1

    qs = [QuestionOut(**q) for q in questions_raw]

    return GenerateTestOut(
        title=f"{subject} {level} adaptive test",
        level=level,
        questions=qs,
        meta={
            "generator": "hybrid(ai+bank)" if t5 else "bank",
            "embedding_model": EMBED_MODEL,
            "gen_model": GEN_MODEL if t5 else None,
            "safe_mode": AI_SAFE_MODE,
            "adaptive": True,
            "ai_budget_used": (min(AI_MAX_Q, int(round(num_q * AI_FRACTION))) if t5 else 0),
            "took_ms": int((time.time() - t0) * 1000),
            "note": "Fast mode: AI is used only for a limited number of questions + strict timeout.",
        },
    )

@app.post("/grade_and_feedback", response_model=GradeOut)
def grade_and_feedback(data: GradeIn):
    score = 0
    max_score = len(data.questions)

    weak: List[str] = []
    per: List[PerQuestion] = []

    subject = (data.subject or "SQL").strip()

    for q in data.questions:
        idx = int(q.get("q_index"))
        q_type = q.get("q_type")
        correct = q.get("correct", {}) or {}
        topic_code = q.get("topic_code") or None
        topic_title = q.get("topic_title") or (topic_code or "Basics")

        ans = data.answers.get(str(idx))

        is_correct = False
        conf = 0.7

        if q_type == "mcq":
            target = str(correct.get("answer", "")).strip()
            is_correct = (ans is not None) and (str(ans).strip() == target)
            conf = 0.92 if is_correct else 0.68
        else:
            ref = str(correct.get("answer_text", "")).strip()
            ans_text = "" if ans is None else str(ans).strip()
            if ans_text == "":
                is_correct = False
                conf = 0.35
            else:
                e_ref = embedder.encode(ref, convert_to_tensor=True)
                e_ans = embedder.encode(ans_text, convert_to_tensor=True)
                sim = cosine_sim(e_ref, e_ans)
                is_correct = sim >= 0.58
                conf = float(clamp(sim, 0.45, 0.95))

        earned = 1 if is_correct else 0
        score += earned

        if not is_correct and topic_code:
            weak.append(topic_code)

        hint = "Повтори тему и реши 2 похожих примера."
        if topic_code and topic_code in QUESTION_BANK:
            items = QUESTION_BANK[topic_code]
            if items:
                hint = str(items[0].get("explain_hint") or hint)

        if is_correct:
            explanation = "Correct."
            recommendation = None
        else:
            explanation = f"{hint} Сделай 2 похожих примера."
            recommendation = f"Repeat topic: {topic_title}"

        per.append(
            PerQuestion(
                q_index=idx,
                is_correct=is_correct,
                earned=earned,
                max_points=1,
                explanation=explanation,
                recommendation=recommendation,
                topic_code=topic_code,
                confidence=conf,
            )
        )

    percent = 0.0 if max_score == 0 else round((score / max_score) * 100, 2)
    weak_topics = sorted(list(set(weak)))

    if weak_topics:
        recommendations = [
            "Focus on weak topics shown below.",
            "Re-test after practice to track improvement.",
        ]
    else:
        recommendations = ["Good job. Try a harder level or another subject."]

    extra_tasks = tasks_for_weak_topics(weak_topics, max_tasks=6)
    readiness = readiness_formula(percent, len(weak_topics), data.attempts_count)

    return GradeOut(
        score=score,
        max_score=max_score,
        percent=percent,
        weak_topics=weak_topics,
        recommendations=recommendations,
        extra_tasks=extra_tasks,
        per_question_feedback=per,
        readiness=readiness,
    )

@app.post("/predict_readiness", response_model=ReadinessOut)
def predict_readiness(data: ReadinessIn):
    readiness = readiness_formula(data.percent, data.weak_topics_count, data.attempts_count)
    return ReadinessOut(
        readiness=readiness,
        note="Explainable formula. Stable MVP. Can be replaced with ML later.",
    )