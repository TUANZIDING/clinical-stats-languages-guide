"""Compare a bounded replay with independently transcribed published targets.

Offline: --input defaults to the aggregate snapshot stored in the repository.
After an actual replay, pass --input build/papersv2.1/nhanes-replayv2.1.json.
--write updates the comparison record and matching browser asset explicitly.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT/"data"/"paper-replayv2.1.json"


def compare(actual, target, field, tolerance):
    ok = isinstance(actual, (int, float)) and math.isfinite(actual) and abs(actual-target) <= tolerance
    return dict(field=field, actual=actual, published=target, tolerance=tolerance, passed=ok)


def validate(observed, targets):
    if observed.get("pmid") != targets["pmid"]:
        raise ValueError("The replay and target paper identifiers differ")
    checks = [compare(observed["flow"].get(k), v, f"flow.{k}", 0) for k, v in targets["flow"].items()]
    for ref in targets["descriptives"]:
        matches = [x for x in observed["descriptives"] if x["education"] == ref["education"]]
        if len(matches) != 1:
            raise ValueError("Education categories must be unique and complete")
        for key, tol in [("n",0),("mean_spherical_equivalent",targets["rounding_tolerance"]),("myopia_percent",targets["percent_tolerance"])]:
            checks.append(compare(matches[0].get(key),ref[key],f"education.{ref['education']}.{key}",tol))
    defaults = []
    for model, rows in targets["models"].items():
        observed_rows = [x for x in observed["estimates"] if x["model"] == model]
        if len(observed_rows) != 4 or len({x["term"] for x in observed_rows}) != 4:
            raise ValueError("Expected exactly four distinct education coefficients")
        if len({x["n"] for x in observed_rows}) != 1:
            raise ValueError("Model sample sizes are inconsistent")
        checks.append(compare(observed_rows[0]["n"],targets["flow"]["analysis"],f"{model}.n",0))
        for term, row in zip([f"DMDEDUC2{x}" for x in range(2,6)], rows):
            obs = next(x for x in observed_rows if x["term"] == term)
            for key, expected in zip(["estimate","normal_lower","normal_upper"],row):
                checks.append(compare(obs.get(key),expected,f"{model}.{term}.{key}",targets["rounding_tolerance"]))
            for key, expected in zip(["lower","upper"],row[1:]):
                defaults.append(compare(obs.get(key),expected,f"{model}.{term}.{key}",targets["rounding_tolerance"]))
    return dict(pmid=targets["pmid"], status="SELECTED_TARGETS_MATCH" if all(x["passed"] for x in checks) else "MISMATCH",
                ci_convention="Normal Wald, matching survey 3.34 confint.svyglm default ddf=Inf; current t intervals retained separately",
                checks=checks, passed=sum(x["passed"] for x in checks), total=len(checks),
                current_default_intervals=dict(passed=sum(x["passed"] for x in defaults), total=len(defaults), checks=defaults),
                scope=targets["scope"], versions=observed["versions"],
                limitations=["One selected paper, two model families; not whole-paper replication or external clinical validation.",
                             "No LLM responses were scored; no AI accuracy estimate or human statistical sign-off.",
                             "Published methods are reference cases, not an error-free gold standard."])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=SNAPSHOT)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    target_path = ROOT/"data"/"paper-targetsv2.1.json"
    result = validate(json.loads(args.input.read_text()), json.loads(target_path.read_text()))
    result["target_sha256"] = hashlib.sha256(target_path.read_bytes()).hexdigest()
    result["aggregate_replay_sha256"] = hashlib.sha256(args.input.read_bytes()).hexdigest()
    record_path = ROOT/"data"/"paper-checkv2.1.json"
    asset_path = ROOT/"docs"/"assets"/"paper-checkv2.1.js"
    asset = "window.PaperCheck = "+json.dumps(result,ensure_ascii=False)+";\n"
    if args.write:
        record_path.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n")
        asset_path.write_text(asset)
    elif args.input.resolve() == SNAPSHOT.resolve():
        if json.loads(record_path.read_text()) != result or asset_path.read_text() != asset:
            raise ValueError("Saved comparison or browser result differs from the checked aggregate snapshot; investigate before explicitly regenerating with --write")
    print(f"{result['status']}: {result['passed']}/{result['total']} published targets; "
          f"current default CI endpoints {result['current_default_intervals']['passed']}/32 match rounding")
    if result["status"] == "MISMATCH":
        for row in result["checks"]:
            if not row["passed"]:
                print(row)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
