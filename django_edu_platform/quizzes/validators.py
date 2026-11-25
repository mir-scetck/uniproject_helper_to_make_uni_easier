import logging
import re

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_address(email: str) -> str:
    cleaned = (email or "").strip()
    if not EMAIL_PATTERN.match(cleaned):
        logger.warning("بريد إلكتروني غير صالح: %s", email)
        raise ValueError("صيغة البريد الإلكتروني غير صحيحة.")
    return cleaned


def validate_text(text: str, field_label: str, min_len: int = 3, max_len: int = 400) -> str:
    cleaned = (text or "").strip()
    if len(cleaned) < min_len or len(cleaned) > max_len:
        logger.warning("طول النص غير صالح في الحقل %s", field_label)
        raise ValueError(
            f"يجب أن يتراوح طول '{field_label}' بين {min_len} و {max_len} حرفاً."
        )
    return cleaned


def validate_numeric_score(raw_value: str | int | float, field_label: str = "الدرجة") -> float:
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as exc:
        logger.warning("قيمة رقمية غير صالحة في %s: %s", field_label, raw_value)
        raise ValueError(f"يجب إدخال قيمة رقمية صحيحة في حقل '{field_label}'.") from exc
    if value <= 0 or value > 100:
        raise ValueError(f"قيمة '{field_label}' يجب أن تكون بين 1 و 100.")
    return value


def safe_lookup(data_dict: dict, key: str):
    """التقاط KeyError مع رسالة عربية واضحة وتسجيل الخطأ."""
    try:
        return data_dict[key]
    except KeyError as exc:
        logger.error("المفتاح '%s' غير موجود في القاموس.", key)
        raise KeyError(f"تعذر العثور على العنصر المطلوب: {key}") from exc
    finally:
        logger.debug("انتهاء فحص القاموس للمفتاح: %s", key)
