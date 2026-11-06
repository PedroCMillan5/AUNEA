"""PG11 Block 5: real Ollama inference, SYNTHETIC ONLY (explicit local opt-in).

Run: python tests/pg11_live_ollama_gate.py
Never reads production engagements, browser storage, credentials or Airtable.
All generated responses remain DRAFT and the runner never writes business records.
"""
# [AUNEA-UAT-PG11-LIVE-OLLAMA-296] START
from __future__ import annotations

import json
import os
from pathlib import Path
from time import perf_counter

from aunea_backend import internal_ai_global as global_ai
from aunea_backend.internal_ai_ollama import readiness
from aunea_backend.internal_ai_global_review import assess_recommendation
from aunea_backend.utils import stable_hash
from test_internal_ai_global import sample

REPORT = Path(os.getenv("AUNEA_PG11_UAT_REPORT", "tests/pg11_live_ollama_report.json"))
MAX_BATCHES_PER_CASE = 3


def requirement(ok: bool, label: str) -> None:
    if not ok:
        raise AssertionError(label)


def synthetic_case(kind: str):
    request = sample()
    q = request.engagement.questionnaire_answers
    if kind == "invoice":
        request.engagement.process_name = "Recepción y registro de facturas (sintético)"
        q["_frictions"][0]["cause"] = "Los datos recibidos se vuelven a escribir al registrar la misma factura."
        q["_frictions"][0]["evidence"] = "Declaración sintética confirmada: repetición de captura."
        q["DF008"] = "Reducir la reintroducción manual sin perder aprobaciones."
        q["DF087"] = ["HUMAN_DECISION", "APPROVAL"]
        q["DF089"] = ["KEEP_EXISTING", "CRM_NATIVE"]
        q["DF090"] = ["RBAC", "AUDIT_LOG"]
        q["DF091"] = ["NO_DOWNTIME"]
    elif kind == "client_intake":
        request.engagement.process_name = "Alta de solicitudes de clientes (sintético)"
        q["_process_steps"] = [
            {"id": "S1", "step_name": "Recepción de solicitud",
             "actor": "Coordinación", "tool": "Formulario"},
            {"id": "S2", "step_name": "Revisión y aprobación",
             "actor": "Responsable", "tool": "CRM"},
            {"id": "S3", "step_name": "Preparación de proyecto",
             "actor": "Operaciones", "tool": "Carpeta compartida"},
        ]
        q["_frictions"] = [
            {"id": "F1", "step_ids": ["S1"], "client_label": "Datos incompletos",
             "observable_signal": "Se pide información por correo tras registrar la solicitud"},
            {"id": "F2", "step_ids": ["S3"], "client_label": "Preparación manual repetida",
             "observable_signal": "Se recrea una lista de tareas por cada proyecto"},
        ]
        q["DF087"] = ["HUMAN_DECISION", "APPROVAL"]
        q["_frictions"][0]["cause"] = "El formulario no comprueba datos mínimos al registrar."
        q["_frictions"][0]["evidence"] = "Declaración sintética confirmada sobre seguimiento."
        q["_frictions"][1]["cause"] = "No existe checklist inicial reutilizable."
        q["_frictions"][1]["evidence"] = "Declaración sintética confirmada por operaciones."
        q["DF008"] = "Evitar solicitudes incompletas y tareas de preparación repetidas."
        q["DF089"] = ["KEEP_EXISTING"]
        q["DF090"] = ["RBAC", "AUDIT_LOG"]
        q["DF091"] = ["NO_DOWNTIME"]
    else:
        raise ValueError("Unknown synthetic case")
    request.diagnostic.input_snapshot_hash = stable_hash(request.engagement.model_dump())
    return request


def batch(request, focus, seen=None, blocked=None, blocked_constraints=""):
    return global_ai.GlobalBatchRequest(
        engagement=request.engagement, diagnostic=request.diagnostic,
        confirmed_as_is=True, snapshot_version=request.snapshot_version,
        focus_source_id=focus, seen_interventions=seen or [],
        blocked_action=blocked, blocked_constraints=blocked_constraints,
    )


def query_with_local_retry(payload, issues):
    """Match PG11 frontend: only one retry for cut text or coded objectives."""
    for attempt in range(2):
        try:
            return global_ai.analyze_global(payload)
        except ValueError as exc:
            reason = str(exc)
            if attempt == 0 and (
                "texto incompleto" in reason or "objetivo en código" in reason
            ):
                issues.append(reason)
                print("PG11_LIVE_RETRY_INCOMPLETE", reason, flush=True)
                continue
            raise
    raise AssertionError("Unable to recover validated source text")


def checked_result(result, request, source):
    requirement(result["status"] == "DRAFT", "IA must not approve proposals")
    requirement(result["requires_human_review"] is True,
                "Human review must be mandatory")
    requirement(result["snapshot_version"] == request.snapshot_version,
                "The confirmed AS-IS version changed")
    requirement(result["input_hash"] == stable_hash(request.engagement.model_dump()),
                "The diagnostic/source hash changed")
    requirement(result["focus_source_id"] == source,
                "Recommendation escaped its source")
    requirement(isinstance(result["has_more"], bool),
                "Continuation flag missing")
    for item in result["opportunities"]:
        requirement(source in item["source_refs"], "Untraceable recommendation")
        requirement(item["review"]["status"] in {"CONDITIONED", "INCOMPATIBLE"},
                    "Unsupported feasibility state")
        requirement(item["review"]["capability_status"] == "UNVERIFIED",
                    "Unverified technology was reported as proven")
        requirement(item["how"].strip().endswith((".", "!", "?", "…")),
                    "The intervention was cut")
        requirement(item["why"].strip().endswith((".", "!", "?", "…")),
                    "The justification was cut")
        if item["review"]["status"] == "INCOMPATIBLE":
            requirement(bool(item["review"]["conflicts"]),
                        "An incompatibility lacks source-backed evidence")
    return result["opportunities"]


