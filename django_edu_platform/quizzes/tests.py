import os
import tempfile
import unittest
from quizzes.grading import (
    auto_grade_quiz,
    calculate_percentage,
    compute_average_grade,
    extract_honor_students,
    filter_passing_students,
    get_grade_distribution,
)
from quizzes.io_utils import export_gradebook_csv, read_questions_csv_generator
from quizzes.patterns import NotificationSubject, ParentObserver, QuestionFactory, StudentObserver
from quizzes.validators import safe_lookup, validate_email_address, validate_numeric_score


class PlatformUnitTests(unittest.TestCase):
    def test_auto_grade_quiz_pure(self):
        questions = (
            {"id": 1, "correct_answer": "super()", "points": 5},
            {"id": 2, "correct_answer": "صح", "points": 5},
        )
        result = auto_grade_quiz(questions, {"1": "super()", "2": "صح"})
        self.assertEqual(result["score"], 10)
        self.assertEqual(result["percentage"], 100.0)
        self.assertTrue(result["passed"])
        self.assertEqual(result["grade_label"], "ممتاز")

    def test_zero_division_raises(self):
        with self.assertRaises(ZeroDivisionError):
            calculate_percentage(10, 0)

    def test_functional_helpers_and_comprehensions(self):
        records = [
            {"student_name": "عمر", "percentage": 92},
            {"student_name": "يوسف", "percentage": 45},
            {"student_name": "مريم", "percentage": 88},
        ]
        self.assertEqual(compute_average_grade(records), 75.0)
        self.assertEqual(len(filter_passing_students(records)), 2)
        self.assertEqual(extract_honor_students(records, 85), ["عمر", "مريم"])
        dist = get_grade_distribution(records)
        self.assertEqual(dist["ممتاز"], 1)
        self.assertEqual(dist["جيد جداً"], 1)

    def test_validators_and_exceptions(self):
        self.assertEqual(validate_email_address("user@damietta.edu.eg"), "user@damietta.edu.eg")
        with self.assertRaises(ValueError):
            validate_email_address("bad-email")
        with self.assertRaises(ValueError):
            validate_numeric_score("abc")
        with self.assertRaises(KeyError):
            safe_lookup({"a": 1}, "missing_key")
        with self.assertRaises(FileNotFoundError):
            list(read_questions_csv_generator("non_existent_file_123.csv"))

    def test_factory_and_observer_patterns(self):
        q = QuestionFactory.create_question(
            "mcq", "ما وظيفة yield؟", "مولد", ["مولد", "زخرف"], 2
        )
        self.assertEqual(q.question_type, "mcq")
        self.assertEqual(len(q.build_options()), 2)

        subject = NotificationSubject()
        subject.attach(StudentObserver())
        subject.attach(ParentObserver())
        msgs = subject.notify(
            "grade_published",
            {"student_name": "عمر", "quiz_title": "بايثون 2", "percentage": "90", "grade_label": "ممتاز"},
        )
        self.assertEqual(len(msgs), 2)
        self.assertTrue("عمر" in msgs[0])

    def test_csv_generator_export_and_import(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            csv_path = os.path.join(tmp_dir, "grades.csv")
            export_gradebook_csv(
                csv_path,
                [
                    {
                        "student_name": "مريم حسن",
                        "classroom": "شعبة أ",
                        "quiz_title": "بايثون 2",
                        "score": 19,
                        "total_points": 20,
                        "percentage": 95,
                        "grade_label": "ممتاز",
                    }
                ],
            )
            self.assertTrue(os.path.exists(csv_path))


if __name__ == "__main__":
    unittest.main()
