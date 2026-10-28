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
    # Technical projection scope; retain the complete AS-IS to validate DF059 anchors.
    scope_step_ids: list[str] | None = None


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
    step_breakdown: list[dict[str, Any]] = []  # backend-owned breakdown for PG10 presentation
    friction_breakdown: list[dict[str, Any]] = []

    scope = set(request.scope_step_ids) if request.scope_step_ids is not None else None
    steps = [s for s in request.steps if scope is None or s.get("id") in scope]
    frictions = [f for f in request.frictions if scope is None
                 or (f.get("time_attribution") or {}).get("step_id") in scope
                 or (not (f.get("time_attribution") or {}).get("step_id")
                     and bool(scope.intersection(f.get("affected_steps") or [])))]
    if scope is not None and scope - {s.get("id") for s in request.steps if s.get("status") != "SUPERSEDED"}:
        gaps.append("Ámbito de proyección: hay pasos inexistentes o retirados.")

    for step in steps:
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
        rework_rate = None
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
            rework_rate = rate
            if rate is None:
                missing_rework = True
            else:
                rework_per_case += rework * multiplier * rate

        # Independent per-step contributions use the exact same factors as aggregate values.
        def step_annual(raw: float | None, factor: float | None) -> float | None:
            return round(annual_cases * raw * factor / 60, 2) if raw is not None and factor is not None and annual_cases is not None else None
        rework_factor = multiplier * rework_rate if rework and multiplier is not None and rework_rate is not None else (multiplier if rework == 0 else None)
        step_breakdown.append({
            "step_id": step.get("id"), "step_name": label,
            "applies_to": step.get("applies_to", {"mode": "ALL"}),
            "occurrences_per_case": repetitions,
            "active_minutes_per_execution": active,
            "wait_minutes_per_execution": waiting,
            "rework_minutes_per_event": rework,
            "error_rate": step.get("error_rate"),
            "annual_active_hours": step_annual(active, multiplier),
            "annual_wait_exposure_hours": step_annual(waiting, multiplier),
            "annual_rework_hours": step_annual(rework, rework_factor),
        })

    if not included_steps:
        gaps.append("PG04: no hay pasos activos")

    # Only ADDITIONAL is additive. INCLUDED and BREAKDOWN explain existing DF039
    # without increasing the baseline. A friction observed across multiple steps
    # has a single economic owner and is counted at most once.
    friction_review = review_frictions(request.steps, frictions)
    classified = {x["friction_id"]: x for x in friction_review["classified"]}
    unresolved = {x["friction_id"]: x for x in friction_review["findings"] if x.get("blocking_issues")}
    unallocated_frictions: list[str] = []
    extra_per_year_minutes = 0.0
    extra_incomplete = False

    for friction in frictions:
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
            friction_breakdown.append({
                "friction_id": fid,
                "owner_step_id": classified[fid]["owner_step_id"],
                "mode": "ADDITIONAL",
                "minutes_per_event": minutes,
                "frequency": frequency,
                "annual_additional_hours": round(minutes * events_per_year / 60, 2),
            })

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
        "step_breakdown": step_breakdown,
        "additional_friction_breakdown": friction_breakdown,
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

# [AUNEA-BE-TIME-NUMERIC-CHECK-171] START — Numerical coherence separate from chronological reconciliation.
# SOURCE: DEC-074 (never auto-conciliate elapsed) and existing ±25% map review trigger.
# INPUTS: sealed DF026 converted to minutes, complete canonical source projection.
# OUTPUTS: comparison and informative deviation; no extra capture, approval or savings.
# SIDE_EFFECTS: None. CHANGE_RISK: HIGH. An acceptable difference is not elapsed proof.
TIME_REVIEW_THRESHOLD_PERCENT = 25.0


