import base64
import io
import logging
from typing import Dict, List
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

logger = logging.getLogger(__name__)


def analyze_performance_with_pandas(
    grades_data: List[Dict], attendance_data: List[Dict]
) -> Dict:
    """تنظيف بيانات الدرجات وحساب الإحصاءات الوصفية ونسب الحضور عبر Pandas و NumPy."""
    if not grades_data:
        return {"mean": 0.0, "median": 0.0, "std": 0.0, "pass_rate": 0.0, "attendance_rate": 100.0}

    df = pd.DataFrame(grades_data)
    df["percentage"] = pd.to_numeric(df["percentage"], errors="coerce")
    df = df.dropna(subset=["percentage"])

    scores = df["percentage"].to_numpy(dtype=float)
    mean_val = round(float(np.mean(scores)), 1)
    median_val = round(float(np.median(scores)), 1)
    std_val = round(float(np.std(scores)), 1)
    pass_rate = round(float(np.mean(scores >= 50.0) * 100.0), 1)

    att_rate = 100.0
    if attendance_data:
        att_df = pd.DataFrame(attendance_data)
        present_count = (att_df["status"] == "present").sum()
        att_rate = round(float((present_count / len(att_df)) * 100.0), 1)

    return {
        "mean": mean_val,
        "median": median_val,
        "std": std_val,
        "pass_rate": pass_rate,
        "attendance_rate": att_rate,
    }


def generate_matplotlib_charts_base64(grades_data: List[Dict]) -> Dict[str, str]:
    """توليد رسمين بيانيين (شريطي لمقارنة الفصول، وخطي لتطور الدرجات) بصيغة Base64."""
    charts: Dict[str, str] = {}
    if not grades_data:
        return charts

    df = pd.DataFrame(grades_data)

    # 1. الرسم الشريطي: متوسط الدرجات حسب الفصل
    fig, ax = plt.subplots(figsize=(6, 3.6))
    class_means = df.groupby("classroom")["percentage"].mean()
    class_means.plot(kind="bar", ax=ax, color="#0F766E")
    ax.set_title("Classroom Average Comparison", fontsize=11)
    ax.set_ylabel("Percentage (%)")
    ax.set_ylim(0, 100)
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    charts["bar_chart"] = base64.b64encode(buf.getvalue()).decode("utf-8")

    # 2. الرسم الخطي: تطور مستوى الأداء عبر الاختبارات
    fig2, ax2 = plt.subplots(figsize=(6, 3.6))
    ax2.plot(range(1, len(df) + 1), df["percentage"].tolist(), marker="o", color="#1D4ED8", linewidth=2)
    ax2.set_title("Student Performance Progression", fontsize=11)
    ax2.set_ylabel("Percentage (%)")
    ax2.set_xlabel("Attempt #")
    ax2.set_ylim(0, 100)
    ax2.grid(True, linestyle="--", alpha=0.4)
    plt.tight_layout()
    buf2 = io.BytesIO()
    fig2.savefig(buf2, format="png", dpi=120)
    plt.close(fig2)
    charts["line_chart"] = base64.b64encode(buf2.getvalue()).decode("utf-8")

    return charts


def train_and_predict_knn(student_features: List[List[float]], n_neighbors: int = 3) -> Dict:
    """بناء نموذج KNeighborsClassifier لتحديد الطلاب الذين يحتاجون إلى دعم إضافي."""
    # بيانات تدريب مرجعية: [متوسط الدرجة، نسبة الحضور، عدد الاختبارات] -> [1=يحتاج دعم، 0=مستقر]
    X = np.array([
        [92, 96, 5], [88, 92, 4], [81, 88, 4], [76, 90, 3],
        [72, 85, 4], [68, 82, 3], [62, 78, 3], [85, 95, 5],
        [54, 65, 2], [48, 60, 2], [42, 55, 1], [35, 50, 2],
        [58, 58, 2], [51, 70, 1], [45, 68, 1], [39, 52, 1],
    ])
    y = np.array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    knn = KNeighborsClassifier(n_neighbors=n_neighbors)
    knn.fit(X_train, y_train)
    acc = round(float(accuracy_score(y_test, knn.predict(X_test))) * 100.0, 1)

    preds = knn.predict(np.array(student_features)).tolist() if student_features else []
    return {"accuracy": acc, "predictions": preds}
