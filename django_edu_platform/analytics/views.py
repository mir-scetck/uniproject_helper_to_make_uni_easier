from django.http import JsonResponse
from quizzes.decorators import teacher_required
from quizzes.models import Attendance, QuizResult
from .analytics_engine import (
    analyze_performance_with_pandas,
    generate_matplotlib_charts_base64,
    train_and_predict_knn,
)


@teacher_required
def analytics_summary_api(request):
    results = list(
        QuizResult.objects.select_related("student").values(
            "student__first_name", "student__last_name", "student__classroom", "percentage"
        )
    )
    formatted_grades = [
        {
            "student_name": f"{r['student__first_name']} {r['student__last_name']}",
            "classroom": r["student__classroom"],
            "percentage": r["percentage"],
        }
        for r in results
    ]
    attendance_data = list(Attendance.objects.values("status"))

    stats = analyze_performance_with_pandas(formatted_grades, attendance_data)
    charts = generate_matplotlib_charts_base64(formatted_grades)
    features = [[r["percentage"], stats["attendance_rate"], 2] for r in formatted_grades]
    knn_report = train_and_predict_knn(features, n_neighbors=3)

    return JsonResponse({"stats": stats, "charts": charts, "knn": knn_report})
