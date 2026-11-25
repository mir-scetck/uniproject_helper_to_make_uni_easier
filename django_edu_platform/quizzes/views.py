import csv
import io
import logging
from django.contrib import messages
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from .decorators import teacher_required
from .grading import auto_grade_quiz
from .io_utils import generate_gradebook_rows
from .models import Attendance, Question, Quiz, QuizResult, Student, StudentAnswer
from .patterns import QuestionFactory
from .tasks import trigger_background_notification
from .validators import validate_numeric_score, validate_text

logger = logging.getLogger(__name__)


def home(request):
    quizzes = Quiz.objects.filter(is_active=True).order_by("-created_at")

    if request.method == "POST":
        role = request.POST.get("role", "student")
        try:
            full_name = validate_text(request.POST.get("full_name", ""), "الاسم", 2, 80)
            academic_year = validate_text(request.POST.get("academic_year", ""), "الفرقة الدراسية", 3, 60)

            if role == "teacher":
                subject_name = validate_text(request.POST.get("subject_name", ""), "اسم المادة", 2, 100)
                request.session["role"] = "teacher"
                request.session["user_profile"] = {
                    "role": "teacher",
                    "full_name": full_name,
                    "subject_name": subject_name,
                    "academic_year": academic_year,
                }
                messages.success(request, f"مرحباً {full_name} — تم توجيهك إلى لوحة المعلم.")
                return redirect("teacher_dashboard")

            classroom = validate_text(request.POST.get("classroom", ""), "الشعبة", 2, 40)
            parts = full_name.split(maxsplit=1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
            student, _ = Student.objects.get_or_create(
                first_name=first_name,
                last_name=last_name,
                defaults={
                    "email": f"stu_{Student.objects.count() + 1}@damietta.edu.eg",
                    "academic_year": academic_year,
                    "classroom": classroom,
                    "parent_email": f"parent_{Student.objects.count() + 1}@mail.eg",
                },
            )
            request.session["role"] = "student"
            request.session["student_id"] = student.id
            request.session["user_profile"] = {
                "role": "student",
                "full_name": full_name,
                "classroom": classroom,
                "academic_year": academic_year,
            }
            messages.success(request, f"مرحباً {full_name} — تم توجيهك إلى لوحة الطالب.")
            return redirect("student_dashboard")
        except ValueError as exc:
            messages.error(request, str(exc))

    return render(
        request,
        "home.html",
        {
            "quizzes": quizzes,
            "user_profile": request.session.get("user_profile"),
        },
    )


def student_dashboard(request):
    quizzes = Quiz.objects.filter(is_active=True).prefetch_related("questions")
    selected_quiz = quizzes.first()
    result_context = None
    user_profile = request.session.get("user_profile")

    if request.method == "POST":
        quiz_id = request.POST.get("quiz_id")
        selected_quiz = get_object_or_404(Quiz, id=quiz_id)
        questions_tuple = tuple(
            {
                "id": q.id,
                "correct_answer": q.correct_answer,
                "points": q.points,
            }
            for q in selected_quiz.questions.all()
        )
        submitted = {
            str(q.id): request.POST.get(f"question_{q.id}", "")
            for q in selected_quiz.questions.all()
        }

        try:
            graded = auto_grade_quiz(questions_tuple, submitted)
            session_student_id = request.session.get("student_id")
            student = (
                Student.objects.filter(id=session_student_id).first()
                if session_student_id
                else Student.objects.first()
            )
            if student:
                QuizResult.objects.create(
                    student=student,
                    quiz=selected_quiz,
                    score=graded["score"],
                    total_points=graded["total_points"],
                    percentage=graded["percentage"],
                    grade_label=graded["grade_label"],
                )
                for q in selected_quiz.questions.all():
                    ans_val = submitted.get(str(q.id), "")
                    is_ok = ans_val.strip().lower() == q.correct_answer.strip().lower()
                    StudentAnswer.objects.create(
                        student=student,
                        question=q,
                        submitted_answer=ans_val,
                        is_correct=is_ok,
                        earned_points=q.points if is_ok else 0,
                    )
                trigger_background_notification(
                    "grade_published",
                    {
                        "student_name": student.full_name,
                        "quiz_title": selected_quiz.title,
                        "percentage": str(graded["percentage"]),
                        "grade_label": graded["grade_label"],
                    },
                )
            result_context = graded
            messages.success(request, "تم تصحيح الاختبار تلقائياً وحفظ درجتك بنجاح!")
        except (ValueError, ZeroDivisionError) as exc:
            logger.error("خطأ أثناء تصحيح الاختبار: %s", exc)
            messages.error(request, str(exc))

    return render(
        request,
        "student_dashboard.html",
        {
            "quizzes": quizzes,
            "selected_quiz": selected_quiz,
            "result": result_context,
            "user_profile": user_profile,
        },
    )


@teacher_required
def teacher_dashboard(request):
    quizzes = Quiz.objects.all().prefetch_related("questions")
    students = Student.objects.all()
    results = QuizResult.objects.select_related("student", "quiz").order_by("-submitted_at")
    attendance_list = Attendance.objects.select_related("student").order_by("-date")

    if request.method == "POST":
        action = request.POST.get("action")
        try:
            if action == "add_question":
                quiz = get_object_or_404(Quiz, id=request.POST.get("quiz_id"))
                q_type = request.POST.get("question_type", "mcq")
                prompt = validate_text(request.POST.get("prompt", ""), "نص السؤال", 6, 400)
                correct = validate_text(request.POST.get("correct_answer", ""), "الإجابة", 1, 200)
                points = int(validate_numeric_score(request.POST.get("points", "2"), "الدرجة"))
                raw_opts = [o.strip() for o in request.POST.get("options", "").split("|") if o.strip()]

                blueprint = QuestionFactory.create_question(
                    question_type=q_type,
                    prompt=prompt,
                    correct_answer=correct,
                    options=raw_opts,
                    points=points,
                )
                Question.objects.create(
                    quiz=quiz,
                    question_type=blueprint.question_type,
                    prompt=blueprint.prompt,
                    options_json=blueprint.build_options(),
                    correct_answer=blueprint.correct_answer,
                    points=blueprint.points,
                )
                messages.success(request, "تمت إضافة السؤال بنجاح عبر نمط المصنع.")
            elif action == "record_attendance":
                student = get_object_or_404(Student, id=request.POST.get("student_id"))
                status = request.POST.get("status", "present")
                rec = Attendance.objects.create(student=student, status=status)
                if status == "absent":
                    trigger_background_notification(
                        "absence_alert",
                        {
                            "student_name": student.full_name,
                            "status": "غائب",
                            "date": str(rec.date),
                        },
                    )
                messages.success(request, f"تم تسجيل حضور الطالب {student.full_name}.")
        except ValueError as exc:
            messages.error(request, str(exc))
        return redirect("teacher_dashboard")

    return render(
        request,
        "teacher_dashboard.html",
        {
            "quizzes": quizzes,
            "students": students,
            "results": results,
            "attendance_list": attendance_list,
        },
    )


@teacher_required
def export_grades_csv_view(request):
    results = QuizResult.objects.select_related("student", "quiz").all()
    records = [
        {
            "student_name": r.student.full_name,
            "classroom": r.student.classroom,
            "quiz_title": r.quiz.title,
            "score": r.score,
            "total_points": r.total_points,
            "percentage": r.percentage,
            "grade_label": r.grade_label,
        }
        for r in results
    ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in generate_gradebook_rows(records):
        writer.writerow(row)

    response = HttpResponse(
        "\ufeff" + buffer.getvalue(), content_type="text/csv; charset=utf-8"
    )
    response["Content-Disposition"] = 'attachment; filename="gradebook.csv"'
    return response