def analyze_case(name, request):
    plan = global_ai.global_plan(request)
    requirement(plan["snapshot_version"] == request.snapshot_version,
                "Plan version mismatch")
    requirement(plan["focus"], "No sources selected from confirmed AS-IS")
    # Same front-end inventory ordering. Two sources and at most three batches
    # per source keep the live CPU UAT bounded, not the product recommendation count.
    record = {"case": name, "source_count": len(plan["focus"]),
              "tested_sources": [], "batches": 0, "opportunities": [],
              "source_summaries": [], "recoveries": [],
              "residual_has_more": False}
    started = perf_counter()
    for unit in plan["focus"][:2]:
        source = unit["source_id"]
        seen = []
        for index in range(MAX_BATCHES_PER_CASE):
            response = query_with_local_retry(
                batch(request, source, seen), record["recoveries"])
            opportunities = checked_result(response, request, source)
            record["source_summaries"].append({
                "source": source, "batch": index + 1,
                "summary": response["summary"],
                "has_more": response["has_more"],
                "opportunity_count": len(opportunities),
            })
            print("PG11_LIVE_SOURCE", name, source,
                  "batch", index + 1, "opportunities", len(opportunities),
                  "summary:", response["summary"], flush=True)
            novel = 0
            for suggestion in opportunities:
                if suggestion["how"] not in seen:
                    seen.append(suggestion["how"])
                    novel += 1
                record["opportunities"].append({
                    "source": source,
                    "objective": suggestion["objective"],
                    "how": suggestion["how"], "why": suggestion["why"],
                    "review": suggestion["review"],
                    "source_refs": suggestion["source_refs"],
                })
            record["batches"] += 1
            if not response["has_more"]:
                break
            requirement(novel > 0, "Model requested another batch but repeated all actions")
        else:
            record["residual_has_more"] = True
        record["tested_sources"].append(source)
    record["elapsed_seconds"] = round(perf_counter() - started, 1)
    # Empty interventions are legitimate only with no supported improvement.
    # For these cases the validated frictions provide positive signal.
    if not record["opportunities"]:
        record["warning"] = "No se obtuvo ninguna mejora apoyada en fricciones documentadas."
    return record


def alternative_case():
    request = synthetic_case("invoice")
    source = global_ai.global_plan(request)["focus"][0]["source_id"]
    rejected = "Automatizar la aprobación de facturas sin intervención humana."
    review = assess_recommendation(rejected, global_ai.global_context(request)[0])
    requirement(review["status"] == "INCOMPATIBLE",
                "Synthetic mandatory approval was not detected")
    started = perf_counter()
    recoveries = []
    result = query_with_local_retry(
        batch(request, source, blocked=rejected), recoveries)
    candidates = checked_result(result, request, source)
    requirement(result["has_more"] is False, "Alternatives cannot paginate")
    requirement(all(x["review"]["status"] == "CONDITIONED" for x in candidates),
                "Generated alternative still violates a confirmed client limit")
    return {
        "case": "approval_alternative", "source": source,
        "rejected_conflicts": review["conflicts"],
        "alternatives": candidates,
        "outcome": "ALTERNATIVE" if candidates else "NO_SUPPORTED_ALTERNATIVE",
        "elapsed_seconds": round(perf_counter() - started, 1),
        "recoveries": recoveries,
    }


def main():
    report = {"gate": "PG11-BLOCK5", "provider": "ollama",
              "synthetic_only": True, "requires_human_review": True,
              "cases": [], "status": "FAILED"}
    try:
        settings = readiness()
        report["model"] = settings["model"]
        report["num_ctx"] = settings["num_ctx"]
        for name in ("invoice", "client_intake"):
            result = analyze_case(name, synthetic_case(name))
            report["cases"].append(result)
            requirement(bool(result["opportunities"]),
                        "No grounded opportunity across confirmed frictions in " + name +
                        ". Check source_summaries in the JSON report.")
            print("PG11_LIVE_CASE_PASS", name, "batches", result["batches"],
                  "opportunities", len(result["opportunities"]), flush=True)
        alternative = alternative_case()
        report["cases"].append(alternative)
        print("PG11_LIVE_ALTERNATIVE_PASS", alternative["outcome"], flush=True)
        report["status"] = "PASS_WITH_HUMAN_REVIEW_REQUIRED"
        return 0
    except Exception as exc:
        report["failure"] = type(exc).__name__ + ": " + str(exc)
        print("PG11_LIVE_UAT_FAIL", report["failure"], flush=True)
        return 1
    finally:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                          encoding="utf-8")
        print("PG11_LIVE_REPORT", str(REPORT), flush=True)


if __name__ == "__main__":
    raise SystemExit(main())
# [AUNEA-UAT-PG11-LIVE-OLLAMA-296] END
