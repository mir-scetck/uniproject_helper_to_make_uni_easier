import asyncio
import logging
import threading
from typing import Dict, List
from .patterns import NotificationSubject, ParentObserver, StudentObserver

logger = logging.getLogger(__name__)


async def _dispatch_async_notification(event_type: str, payload: Dict[str, str]) -> List[str]:
    """تنفيذ إرسال الإشعارات بشكل غير متزامن عبر asyncio."""
    await asyncio.sleep(0.05)
    subject = NotificationSubject()
    subject.attach(StudentObserver())
    subject.attach(ParentObserver())
    messages = subject.notify(event_type, payload)
    for msg in messages:
        logger.info("إشعار غير متزامن: %s", msg)
    return messages


def trigger_background_notification(event_type: str, payload: Dict[str, str]) -> threading.Thread:
    """تشغيل المهمة الثقيلة في خيط خلفي باستخدام threading و asyncio دون تعطيل المتصفح."""

    def runner() -> None:
        try:
            asyncio.run(_dispatch_async_notification(event_type, payload))
        except Exception:
            logger.exception("حدث خطأ أثناء إرسال الإشعارات في الخلفية.")

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    return thread