def numeric_time_consistency(projection: dict[str, Any], declared_minutes: float | None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "status": "UNAVAILABLE",
        "declared_minutes": declared_minutes,
        "component_minutes": None,
        "difference_minutes": None,
        "difference_percent": None,
        "review_threshold_percent": TIME_REVIEW_THRESHOLD_PERCENT,
        "elapsed_reconciled": False,
    }
    if declared_minutes is None or not isfinite(declared_minutes) or declared_minutes <= 0:
        return result
    needed = ("active_minutes_per_case", "wait_exposure_minutes_per_case", "rework_minutes_per_case")
    if projection.get("status") != "CALCULATED" or any(projection.get(k) is None for k in needed):
        return result
    annual_cases = projection.get("annual_cases")
    extra = projection.get("annual_friction_additional_hours")
    if annual_cases is None or annual_cases <= 0 or extra is None:
        return result
    component = sum(float(projection[k]) for k in needed) + extra * 60 / annual_cases
    if not isfinite(component):
        return result
    deviation = component - declared_minutes
    percent = deviation / declared_minutes * 100
    result.update({
        "status": "WITHIN_REVIEW_THRESHOLD" if abs(percent) <= TIME_REVIEW_THRESHOLD_PERCENT else "REVIEW_DIFFERENCE",
        "component_minutes": round(component, 4),
        "difference_minutes": round(deviation, 4),
        "difference_percent": round(percent, 4),
    })
    return result
# [AUNEA-BE-TIME-NUMERIC-CHECK-171] END


# DEC-074: Read-only temporal reconciliation; never call exposure elapsed time.
class TimeReconciliationRequest(TimeProjectionRequest):
    declared_cycle_minutes: float | None = Field(default=None, gt=0)


def reconcile_session_time(request: TimeReconciliationRequest) -> dict[str, Any]:
    projection = project_session_time(request)
    groups = {"active": 0.0, "wait": 0.0, "rework": 0.0}
    known = {"active": False, "wait": False, "rework": False}
    pending: list[str] = []
    steps = [s for s in request.steps if s.get("status") != "SUPERSEDED"]
    for step in steps:
        label = str(step.get("step_name") or step.get("id") or "Paso")
        issues: list[str] = []
        share = _step_share(step, issues)
        repetitions = _number(step.get("occurrences_per_case", 1))
        multiplier = share * repetitions if share is not None and repetitions is not None else None
        if multiplier is None:
            pending.append(label + ": no se conoce la proporción de la ruta o sus repeticiones")
            continue
        for field, key in (("active_time", "active"), ("wait_time", "wait")):
            value = _number(step.get(field))
            if value is None:
                pending.append(label + ": " + ("trabajo activo" if key == "active" else "espera") + " sin cuantificar")
            else:
                known[key] = True
                groups[key] += value * multiplier
        redo = _number(step.get("rework_time"))
        if redo is None:
            pending.append(label + ": retrabajo sin cuantificar")
        elif redo == 0:
            known["rework"] = True
        else:
            frequency_issues: list[str] = []
            rate = _error_share(step, frequency_issues)
            if rate is None:
                pending.append(label + ": frecuencia de retrabajo no acreditada")
            else:
                known["rework"] = True
                groups["rework"] += redo * multiplier * rate
    additional = None
    annual_cases = projection.get("annual_cases")
    annual_extra = projection.get("annual_friction_additional_hours")
    if annual_cases and annual_extra is not None:
        additional = annual_extra * 60 / annual_cases
    elif annual_extra == 0 and not projection.get("frictions_pending_overlap_review"):
        additional = 0.0
    if projection.get("frictions_pending_overlap_review"):
        pending.append("Fricciones con tiempo no atribuido sin duplicidad o frecuencia acreditada")
    baseline = request.declared_cycle_minutes
    if baseline is None:
        pending.append("DF026: tiempo actual declarado sin unidad convertible a minutos")
    if not steps:
        pending.append("Mapa sin pasos activos")
    parts = [
        ("active", "Trabajo activo", groups["active"] if known["active"] else None),
        ("wait", "Exposición a espera", groups["wait"] if known["wait"] else None),
        ("rework", "Retrabajo ponderado", groups["rework"] if known["rework"] else None),
        ("additional", "Trabajo adicional validado", additional),
    ]
    total_identified = sum(value for _, _, value in parts if value is not None)
    excess = bool(baseline is not None and total_identified > baseline)
    # Bar values are visual ratios against the declared reference, NOT elapsed reconciliation.
    scale = max(baseline or 0, total_identified, 1)
    segments = [
        {"key": key, "label": label, "minutes": round(value, 4) if value is not None else None,
         "width_percent": round(value / scale * 100, 4) if value is not None else 0}
        for key, label, value in parts
    ]
    identified_percent = min(100.0, total_identified / scale * 100)
    if any(s.get("minutes") is None for s in segments):
        pending.append("Existen categorías temporales incompletas: un valor desconocido no significa cero")
    if (groups["wait"] if known["wait"] else 0) > 0:
        pending.append("Solapamiento de esperas no acreditado: exposición no equivale a elapsed")
    pending.append("Sin acreditación de equivalencia entre tiempo habitual declarado y media ponderada del mapa")
    numeric = numeric_time_consistency(projection, baseline)
    return {
        "numeric_comparison": numeric,
        "status": "NO_BASELINE" if baseline is None else "PROVISIONAL",
        "declared_minutes": baseline,
        "segments": segments,
        "identified_minutes": round(total_identified, 4),
        "identified_percent": round(identified_percent, 4),
        "unreconciled_percent": round(max(0.0, 100.0 - identified_percent), 4),
        "exceeds_declared_reference": excess,
        "unresolved": list(dict.fromkeys(pending)),
        "elapsed_reconciled": False,
        "projection_status": projection["status"],
        "projection_gaps": projection["gaps"],
        "note": "Componentes ponderados identificados; pueden solaparse. No es una duración elapsed conciliada ni un ahorro."
    }



