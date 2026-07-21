"""Nest-like house intelligence: True Radiant, Auto-Schedule, Home/Away."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable

from homeassistant.helpers.storage import Store

from .const import DAYS, DEFAULT_ECO_TEMP, DOMAIN
from .models import ScheduleBlock
from .schedule import _minutes, _parse_hhmm, day_key

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.intelligence"

DEFAULT_WARMUP_C_PER_HOUR = 1.5
MIN_WARMUP_C_PER_HOUR = 0.4
MAX_WARMUP_C_PER_HOUR = 4.0
MAX_PREHEAT_MINUTES = 120
MIN_PREHEAT_MINUTES = 5
DEFAULT_AWAY_DELAY_MINUTES = 20
LEARNING_WINDOW_MINUTES = 30
INITIAL_LEARNING_DAYS = 7

# Nest Leaf (heating hard floor ≈ 62°F)
LEAF_HARD_FLOOR_C = 16.5
LEAF_CHALLENGE_OFFSET_C = 0.5
LEAF_DEFAULT_EARLY_THRESHOLD_C = 19.5
LEAF_BASELINE_SAMPLES_NEEDED = 6
LEAF_DAY_MEANINGFUL_MINUTES = 30


@dataclass
class WarmupModel:
    """House warm-up rate estimate (C per hour while heating)."""

    c_per_hour: float = DEFAULT_WARMUP_C_PER_HOUR
    samples: int = 0
    last_outdoor: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> WarmupModel:
        if not data:
            return cls()
        return cls(
            c_per_hour=float(data.get("c_per_hour", DEFAULT_WARMUP_C_PER_HOUR)),
            samples=int(data.get("samples", 0)),
            last_outdoor=(
                float(data["last_outdoor"])
                if data.get("last_outdoor") is not None
                else None
            ),
        )


@dataclass
class ManualAdjustment:
    """User setpoint change for Auto-Schedule learning."""

    at: str
    day: str
    minute_of_day: int
    temperature: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ManualAdjustment:
        return cls(
            at=str(data.get("at") or ""),
            day=str(data.get("day") or "mon"),
            minute_of_day=int(data.get("minute_of_day", 0)),
            temperature=float(data.get("temperature", DEFAULT_ECO_TEMP)),
        )


@dataclass
class LeafState:
    """Accumulate-only Leaf coaching state (never decrements totals)."""

    comfort_samples: list[float] = field(default_factory=list)
    baseline: float | None = None
    minutes_total: float = 0.0
    minutes_by_day: dict[str, float] = field(default_factory=dict)
    coaching_started_at: str | None = None
    last_sample_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "comfort_samples": self.comfort_samples[-80:],
            "baseline": self.baseline,
            "minutes_total": self.minutes_total,
            "minutes_by_day": dict(list(self.minutes_by_day.items())[-60:]),
            "coaching_started_at": self.coaching_started_at,
            "last_sample_at": self.last_sample_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> LeafState:
        if not data:
            return cls()
        return cls(
            comfort_samples=[float(x) for x in (data.get("comfort_samples") or [])][-80:],
            baseline=(
                float(data["baseline"]) if data.get("baseline") is not None else None
            ),
            minutes_total=float(data.get("minutes_total") or 0.0),
            minutes_by_day={
                str(k): float(v) for k, v in (data.get("minutes_by_day") or {}).items()
            },
            coaching_started_at=data.get("coaching_started_at"),
            last_sample_at=data.get("last_sample_at"),
        )


@dataclass
class IntelligenceState:
    """Persisted intelligence state."""

    warmup: WarmupModel = field(default_factory=WarmupModel)
    recent_cycles: list[dict[str, Any]] = field(default_factory=list)
    adjustments: list[dict[str, Any]] = field(default_factory=list)
    learning_started_at: str | None = None
    away_since: str | None = None
    leaf: LeafState = field(default_factory=LeafState)

    def to_dict(self) -> dict[str, Any]:
        return {
            "warmup": self.warmup.to_dict(),
            "recent_cycles": self.recent_cycles[-40:],
            "adjustments": self.adjustments[-200:],
            "learning_started_at": self.learning_started_at,
            "away_since": self.away_since,
            "leaf": self.leaf.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> IntelligenceState:
        if not data:
            return cls()
        return cls(
            warmup=WarmupModel.from_dict(data.get("warmup")),
            recent_cycles=list(data.get("recent_cycles") or []),
            adjustments=list(data.get("adjustments") or []),
            learning_started_at=data.get("learning_started_at"),
            away_since=data.get("away_since"),
            leaf=LeafState.from_dict(data.get("leaf")),
        )


def next_upcoming_block(
    schedule: dict[str, list[dict[str, Any]]],
    now: datetime | None = None,
    *,
    look_ahead_hours: int = 18,
) -> tuple[ScheduleBlock, datetime] | None:
    """Return next enabled comfort block and its absolute start datetime."""
    now = now or datetime.now()
    best: tuple[ScheduleBlock, datetime] | None = None
    horizon = now + timedelta(hours=look_ahead_hours)

    for day_offset in range(3):
        day_dt = now + timedelta(days=day_offset)
        key = DAYS[day_dt.weekday()]
        for raw in schedule.get(key) or []:
            block = ScheduleBlock.from_dict(raw)
            if not block.enabled:
                continue
            start_t = _parse_hhmm(block.start)
            start_dt = datetime.combine(day_dt.date(), start_t)
            if start_dt <= now or start_dt > horizon:
                continue
            if best is None or start_dt < best[1]:
                best = (block, start_dt)
    return best


def estimate_preheat_minutes(
    *,
    current_temp: float | None,
    target_temp: float,
    warmup: WarmupModel,
    outdoor_temp: float | None = None,
) -> int:
    """Minutes of preheat needed to reach target from current."""
    if current_temp is None:
        return MIN_PREHEAT_MINUTES
    delta = target_temp - current_temp
    if delta <= 0.2:
        return 0

    rate = warmup.c_per_hour
    if outdoor_temp is not None:
        if outdoor_temp < 5:
            rate *= 0.75
        elif outdoor_temp < 10:
            rate *= 0.85
        warmup.last_outdoor = outdoor_temp

    rate = max(MIN_WARMUP_C_PER_HOUR, min(MAX_WARMUP_C_PER_HOUR, rate))
    minutes = int((delta / rate) * 60) + 5
    return max(0, min(MAX_PREHEAT_MINUTES, minutes))


def preheat_status(
    schedule: dict[str, list[dict[str, Any]]],
    *,
    schedule_enabled: bool,
    true_radiant: bool,
    current_temp: float | None,
    warmup: WarmupModel,
    outdoor_temp: float | None,
    away_eco_active: bool,
    now: datetime | None = None,
) -> dict[str, Any] | None:
    """Return preheat status dict when approaching an upcoming block."""
    if not true_radiant or not schedule_enabled or away_eco_active:
        return None
    now = now or datetime.now()
    upcoming = next_upcoming_block(schedule, now)
    if upcoming is None:
        return None
    block, start_dt = upcoming
    needed = estimate_preheat_minutes(
        current_temp=current_temp,
        target_temp=block.temperature,
        warmup=warmup,
        outdoor_temp=outdoor_temp,
    )
    if needed <= 0:
        return None
    preheat_start = start_dt - timedelta(minutes=needed)
    if now < preheat_start:
        return {
            "preheating": False,
            "temperature": block.temperature,
            "block_start": start_dt.strftime("%H:%M"),
            "preheat_start": preheat_start.strftime("%H:%M"),
            "preheat_minutes": needed,
        }
    if now >= start_dt:
        return None
    return {
        "preheating": True,
        "temperature": block.temperature,
        "block_start": start_dt.strftime("%H:%M"),
        "preheat_start": preheat_start.strftime("%H:%M"),
        "preheat_minutes": needed,
    }


def early_off_should_idle(
    *,
    true_radiant: bool,
    current_temp: float | None,
    target_temp: float,
    hot_tolerance: float,
    warmup: WarmupModel,
) -> bool:
    """Stop heating slightly before target to limit radiant overshoot."""
    if current_temp is None:
        return False
    if current_temp > target_temp + hot_tolerance:
        return True
    if not true_radiant:
        return False
    residual = (warmup.c_per_hour / 60.0) * 12.0
    band = max(hot_tolerance, residual * 0.5)
    return current_temp >= target_temp - band


def update_warmup_from_cycle(
    warmup: WarmupModel,
    *,
    start_temp: float,
    end_temp: float,
    duration_minutes: float,
    outdoor_temp: float | None = None,
) -> WarmupModel:
    """Blend a completed heat cycle into the warm-up model."""
    if duration_minutes < 5 or end_temp <= start_temp:
        return warmup
    hours = duration_minutes / 60.0
    observed = (end_temp - start_temp) / hours
    observed = max(MIN_WARMUP_C_PER_HOUR, min(MAX_WARMUP_C_PER_HOUR, observed))
    n = warmup.samples
    if n <= 0:
        new_rate = observed
    else:
        weight = min(0.35, 1.0 / (n + 1) + 0.15)
        new_rate = warmup.c_per_hour * (1 - weight) + observed * weight
    return WarmupModel(
        c_per_hour=round(new_rate, 3),
        samples=n + 1,
        last_outdoor=outdoor_temp if outdoor_temp is not None else warmup.last_outdoor,
    )


def record_manual_adjustment(
    state: IntelligenceState,
    temperature: float,
    now: datetime | None = None,
) -> IntelligenceState:
    now = now or datetime.now()
    if state.learning_started_at is None:
        state.learning_started_at = now.isoformat()
    adj = ManualAdjustment(
        at=now.isoformat(),
        day=day_key(now),
        minute_of_day=_minutes(now.time()),
        temperature=temperature,
    )
    state.adjustments.append(adj.to_dict())
    state.adjustments = state.adjustments[-200:]
    return state


def _learning_mature(state: IntelligenceState, now: datetime) -> bool:
    if not state.learning_started_at:
        return False
    try:
        started = datetime.fromisoformat(state.learning_started_at)
    except ValueError:
        return False
    return (now - started).days >= INITIAL_LEARNING_DAYS


def learn_schedule_from_adjustments(
    schedule: dict[str, list[dict[str, Any]]],
    state: IntelligenceState,
    *,
    auto_schedule: bool,
    now: datetime | None = None,
    default_block_minutes: int = 120,
) -> tuple[dict[str, list[dict[str, Any]]], bool]:
    """Pattern-match recent manual adjustments into schedule setpoints."""
    if not auto_schedule:
        return schedule, False
    now = now or datetime.now()
    adjustments = [ManualAdjustment.from_dict(a) for a in state.adjustments]
    if len(adjustments) < 2:
        return schedule, False

    mature = _learning_mature(state, now)
    required = 3 if mature else 2
    changed = False
    new_schedule = {d: list(schedule.get(d) or []) for d in DAYS}

    buckets: dict[tuple[str, int], list[ManualAdjustment]] = {}
    for adj in adjustments:
        bucket = adj.minute_of_day // LEARNING_WINDOW_MINUTES
        key = (adj.day, bucket)
        buckets.setdefault(key, []).append(adj)

    for (day, bucket), group in buckets.items():
        if len(group) < required:
            continue
        group_sorted = sorted(group, key=lambda a: a.at, reverse=True)
        temps = [g.temperature for g in group_sorted[:5]]
        avg_temp = round(sum(temps) / len(temps) * 2) / 2.0
        center_minute = bucket * LEARNING_WINDOW_MINUTES + LEARNING_WINDOW_MINUTES // 2
        start = f"{center_minute // 60:02d}:{center_minute % 60:02d}"
        end_minute = min(center_minute + default_block_minutes, 24 * 60 - 1)
        end = f"{end_minute // 60:02d}:{end_minute % 60:02d}"

        blocks = new_schedule[day]
        merged = False
        for i, raw in enumerate(blocks):
            block = ScheduleBlock.from_dict(raw)
            bstart = _minutes(_parse_hhmm(block.start))
            if abs(bstart - center_minute) <= LEARNING_WINDOW_MINUTES:
                if abs(block.temperature - avg_temp) < 0.25 and block.start == start:
                    merged = True
                    break
                blocks[i] = ScheduleBlock(
                    start=start,
                    end=block.end if block.end else end,
                    temperature=avg_temp,
                    enabled=True,
                ).to_dict()
                changed = True
                merged = True
                break
        if not merged:
            blocks.append(
                ScheduleBlock(
                    start=start, end=end, temperature=avg_temp, enabled=True
                ).to_dict()
            )
            blocks.sort(key=lambda b: _minutes(_parse_hhmm(b.get("start", "00:00"))))
            new_schedule[day] = blocks
            changed = True

    return new_schedule, changed


def presence_anyone_home(
    get_state: Callable[[str], Any],
    entity_ids: list[str],
) -> bool | None:
    """True if anyone home, False if all away, None if unconfigured."""
    entities = [e for e in entity_ids if e]
    if not entities:
        return None
    known = False
    for entity_id in entities:
        state = get_state(entity_id)
        if state is None:
            continue
        known = True
        if state.state in ("home", "Home"):
            return True
    if not known:
        return None
    return False


def update_away_tracking(
    state: IntelligenceState,
    *,
    anyone_home: bool | None,
    delay_minutes: int,
    now: datetime | None = None,
) -> tuple[IntelligenceState, bool]:
    """Track absence; return away_eco_active after delay."""
    now = now or datetime.now()
    if anyone_home is None or anyone_home:
        state.away_since = None
        return state, False
    if state.away_since is None:
        state.away_since = now.isoformat()
        return state, False
    try:
        since = datetime.fromisoformat(state.away_since)
    except ValueError:
        state.away_since = now.isoformat()
        return state, False
    elapsed = (now - since).total_seconds() / 60.0
    return state, elapsed >= max(0, delay_minutes)


class IntelligenceStore:
    """Load/save intelligence state via HA Store."""

    def __init__(self, hass: Any, entry_id: str) -> None:
        self._store: Store = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY}.{entry_id}")
        self.state = IntelligenceState()

    async def async_load(self) -> IntelligenceState:
        data = await self._store.async_load()
        self.state = IntelligenceState.from_dict(data)
        return self.state

    async def async_save(self) -> None:
        await self._store.async_save(self.state.to_dict())


def note_comfort_setpoint(leaf: LeafState, temperature: float) -> LeafState:
    """Record a Home comfort setpoint toward the Leaf baseline (never shrinks totals)."""
    leaf.comfort_samples.append(float(temperature))
    leaf.comfort_samples = leaf.comfort_samples[-80:]
    samples = sorted(leaf.comfort_samples)
    mid = len(samples) // 2
    if len(samples) % 2:
        leaf.baseline = samples[mid]
    else:
        leaf.baseline = (samples[mid - 1] + samples[mid]) / 2.0
    leaf.baseline = round(float(leaf.baseline), 2)
    return leaf


def leaf_threshold(leaf: LeafState, now: datetime | None = None) -> float:
    """Personalised Leaf threshold (°C). Stable ~0.5 below baseline; hard floor separate."""
    now = now or datetime.now()
    if leaf.baseline is not None and len(leaf.comfort_samples) >= LEAF_BASELINE_SAMPLES_NEEDED:
        return max(LEAF_HARD_FLOOR_C, float(leaf.baseline) - LEAF_CHALLENGE_OFFSET_C)

    # Early days: mild default until we know the household
    if leaf.coaching_started_at:
        try:
            started = datetime.fromisoformat(leaf.coaching_started_at)
            if (now - started).days < 3:
                return LEAF_DEFAULT_EARLY_THRESHOLD_C
        except ValueError:
            pass
    if leaf.baseline is not None:
        return max(LEAF_HARD_FLOOR_C, float(leaf.baseline) - LEAF_CHALLENGE_OFFSET_C)
    return LEAF_DEFAULT_EARLY_THRESHOLD_C


def evaluate_leaf(
    *,
    leaf: LeafState,
    effective_target: float,
    eco_or_away: bool,
    leaf_enabled: bool,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return live Leaf awareness status (icon may hide; earned minutes never decrease)."""
    now = now or datetime.now()
    if leaf.coaching_started_at is None:
        leaf.coaching_started_at = now.isoformat()

    threshold = leaf_threshold(leaf, now)
    active = False
    if leaf_enabled:
        if eco_or_away:
            active = True
        elif effective_target <= LEAF_HARD_FLOOR_C:
            active = True
        elif effective_target <= threshold:
            active = True

    return {
        "active": active,
        "threshold": round(threshold, 2),
        "baseline": leaf.baseline,
        "hard_floor": LEAF_HARD_FLOOR_C,
        "enabled": leaf_enabled,
    }


