from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import random
import math

import torch
from sentence_transformers import SentenceTransformer
from transformers import pipeline

app = FastAPI(title="Adaptive Exam AI Service")

embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

try:
    t5 = pipeline("text2text-generation", model="google/flan-t5-base")
except Exception:
    t5 = None


class ReadinessNet(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.net = torch.nn.Sequential(
            torch.nn.Linear(3, 8),
            torch.nn.ReLU(),
            torch.nn.Linear(8, 1),
            torch.nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)


readiness_model = ReadinessNet()


TOPICS = {
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


def cosine_sim(a: torch.Tensor, b: torch.Tensor) -> float:
    return torch.nn.functional.cosine_similarity(a, b, dim=0).item()


def gen_explanation(question: str, answer: Any, topic: str) -> str:
    if t5:
        prompt = (
            "Explain simply (2-3 sentences) what the student did wrong and what to review.\n"
            f"Topic: {topic}\nQuestion: {question}\nStudent answer: {answer}\n"
        )
        out = t5(prompt, max_new_tokens=96)
        if out and isinstance(out, list):
            return out[0]["generated_text"]

    return f"Fallback: review {topic}. Check the definition and solve 2 similar examples."


def choose_topics(subject: str, n: int):
    arr = TOPICS.get(subject, [("GEN_BASIC", "Basics")])
    return [random.choice(arr) for _ in range(n)]


class GenerateTestIn(BaseModel):
    subject: str
    level: str = Field(default="middle")
    num_questions: int = Field(default=10, ge=3, le=20)


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
    topics = choose_topics(data.subject, data.num_questions)
    qs: List[QuestionOut] = []

    for i in range(1, data.num_questions + 1):
        topic_code, topic_title = topics[i - 1]
        is_mcq = (i % 3 != 0)

        if is_mcq:
            qs.append(
                QuestionOut(
                    q_index=i,
                    q_type="mcq",
                    prompt=f"[{data.subject}/{data.level}] ({topic_title}) Choose the correct option for Q{i}.",
                    options=["A", "B", "C", "D"],
                    correct={"answer": "B"},
                    topic_code=topic_code,
                    topic_title=topic_title
                )
            )
        else:
            ref = f"Key idea about {topic_title}"
            qs.append(
                QuestionOut(
                    q_index=i,
                    q_type="short",
                    prompt=f"[{data.subject}/{data.level}] ({topic_title}) Answer briefly: Q{i}.",
                    options=[],
                    correct={"answer_text": ref},
                    topic_code=topic_code,
                    topic_title=topic_title
                )
            )

    return GenerateTestOut(
        title=f"{data.subject} {data.level} adaptive test",
        level=data.level,
        questions=qs,
        meta={
            "generator": "flan-t5-base" if t5 else "fallback",
            "embedding_model": "all-MiniLM-L6-v2",
            "note": "Inference only. No training pipeline."
        }
    )


@app.post("/grade_and_feedback", response_model=GradeOut)
def grade_and_feedback(data: GradeIn):
    score = 0
    max_score = len(data.questions)
    weak = []
    per: List[PerQuestion] = []

    for q in data.questions:
        idx = int(q.get("q_index"))
        q_type = q.get("q_type")
        prompt = q.get("prompt", "")
        correct = q.get("correct", {}) or {}
        topic_code = q.get("topic_code") or None
        topic_title = q.get("topic_title") or (topic_code or "Basics")

        ans = data.answers.get(str(idx))

        is_correct = False
        conf = 0.7

        if q_type == "mcq":
            is_correct = (ans is not None) and (str(ans) == str(correct.get("answer")))
            conf = 0.9 if is_correct else 0.7
        else:
            ref = str(correct.get("answer_text", "")).strip()
            ans_text = "" if ans is None else str(ans).strip()

            if ans_text == "":
                is_correct = False
                conf = 0.4
            else:
                e_ref = embedder.encode(ref, convert_to_tensor=True)
                e_ans = embedder.encode(ans_text, convert_to_tensor=True)
                sim = cosine_sim(e_ref, e_ans)
                is_correct = sim >= 0.55
                conf = float(max(0.45, min(0.95, sim)))

        earned = 1 if is_correct else 0
        score += earned

        if not is_correct and topic_code:
            weak.append(topic_code)

        if is_correct:
            explanation = "Correct."
            recommendation = None
        else:
            explanation = gen_explanation(prompt, ans, topic_title)
            recommendation = f"Repeat topic: {topic_title}"

        per.append(
            PerQuestion(
                q_index=idx,
                is_correct=is_correct,
                earned=earned,
                explanation=explanation,
                recommendation=recommendation,
                topic_code=topic_code,
                confidence=conf
            )
        )

    percent = 0.0 if max_score == 0 else round((score / max_score) * 100, 2)
    weak_topics = sorted(list(set(weak)))

    recommendations = []
    if weak_topics:
        recommendations.append("Focus on weak topics shown below.")
        recommendations.append("Re-test after practice to track improvement.")

    extra_tasks = (
        [f"Do 3 exercises on {t}" for t in weak_topics[:3]]
        or ["Do 3 mixed exercises (demo)"]
    )

    penalty = min(35, len(weak_topics) * 8)
    readiness = int(max(1, min(99, round(percent - penalty + 5))))

    return GradeOut(
        score=score,
        max_score=max_score,
        percent=percent,
        weak_topics=weak_topics,
        recommendations=recommendations,
        extra_tasks=extra_tasks,
        per_question_feedback=per,
        readiness=readiness
    )


@app.post("/predict_readiness", response_model=ReadinessOut)
def predict_readiness(data: ReadinessIn):
    base = data.percent
    penalty = min(35, data.weak_topics_count * 8)
    bonus = min(10, math.log1p(max(0, data.attempts_count)) * 4)
    readiness = int(max(1, min(99, round(base - penalty + bonus))))

    return ReadinessOut(
        readiness=readiness,
        note="Explainable formula. Can be replaced with ML later. No training pipeline."
    )