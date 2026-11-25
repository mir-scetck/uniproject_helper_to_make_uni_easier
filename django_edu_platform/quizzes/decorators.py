import functools
import logging
import time
from django.http import HttpResponseForbidden

logger = logging.getLogger(__name__)


def teacher_required(view_func):
    """الزخرف الأول: حماية مسارات المعلم والتحقق من الصلاحيات."""

    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = getattr(request, "user", None)
        is_teacher = bool(
            user
            and getattr(user, "is_authenticated", False)
            and (getattr(user, "is_staff", False) or request.session.get("role") == "teacher")
        )
        if not is_teacher and request.session.get("role") != "teacher":
            logger.warning("محاولة وصول غير مصرح بها لمسار المعلم.")
            return HttpResponseForbidden("عذراً، هذه الصفحة مخصصة للمعلمين المصرح لهم فقط.")
        return view_func(request, *args, **kwargs)

    return wrapper


def measure_execution_time(func):
    """الزخرف الثاني: قياس زمن تنفيذ دالة التصحيح التلقائي وتسجيل الأداء."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("زمن تنفيذ %s: %.3f مللي ثانية", func.__name__, elapsed_ms)
        return result

    return wrapper
