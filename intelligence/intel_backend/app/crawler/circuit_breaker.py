from datetime import datetime, timedelta, timezone


class CircuitBreaker:
    def __init__(self, threshold: int = 5, open_minutes: int = 30) -> None:
        self.threshold = threshold
        self.open_minutes = open_minutes
        self._failures: dict[str, int] = {}
        self._opened_until: dict[str, datetime] = {}

    def is_open(self, source_id: str) -> bool:
        opened_until = self._opened_until.get(source_id)
        if not opened_until:
            return False
        if opened_until < datetime.now(timezone.utc):
            self._opened_until.pop(source_id, None)
            self._failures[source_id] = 0
            return False
        return True

    def record_success(self, source_id: str) -> None:
        self._failures[source_id] = 0
        self._opened_until.pop(source_id, None)

    def record_failure(self, source_id: str) -> None:
        failures = self._failures.get(source_id, 0) + 1
        self._failures[source_id] = failures
        if failures >= self.threshold:
            self._opened_until[source_id] = datetime.now(timezone.utc) + timedelta(
                minutes=self.open_minutes
            )