# [AUNEA-BE-PG10-CAPACITY-VALUATION-172] START — Read-only current labour capacity estimate.
# SOURCE: DEC-021/032/033/034/050/068, existing Economics rate × annual hours, SessionTime owner.
# INPUTS: Confirmed steps + economic rates by exact role, existing temporal backend breakdown.
# OUTPUTS: Informative labour capacity value, never cash cost, realized savings or official EconomicsResult.
# SIDE EFFECTS: None. RISK: HIGH — strict role/unique-rate matches, no assumptions or waiting.
def estimate_process_labor_capacity(
    projection: dict[str, Any], steps: list[dict[str, Any]], economics: list[dict[str, Any]]
) -> dict[str, Any]:
    def role_key(value: Any) -> str:
        return " ".join(str(value or "").strip().casefold().split())
    rates: dict[str, dict[str, Any]] = {}
    for item in economics:
        if item.get("status") == "SUPERSEDED": continue
        role=role_key(item.get("role_or_resource"))
        rate=_number(item.get("capacity_cost_rate_eur_hour"))
        if not role or rate is None: continue
        entry=rates.setdefault(role,{"values":set(),"evidence":set()})
        entry["values"].add(rate)
        entry["evidence"].add(str(item.get("evidence_type") or "NOT_RECORDED"))
    owners={str(s.get("id")):s for s in steps if s.get("status")!="SUPERSEDED"}
    additional: dict[str,float]={}
    for f in projection.get("additional_friction_breakdown") or []:
        key=str(f.get("owner_step_id") or "")
        hours=_number(f.get("annual_additional_hours"))
        if key and hours is not None: additional[key]=additional.get(key,0.0)+hours
    breakdown=[]
    unknown=[]
    total_hours=0.0
    total_value=0.0
    rework_value=0.0
    rework_complete=True
    for item in projection.get("step_breakdown") or []:
        sid=str(item.get("step_id"))
        step=owners.get(sid,{})
        role=str(step.get("actor") or "").strip()
        key=role_key(role)
        main=_number(item.get("annual_active_hours"))
        hours=(main+additional.get(sid,0.0)) if main is not None else None
        options=rates.get(key)
        rate=next(iter(options["values"])) if options and len(options["values"])==1 else None
        if hours is None or rate is None:
            unknown.append(str(step.get("step_name") or sid)+" (falta tarifa única por rol o tiempo anual)")
            breakdown.append({"step_id":sid,"step_name":step.get("step_name"),"role":role or None,
                              "annual_hours":hours,"hourly_rate":rate,"capacity_value":None})
            rework_complete=False
            continue
        value=round(hours*rate,2)
        total_hours+=hours
        total_value+=value
        breakdown.append({"step_id":sid,"step_name":step.get("step_name"),"role":role,
                          "annual_hours":round(hours,2),"hourly_rate":rate,
                          "capacity_value":value,"evidence":sorted(options["evidence"])})
        redo=_number(item.get("annual_rework_hours"))
        if redo is None:rework_complete=False
        else:rework_value+=redo*rate
    if projection.get("status")!="CALCULATED" or not breakdown:
        unknown.append("La proyección temporal no está completa")
    # Group the exact same owned step values by role. Never revalue a step, infer
    # a rate, add waiting or turn missing steps into a complete role amount.
    grouped: dict[str, dict[str, Any]] = {}
    for entry in breakdown:
        role = entry.get("role")
        key = role_key(role) if role else "__MISSING_ROLE__"
        summary = grouped.setdefault(key, {
            "role": role, "annual_hours": 0.0, "hourly_rate": None,
            "annual_capacity_value_eur": 0.0, "step_count": 0,
            "valued_step_count": 0, "step_ids": [], "evidence": set(),
            "_incomplete": False,
        })
        summary["step_count"] += 1
        summary["step_ids"].append(entry["step_id"])
        if entry["capacity_value"] is None or entry["annual_hours"] is None:
            summary["_incomplete"] = True
            continue
        summary["valued_step_count"] += 1
        summary["annual_hours"] += entry["annual_hours"]
        summary["annual_capacity_value_eur"] += entry["capacity_value"]
        summary["hourly_rate"] = entry["hourly_rate"]
        summary["evidence"].update(entry.get("evidence") or [])
    role_breakdown = []
    annual_volume = projection.get("annual_cases")
    for summary in grouped.values():
        complete = not summary.pop("_incomplete") and summary["valued_step_count"] == summary["step_count"]
        value = round(summary["annual_capacity_value_eur"], 2) if complete else None
        summary["annual_hours"] = round(summary["annual_hours"], 2) if complete else None
        summary["annual_capacity_value_eur"] = value
        summary["capacity_value_eur_per_case"] = round(value / annual_volume, 2) if value is not None and annual_volume and annual_volume > 0 else None
        summary["evidence"] = sorted(summary["evidence"])
        role_breakdown.append(summary)
    return {
        "status":"COMPLETE" if not unknown else "PARTIAL",
        "role_breakdown": role_breakdown,
        "annual_labor_capacity_value_eur":round(total_value,2) if not unknown else None,
        "capacity_value_eur_per_case":round(total_value / projection["annual_cases"],2) if not unknown and projection.get("annual_cases") and projection["annual_cases"]>0 else None,
        "covered_value_eur":round(total_value,2),
        "covered_hours":round(total_hours,2),
        "step_count":len(breakdown),
        "steps_valued":sum(b["capacity_value"] is not None for b in breakdown),
        "steps":breakdown,
        "unvalued_steps":unknown,
        "rework_separate_value_eur":round(rework_value,2) if rework_complete and not unknown else None,
        "note":"Valor orientativo de capacidad ocupada. No es gasto de caja, ahorro ni coste contable total. El retrabajo se mantiene separado hasta verificar solapamientos.",
    }
# [AUNEA-BE-PG10-CAPACITY-VALUATION-172] END


# [AUNEA-BE-SESSION-TIME-070] END
