from typing import Dict, List, Tuple
from .decorators import measure_execution_time


def normalize_answer(value: str) -> str:
    """دالة خالصة لتطبيع النص دون تعديل الأصل."""
    return " ".join(str(value).strip().lower().split())


def calculate_percentage(score: float, total_points: float) -> float:
    """دالة خالصة لحساب النسبة المئوية مع منع القسمة على صفر."""
    if total_points <= 0:
        raise ZeroDivisionError("لا يمكن القسمة على صفر: الدرجة الكلية يجب أن تكون أكبر من 0.")
    return round((score / total_points) * 100.0, 1)


def get_arabic_grade_label(percentage: float) -> str:
    """دالة خالصة لإرجاع التقدير اللفظي باللغة العربية."""
    if percentage >= 90:
        return "ممتاز"
    if percentage >= 80:
        return "جيد جداً"
    if percentage >= 65:
        return "جيد"
    if percentage >= 50:
        return "مقبول"
    return "يحتاج إلى دعم"


@measure_execution_time
def auto_grade_quiz(
    questions: Tuple[Dict, ...],
    submitted_answers: Dict[str, str],
) -> Dict:
    """دالة تصحيح خالصة لا تغيّر البيانات الأصلية وتعيد قاموس النتائج."""
    if not questions:
        raise ValueError("لا يحتوي الاختبار على أسئلة قابلة للتصحيح.")

    details = tuple(
        {
            "question_id": q["id"],
            "is_correct": normalize_answer(submitted_answers.get(str(q["id"]), ""))
            == normalize_answer(q["correct_answer"]),
            "earned_points": (
                q["points"]
                if normalize_answer(submitted_answers.get(str(q["id"]), ""))
                == normalize_answer(q["correct_answer"])
                else 0
            ),
        }
        for q in questions
    )

    total_points = sum(map(lambda q: q["points"], questions))
    score = sum(map(lambda d: d["earned_points"], details))
    percentage = calculate_percentage(score, total_points)

    return {
        "score": score,
        "total_points": total_points,
        "percentage": percentage,
        "grade_label": get_arabic_grade_label(percentage),
        "passed": percentage >= 50.0,
        "details": details,
    }


def compute_average_grade(records: List[Dict]) -> float:
    """توظيف map و lambda لحساب متوسط الدرجات."""
    if not records:
        return 0.0
    percentages = list(map(lambda r: float(r["percentage"]), records))
    return round(sum(percentages) / len(percentages), 1)


def filter_passing_students(records: List[Dict]) -> List[Dict]:
    """توظيف filter و lambda لتصفية الطلاب الناجحين."""
    return list(filter(lambda r: float(r["percentage"]) >= 50.0, records))


def extract_honor_students(records: List[Dict], threshold: float = 85.0) -> List[str]:
    """فهم القوائم (List Comprehension) لاستخراج قائمة الطلاب المتفوقين."""
    return [r["student_name"] for r in records if float(r["percentage"]) >= threshold]


def get_grade_distribution(records: List[Dict]) -> Dict[str, int]:
    """فهم القواميس (Dictionary Comprehension) لحساب توزيع التقديرات."""
    tiers = ("ممتاز", "جيد جداً", "جيد", "مقبول", "يحتاج إلى دعم")
    return {
        tier: sum(1 for r in records if get_arabic_grade_label(float(r["percentage"])) == tier)
        for tier in tiers
    }
