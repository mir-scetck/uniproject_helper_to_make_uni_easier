from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List


# ============================================================
# 1. نمط التصميم الإنشائي: Factory Method لإنشاء الأسئلة
# ============================================================
@dataclass
class BaseQuestionBlueprint(ABC):
    prompt: str
    correct_answer: str
    points: int = 2
    book_reference: str = ""

    @property
    @abstractmethod
    def question_type(self) -> str:
        pass

    @abstractmethod
    def build_options(self) -> List[str]:
        pass


@dataclass
class McqQuestionBlueprint(BaseQuestionBlueprint):
    options: List[str] = field(default_factory=list)

    @property
    def question_type(self) -> str:
        return "mcq"

    def build_options(self) -> List[str]:
        if len(self.options) < 2:
            raise ValueError("سؤال الاختيار من متعدد يجب أن يحتوي على خيارين على الأقل.")
        return self.options


@dataclass
class TrueFalseQuestionBlueprint(BaseQuestionBlueprint):
    @property
    def question_type(self) -> str:
        return "true_false"

    def build_options(self) -> List[str]:
        return ["صح", "خطأ"]


@dataclass
class FillBlankQuestionBlueprint(BaseQuestionBlueprint):
    @property
    def question_type(self) -> str:
        return "fill_blank"

    def build_options(self) -> List[str]:
        return []


class QuestionFactory:
    """مصنع موحد لإنشاء كائنات الأسئلة بناءً على النوع."""

    @staticmethod
    def create_question(
        question_type: str,
        prompt: str,
        correct_answer: str,
        options: List[str] | None = None,
        points: int = 2,
        book_reference: str = "",
    ) -> BaseQuestionBlueprint:
        q_type = question_type.strip().lower()
        if q_type == "mcq":
            return McqQuestionBlueprint(
                prompt=prompt,
                correct_answer=correct_answer,
                options=options or [],
                points=points,
                book_reference=book_reference,
            )
        if q_type == "true_false":
            return TrueFalseQuestionBlueprint(
                prompt=prompt,
                correct_answer=correct_answer,
                points=points,
                book_reference=book_reference,
            )
        if q_type == "fill_blank":
            return FillBlankQuestionBlueprint(
                prompt=prompt,
                correct_answer=correct_answer,
                points=points,
                book_reference=book_reference,
            )
        raise ValueError(f"نوع السؤال غير معروف: {question_type}")


# ============================================================
# 2. نمط التصميم السلوكي: Observer للإشعارات التلقائية
# ============================================================
class Observer(ABC):
    @abstractmethod
    def update(self, event_type: str, payload: Dict[str, str]) -> str:
        pass


class StudentObserver(Observer):
    def update(self, event_type: str, payload: Dict[str, str]) -> str:
        if event_type == "grade_published":
            return (
                f"إشعار للطالب ({payload['student_name']}): "
                f"تم نشر نتيجتك في {payload['quiz_title']} بنسبة {payload['percentage']}%."
            )
        return (
            f"إشعار للطالب ({payload['student_name']}): "
            f"تم تسجيل حالتك ({payload['status']}) بتاريخ {payload['date']}."
        )


class ParentObserver(Observer):
    def update(self, event_type: str, payload: Dict[str, str]) -> str:
        if event_type == "absence_alert":
            return (
                f"إشعار لولي أمر ({payload['student_name']}): "
                f"نحيطكم علماً بتسجيل غياب الطالب بتاريخ {payload['date']}."
            )
        return (
            f"إشعار لولي أمر ({payload['student_name']}): "
            f"درجة الطالب في {payload['quiz_title']} هي {payload['percentage']}% ({payload['grade_label']})."
        )


class NotificationSubject:
    """الناشر الذي يدير المشتركين ويرسل الإشعارات تلقائياً عند نشر الدرجات أو الغياب."""

    def __init__(self) -> None:
        self._observers: List[Observer] = []

    def attach(self, observer: Observer) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def notify(self, event_type: str, payload: Dict[str, str]) -> List[str]:
        return [observer.update(event_type, payload) for observer in self._observers]
