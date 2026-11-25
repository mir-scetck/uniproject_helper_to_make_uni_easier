from django.db import models
from django.utils import timezone


class Person(models.Model):
    """الفئة الأساسية المجردة للشخص وفق مبادئ الوراثة في OOP."""

    first_name = models.CharField("الاسم الأول", max_length=80)
    last_name = models.CharField("الاسم الأخير", max_length=80)
    email = models.EmailField("البريد الإلكتروني", unique=True)

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self) -> str:
        return self.full_name


class Teacher(Person):
    """فئة المعلم ترث من Person وتضيف اسم المادة والفرقة الدراسية."""

    subject_name = models.CharField("اسم المادة", max_length=120)
    academic_year = models.CharField("الفرقة الدراسية", max_length=80, default="الفرقة الثانية")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class Student(Person):
    """فئة الطالب ترث من Person وتضيف السنة الدراسية والشعبة وبريد ولي الأمر."""

    academic_year = models.CharField("السنة الدراسية", max_length=80)
    classroom = models.CharField("الفصل / الشعبة", max_length=60, default="حاسب آلي")
    parent_email = models.EmailField("بريد ولي الأمر")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class Quiz(models.Model):
    title = models.CharField("عنوان الاختبار", max_length=200)
    description = models.TextField("وصف الاختبار", blank=True)
    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, related_name="quizzes", verbose_name="المعلم"
    )
    academic_year = models.CharField("السنة الدراسية", max_length=80)
    duration_minutes = models.PositiveIntegerField("المدة بالدقائق", default=20)
    created_at = models.DateTimeField("تاريخ الإنشاء", default=timezone.now)
    is_active = models.BooleanField("مفعل", default=True)

    def __str__(self) -> str:
        return self.title


class Question(models.Model):
    class QuestionType(models.TextChoices):
        MCQ = "mcq", "اختيار من متعدد"
        TRUE_FALSE = "true_false", "صح وخطأ"
        FILL_BLANK = "fill_blank", "إكمال الفراغات"

    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="questions", verbose_name="الاختبار"
    )
    question_type = models.CharField(
        "نوع السؤال", max_length=20, choices=QuestionType.choices
    )
    prompt = models.TextField("نص السؤال")
    options_json = models.JSONField("الخيارات", default=list, blank=True)
    correct_answer = models.CharField("الإجابة الصحيحة", max_length=255)
    points = models.PositiveIntegerField("الدرجة", default=2)
    book_reference = models.CharField("مرجع الكتاب", max_length=150, blank=True)

    def __str__(self) -> str:
        return f"[{self.get_question_type_display()}] {self.prompt[:40]}"


class StudentAnswer(models.Model):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="answers", verbose_name="الطالب"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="student_answers", verbose_name="السؤال"
    )
    submitted_answer = models.CharField("إجابة الطالب", max_length=255)
    is_correct = models.BooleanField("صحيحة؟", default=False)
    earned_points = models.PositiveIntegerField("الدرجة المكتسبة", default=0)
    submitted_at = models.DateTimeField("وقت التسليم", default=timezone.now)


class QuizResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="results")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="results")
    score = models.FloatField("الدرجة")
    total_points = models.FloatField("الدرجة الكلية")
    percentage = models.FloatField("النسبة المئوية")
    grade_label = models.CharField("التقدير", max_length=40)
    submitted_at = models.DateTimeField(default=timezone.now)


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "حاضر"
        ABSENT = "absent", "غائب"
        LATE = "late", "متأخر"

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField("التاريخ", default=timezone.localdate)
    status = models.CharField("الحالة", max_length=20, choices=Status.choices)
    notes = models.CharField("ملاحظات", max_length=255, blank=True)
