# [AUNEA-BE-SESSION-TIME-070] START — Canonical session time normalization
# PURPOSE: Normalize DF021/DF022 and per-step DF037-DF040 without browser-owned formulas,
#          unsupported operating-calendar defaults or double-counted friction effort.
# SOURCE: Diagnostic Master v1.2 RULE_ECON_ANNUALIZE; NR04/NR05; DEC-032/033/050/068.
# INPUTS: Captured process volume, calendar evidence, active ProcessSteps and Frictions.
# OUTPUTS: Explanatory baseline time projection with explicit incompleteness, not an
#          official economic benefit or cash-saving forecast.
# SIDE_EFFECTS: None. This is a pure backend calculation.
# CHANGE_RISK: HIGH.
from __future__ import annotations

from calendar import isleap
from math import isfinite
from typing import Any

from pydantic import BaseModel, Field
from .friction_review import review_frictions


class TimeProjectionRequest(BaseModel):
    volume: float | None = Field(default=None, ge=0)
    period: str | None = None
    operating_weeks_per_year: float | None = Field(default=None, ge=0, le=53)
    operating_days_per_year: float | None = Field(default=None, ge=0, le=366)
    calendar_year: int | None = Field(default=None, ge=1900, le=2200)
    calendar_day_process: bool = False
    steps: list[dict[str, Any]] = Field(default_factory=list)
    frictions: list[dict[str, Any]] = Field(default_factory=list)


def _number(value: Any) -> float | None:
    if isinstance(value, dict):
        if value.get("mode") in ("UNKNOWN", "NONE"):
            return None
        value = value.get("value")
    if value is None or value == "" or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    return number if isfinite(number) and number >= 0 else None


def _volume_per_year(request: TimeProjectionRequest, gaps: list[str]) -> float | None:
    volume = request.volume
    period = str(request.period or "").upper()
    if volume is None:
        gaps.append("DF021: volumen habitual pendiente")
        return None
    if period == "YEAR":
        return volume
    if period == "MONTH":
        return volume * 12
    if period == "QUARTER":
        return volume * 4
    if period == "WEEK":
        if request.operating_weeks_per_year is None:
            gaps.append("RULE_ECON_ANNUALIZE: indicar semanas operativas al año")
            return None
        return volume * request.operating_weeks_per_year
    if period in ("DAY", "BUSINESS_DAY"):
        if request.calendar_day_process:
            if request.calendar_year is None:
                gaps.append("RULE_ECON_ANNUALIZE: indicar año para operación por días naturales")
                return None
            return volume * (366 if isleap(request.calendar_year) else 365)
        if request.operating_days_per_year is None:
            gaps.append("RULE_ECON_ANNUALIZE: indicar días operativos al año")
            return None
        return volume * request.operating_days_per_year
    gaps.append("DF022: periodo del volumen pendiente o no reconocido")
    return None


def _step_share(step: dict[str, Any], gaps: list[str]) -> float | None:
    value = step.get("applies_to", {"mode": "ALL"})
    if isinstance(value, str):
        value = {"mode": value}
    if not isinstance(value, dict):
        value = {"mode": "ALL"}
    mode = str(value.get("mode") or "ALL").upper()
    if mode == "ALL":
        return 1.0
    if mode == "PERCENT":
        percent = _number(value.get("value"))
        if percent is not None and percent <= 100:
            return percent / 100
    gaps.append("Paso %s: proporción de casos no acreditada" % (step.get("step_name") or step.get("id") or "?"))
    return None


def _error_share(step: dict[str, Any], gaps: list[str]) -> float | None:
    error = step.get("error_rate")
    label = step.get("step_name") or step.get("id") or "?"
    if not isinstance(error, dict):
        error = {"mode": "percent", "value": error}
    mode = str(error.get("mode") or "percent").lower()
    value = _number(error.get("value"))
    if mode == "percent" and value is not None and value <= 100:
        return value / 100
    # Counts need a compatible period and population; never convert them to a rate by guessing.
    gaps.append("Paso %s: frecuencia de retrabajo no convertible sin base comparable" % label)
    return None


