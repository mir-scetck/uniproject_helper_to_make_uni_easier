from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("student/", views.student_dashboard, name="student_dashboard"),
    path("teacher/", views.teacher_dashboard, name="teacher_dashboard"),
    path("teacher/export-csv/", views.export_grades_csv_view, name="export_grades_csv"),
]