def accrue_leaf_minutes(
    leaf: LeafState,
    *,
    leaf_active: bool,
    now: datetime | None = None,
    default_delta_minutes: float = 0.5,
) -> LeafState:
    """While Leaf is active, add minutes. Totals only increase."""
    now = now or datetime.now()
    if not leaf_active:
        leaf.last_sample_at = now.isoformat()
        return leaf

    delta = default_delta_minutes
    if leaf.last_sample_at:
        try:
            prev = datetime.fromisoformat(leaf.last_sample_at)
            delta = max(0.0, min(5.0, (now - prev).total_seconds() / 60.0))
        except ValueError:
            delta = default_delta_minutes

    if delta <= 0:
        leaf.last_sample_at = now.isoformat()
        return leaf

    day_key_str = now.date().isoformat()
    leaf.minutes_by_day[day_key_str] = float(leaf.minutes_by_day.get(day_key_str, 0.0)) + delta
    leaf.minutes_total = float(leaf.minutes_total) + delta
    leaf.last_sample_at = now.isoformat()

    # Cap day map size (keep last 60 days) without reducing total
    if len(leaf.minutes_by_day) > 60:
        for old in sorted(leaf.minutes_by_day.keys())[:-60]:
            del leaf.minutes_by_day[old]
    return leaf


def leaf_week_stats(leaf: LeafState, now: datetime | None = None) -> dict[str, Any]:
    """Rolling week display + streak of days that earned meaningful Leaf time."""
    now = now or datetime.now()
    week_minutes = 0.0
    for i in range(7):
        day = (now.date() - timedelta(days=i)).isoformat()
        week_minutes += float(leaf.minutes_by_day.get(day, 0.0))

    streak = 0
    for i in range(60):
        day = (now.date() - timedelta(days=i)).isoformat()
        if float(leaf.minutes_by_day.get(day, 0.0)) >= LEAF_DAY_MEANINGFUL_MINUTES:
            streak += 1
        else:
            if i == 0:
                # Today not yet meaningful — still allow streak from yesterday
                continue
            break

    return {
        "minutes_week": round(week_minutes, 1),
        "hours_week": round(week_minutes / 60.0, 2),
        "minutes_total": round(float(leaf.minutes_total), 1),
        "hours_total": round(float(leaf.minutes_total) / 60.0, 2),
        "days_streak": streak,
    }
