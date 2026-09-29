# [AUNEA-BE-ECON-OVERLAP-075] START — Economic-input overlap guard
# PURPOSE: Refuse unproven additions of whole-process ED01 to its active-time
#          components, and ambiguous duplicate claims using only existing
#          driver, step-scope and event-key contracts. Never subtract or invent
#          an event identity automatically.
# SOURCE: Diagnostic Master v1.2 RULE_ECON_AGGREGATION EAR-001/004/006/012
#         and DEC-065 EconomicInput.step_ids technical anchoring.
# INPUTS: Explicit EconomicInput records.
# OUTPUTS: Spanish review findings; empty list permits current engine arithmetic.
# SIDE_EFFECTS: None.
# CHANGE_RISK: CRITICAL.
from __future__ import annotations

from .models import EconomicInput

ACTIVE_COMPONENTS = frozenset({"ED02", "ED03", "ED04", "ED05", "ED06", "ED07", "ED08"})
DIRECT_LOSS_DRIVERS = frozenset({"ED09", "ED10", "ED11"})


def _scope_overlap(a: EconomicInput, b: EconomicInput) -> bool:
    # Missing anchors mean unspecified/whole process, never proof of disjoint work.
    return not a.step_ids or not b.step_ids or bool(set(a.step_ids) & set(b.step_ids))


def _material(value: float | None) -> bool:
    return value is not None and value > 0


def economic_overlap_issues(inputs: list[EconomicInput]) -> list[str]:
    """Report material ambiguities rather than silently constructing a unique total."""
    issues: list[str] = []
    keyed: dict[str, EconomicInput] = {}
    for item in inputs:
        key = item.deduplication_key
        if not key:
            continue
        prev = keyed.get(key)
        if prev is not None and (
            item.driver_id != prev.driver_id
            or item.step_ids != prev.step_ids
            or item.annual_active_hours != prev.annual_active_hours
            or item.direct_loss_eur_annual != prev.direct_loss_eur_annual
            or item.annual_wait_hours != prev.annual_wait_hours
        ):
            issues.append(
                "EAR-006/012: una misma clave de evento aparece con datos o categorías "
                "distintas; conciliar el propietario antes de agregar."
            )
        keyed.setdefault(key, item)

    for i, one in enumerate(inputs):
        for two in inputs[i + 1:]:
            if one.deduplication_key and one.deduplication_key == two.deduplication_key:
                continue  # Same event is already represented by one unique input.
            if not _scope_overlap(one, two):
                continue
            if _material(one.annual_active_hours) and _material(two.annual_active_hours):
                pair = {one.driver_id, two.driver_id}
                if "ED01" in pair and (pair & ACTIVE_COMPONENTS):
                    issues.append(
                        "EAR-001/004: ED01 y un componente especializado/retrabajo "
                        "solapan el mismo ámbito; falta desglose explícito del tiempo residual."
                    )
                elif one.driver_id == two.driver_id and one.driver_id == "ED01":
                    issues.append(
                        "EAR-001: dos totales ED01 afectan al mismo ámbito sin un desglose "
                        "que demuestre que son actividades independientes."
                    )
            if (one.driver_id in DIRECT_LOSS_DRIVERS
                    and two.driver_id in DIRECT_LOSS_DRIVERS
                    and one.driver_id == two.driver_id
                    and _material(one.direct_loss_eur_annual)
                    and _material(two.direct_loss_eur_annual)
                    and not one.deduplication_key and not two.deduplication_key):
                issues.append(
                    "EAR-006/012: existen dos pérdidas del mismo concepto y ámbito "
                    "sin identidad de evento; confirmar que no se trata del mismo cargo."
                )
    return list(dict.fromkeys(issues))
# [AUNEA-BE-ECON-OVERLAP-075] END