def project_session_time(request: TimeProjectionRequest) -> dict[str, Any]:
    gaps: list[str] = []
    annual_cases = _volume_per_year(request, gaps)
    active_per_case = wait_exposure_per_case = rework_per_case = 0.0
    missing_active = missing_wait = missing_rework = False
    included_steps = 0

    for step in request.steps:
        if step.get("status") == "SUPERSEDED":
            continue
        included_steps += 1
        label = step.get("step_name") or step.get("id") or "?"
        share = _step_share(step, gaps)
        repetitions = _number(step.get("occurrences_per_case", 1))
        if repetitions is None:
            gaps.append("Paso %s: número de ejecuciones no acreditado" % label)
        multiplier = share * repetitions if share is not None and repetitions is not None else None

        active = _number(step.get("active_time"))
        waiting = _number(step.get("wait_time"))
        rework = _number(step.get("rework_time"))
        if active is None or multiplier is None:
            missing_active = True
            if active is None:
                gaps.append("Paso %s: falta tiempo activo" % label)
        else:
            active_per_case += active * multiplier

        if waiting is None or multiplier is None:
            missing_wait = True
            if waiting is None:
                gaps.append("Paso %s: falta tiempo de espera" % label)
        else:
            wait_exposure_per_case += waiting * multiplier

        if rework is None or multiplier is None:
            missing_rework = True
            if rework is None:
                gaps.append("Paso %s: falta tiempo de retrabajo" % label)
        elif rework > 0:
            rate = _error_share(step, gaps)
            if rate is None:
                missing_rework = True
            else:
                rework_per_case += rework * multiplier * rate

    if not included_steps:
        gaps.append("PG04: no hay pasos activos")

    # Only ADDITIONAL is additive. INCLUDED and BREAKDOWN explain existing DF039
    # without increasing the baseline. A friction observed across multiple steps
    # has a single economic owner and is counted at most once.
    friction_review = review_frictions(request.steps, request.frictions)
    classified = {x["friction_id"]: x for x in friction_review["classified"]}
    unresolved = {x["friction_id"]: x for x in friction_review["findings"] if x.get("blocking_issues")}
    unallocated_frictions: list[str] = []
    extra_per_year_minutes = 0.0
    extra_incomplete = False

    for friction in request.frictions:
        if friction.get("status") == "SUPERSEDED":
            continue
        fid = str(friction.get("id") or "?")
        minutes = _number(friction.get("active_time_loss"))
        if not minutes:
            continue
        if fid in unresolved or fid not in classified:
            unallocated_frictions.append(fid)
            extra_incomplete = True
            continue
        # Trust the validated/normalized relationship, not unvalidated raw client casing.
        if classified[fid]["mode"] != "ADDITIONAL":
            continue
        frequency = friction.get("frequency") or {}
        freq = _number(frequency.get("value"))
        period = frequency.get("period")
        mode = frequency.get("mode")
        events_per_year = None
        if mode == "percent" and freq is not None and annual_cases is not None:
            events_per_year = annual_cases * freq / 100
        elif mode == "count" and freq is not None:
            if period == "year":
                events_per_year = freq
            elif period == "month":
                events_per_year = freq * 12
            elif period == "case" and annual_cases is not None:
                events_per_year = freq * annual_cases
            elif period == "day" and request.operating_days_per_year is not None:
                events_per_year = freq * request.operating_days_per_year
            elif period == "day" and request.calendar_day_process and request.calendar_year is not None:
                events_per_year = freq * (366 if isleap(request.calendar_year) else 365)
        if events_per_year is None:
            extra_incomplete = True
            unallocated_frictions.append(fid)
            gaps.append("DF060: frecuencia/calendario insuficiente para fricción adicional " + fid)
        else:
            extra_per_year_minutes += minutes * events_per_year

    if unallocated_frictions:
        gaps.append("DF062: falta atribución válida o frecuencia (posible solapamiento con DF039) para: " +
                    ", ".join(dict.fromkeys(unallocated_frictions)))
    for finding in friction_review["findings"]:
        # Pending monetary reconciliation is reported, never used to invalidate time.
        for issue in finding.get("blocking_issues", finding["issues"]):
            if issue not in gaps:
                gaps.append(issue)

    def annual_hours(per_case: float, missing: bool) -> float | None:
        if missing or annual_cases is None or not included_steps:
            return None
        return round(annual_cases * per_case / 60, 2)

    return {
        "annual_cases": round(annual_cases, 2) if annual_cases is not None else None,
        "active_minutes_per_case": round(active_per_case, 4) if not missing_active and included_steps else None,
        "wait_exposure_minutes_per_case": round(wait_exposure_per_case, 4) if not missing_wait and included_steps else None,
        "rework_minutes_per_case": round(rework_per_case, 4) if not missing_rework and included_steps else None,
        "annual_active_hours": annual_hours(active_per_case, missing_active),
        "annual_wait_exposure_hours": annual_hours(wait_exposure_per_case, missing_wait),
        "annual_rework_hours": annual_hours(rework_per_case, missing_rework),
        "frictions_pending_overlap_review": list(dict.fromkeys(unallocated_frictions)),
        "annual_friction_additional_hours": None if extra_incomplete else round(extra_per_year_minutes / 60, 2),
        "annual_total_active_hours": (
            round(annual_cases * active_per_case / 60 + extra_per_year_minutes / 60, 2)
            if not missing_active and annual_cases is not None and included_steps and not extra_incomplete
            else None
        ),
        "friction_review": friction_review,
        "monetary_reconciliation": friction_review.get("monetary_reconciliation", []),
        "gaps": list(dict.fromkeys(gaps)),
        "status": "INCOMPLETE" if gaps else "CALCULATED",
        "note": "Espera = suma de exposiciones por actividad, no ciclo end-to-end. Trabajo activo y retrabajo no equivalen a ahorro."
    }
# [AUNEA-BE-SESSION-TIME-070] END
