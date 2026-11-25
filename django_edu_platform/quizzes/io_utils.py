import csv
import logging
from typing import Dict, Generator, Iterable, List

logger = logging.getLogger(__name__)


def read_questions_csv_generator(file_path: str) -> Generator[Dict[str, str], None, None]:
    """دالة مولد تعتمد على yield لقراءة ملفات الأسئلة الكبيرة سطراً بسطر لتوفير الذاكرة."""
    try:
        with open(file_path, mode="r", encoding="utf-8-sig", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                yield {
                    "type": (row.get("type") or "").strip(),
                    "prompt": (row.get("prompt") or "").strip(),
                    "options": (row.get("options") or "").strip(),
                    "correct": (row.get("correct") or "").strip(),
                    "points": (row.get("points") or "2").strip(),
                    "ref": (row.get("ref") or "").strip(),
                }
    except FileNotFoundError as exc:
        logger.error("الملف غير موجود أثناء الاستيراد: %s", file_path)
        raise FileNotFoundError(f"تعذر العثور على الملف: {file_path}") from exc
    finally:
        logger.info("انتهت عملية قراءة ملف CSV: %s", file_path)


def generate_gradebook_rows(records: Iterable[Dict]) -> Generator[List[str], None, None]:
    """دالة مولد لتصدير صفوف كشف الدرجات سطراً بسطر."""
    yield ["اسم الطالب", "الفصل", "الاختبار", "الدرجة", "الدرجة الكلية", "النسبة المئوية", "التقدير"]
    for rec in records:
        yield [
            str(rec["student_name"]),
            str(rec["classroom"]),
            str(rec["quiz_title"]),
            str(rec["score"]),
            str(rec["total_points"]),
            f"{rec['percentage']}%",
            str(rec["grade_label"]),
        ]


def export_gradebook_csv(file_path: str, records: Iterable[Dict]) -> None:
    """كتابة كشف الدرجات باستخدام عبارة with لضمان إغلاق الموارد تلقائياً."""
    try:
        with open(file_path, mode="w", encoding="utf-8-sig", newline="") as out_file:
            writer = csv.writer(out_file)
            for row in generate_gradebook_rows(records):
                writer.writerow(row)
    except OSError as exc:
        logger.exception("فشل تصدير ملف الدرجات: %s", file_path)
        raise OSError(f"حدث خطأ أثناء حفظ الملف: {file_path}") from exc
    finally:
        logger.info("اكتمل إغلاق سياق التصدير للملف: %s", file_path)
