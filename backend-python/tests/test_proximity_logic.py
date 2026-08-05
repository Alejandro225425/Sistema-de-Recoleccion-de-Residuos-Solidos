from datetime import datetime, timedelta, timezone

from app.main import haversine_distance, memory, _should_create_proximity_notification, PROXIMITY_DEDUP_MINUTES


def test_haversine_distance_zero():
    # same point -> zero distance
    d = haversine_distance(-13.5166, -71.9789, -13.5166, -71.9789)
    assert round(d, 1) == 0.0


def test_should_create_proximity_notification_respects_dedupe_window():
    # prepare a previous proximity notification 5 minutes ago
    now = datetime.now(timezone.utc)
    five_minutes_ago = (now - timedelta(minutes=5)).isoformat()
    memory.notifications.insert(0, {"title": "Aviso de proximidad", "message": "El camión C-01 está cerca de Centro Historico.", "created_at": five_minutes_ago})
    # since dedupe window default is PROXIMITY_DEDUP_MINUTES (10), a 5-minute-old notification should prevent creation
    assert not _should_create_proximity_notification("C-01", "Centro Historico", now)

    # older notification (beyond dedupe window) should allow creation
    old = (now - timedelta(minutes=PROXIMITY_DEDUP_MINUTES + 1)).isoformat()
    memory.notifications[0]["created_at"] = old
    assert _should_create_proximity_notification("C-01", "Centro Historico", now)
