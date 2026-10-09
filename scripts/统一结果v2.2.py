"""Original, small ARD-inspired result contract. Snapshot checks need only stdlib.

No real-patient inputs are accepted. Recalculation uses the two named teaching
fixtures and the separately hash-checked, bounded NHANES replay only.
"""
import argparse
import csv
import datetime as dt
import hashlib
import html
import importlib.util
import importlib.metadata
import io
import json
import math
import platform
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs/assets"
BUNDLE = "分析结果v2.2.json"
VIEW = "统一结果视图v2.2.js"
NAMES = {"small": "24 例独立模拟教学", "clinical": "96 例临床统计模拟教学", "nhanes": "Nickels 2019：限定 NHANES 模型"}


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def dump(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    return str(path)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def load_module(path):
    spec = importlib.util.spec_from_file_location("lesson", ROOT / path)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


def provenance(paths):
    return [{"path": p, "sha256": sha(ROOT / p)} for p in paths]


def py_environment():
    names = [line.split("==")[0] for line in (ROOT / "config/Python环境锁v2.2.txt").read_text().splitlines() if "==" in line]
    packages = {}
    for name in names:
        try:
            packages[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            packages[name] = "NOT_INSTALLED"
    prefix = Path(sys.prefix)
    return {"Python": platform.python_version(), "system": platform.platform(), "machine": platform.machine(), "packages": packages,
            "prefix": str(prefix.relative_to(ROOT)) if prefix.is_relative_to(ROOT) else "external interpreter environment"}


def leaves(obj, prefix=""):
    out = {}
    for key, value in obj.items():
        name = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            out.update(leaves(value, name))
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            out[name] = value
    return out


def compare_values(got, expected, name):
    if set(got) != set(expected):
        raise ValueError(f"{name}: result keys differ")
    for key, value in expected.items():
        tolerance = 1e-6 if "shapiro" in key else 1e-9
        if not math.isclose(got[key], value, rel_tol=tolerance, abs_tol=1e-9):
            raise ValueError(f"{name}.{key}: {got[key]} != frozen {value}; investigate, do not update targets")


def recompute_teaching(output):
    environment = py_environment()
    for line in (ROOT / "config/Python环境锁v2.2.txt").read_text().splitlines():
        if "==" in line:
            name, version = line.split("==")
            if environment["packages"].get(name) != version:
                raise ValueError("Python package differs from lock: " + name)
    small = load_module("examples/python/welch_demo.py").analyze()
    clinical = load_module("scripts/clinical-reportv2.0.py")
    result = clinical.analyze(clinical.load_data(), sha(clinical.DATA))
    compare_values(small, read(ROOT / "data/expected-results.json"), "small")
    frozen = read(ROOT / "data/clinical-resultsv2.0.json")
    compare_values(leaves(result), leaves({k: v for k, v in frozen.items() if k != "report"}), "clinical")
    # Actually execute the independent base-R implementations in the selected library.
    rsmall = subprocess.check_output(["Rscript", "--vanilla", "examples/r/welch_demo.R"], cwd=ROOT, text=True)
    rvalues = {k: float(v) for k, v in (line.split("=", 1) for line in rsmall.splitlines())}
    compare_values(rvalues, small, "R-small")
    rclinical = subprocess.check_output(["Rscript", "--vanilla", "examples/r/clinical-crosscheckv2.0.R"], cwd=ROOT, text=True)
    rvalues = {r["key"]: float(r["value"]) for r in csv.DictReader(io.StringIO(rclinical))}
    compare_values(rvalues, leaves({k: result[k] for k in ("groupN", "table1", "primary", "diagnostics")}), "R-clinical")
    return dump(output, {"small": small, "clinical": result, "environment": environment,
                         "computedAt": now(), "crosscheck": {"R-small": 10, "R-clinical": len(rvalues), "status": "NUMERICAL_AGREEMENT"}})


def estimate(identifier, value, low, high, unit, target, direction, algorithm, metrics):
    return {"id": identifier, "value": value, "unit": unit, "estimand": target, "direction": direction,
            "ci": {"level": .95, "lower": low, "upper": high, "algorithm": algorithm}, "metrics": metrics}


def make_case(identifier, mode, data, code, population, denominators, estimand, direction, missing, environment):
    return {"id": identifier, "label": NAMES[identifier], "execution": mode, "data": data,
            "code": {"files": provenance(code), "meaning": "implementation at record creation; snapshot mode does not prove the historical executing code"},
            "population": population, "denominators": denominators, "estimand": estimand, "direction": direction,
            "missing": missing, "environment": environment, "estimates": [], "statistics": [],
            "diagnostics": {"executed": [], "notExecuted": []}, "warnings": []}


def stat(case, variable, group, name, value, denominator, context="summary", level=None):
    case["statistics"].append({"variable": variable, "group": group, "context": context, "statName": name,
                               "value": value, "denominator": denominator, "level": level})


def assemble(teaching=None, paper=None, r_environment=None, paper_diagnostics=None):
    fresh = teaching is not None
    s = teaching["small"] if fresh else read(ROOT / "data/expected-results.json")
    c = teaching["clinical"] if fresh else read(ROOT / "data/clinical-resultsv2.0.json")
    p = paper if paper is not None else read(ROOT / "data/paper-replayv2.1.json")
    time = teaching["computedAt"] if fresh else None
    if fresh:
        if not r_environment or not r_environment.get("sourceSha256") or not r_environment.get("inputSha256"):
            raise ValueError("Actual replay requires its start-of-run source/input manifest")
        for name, digest in {**r_environment["sourceSha256"], **r_environment["inputSha256"]}.items():
            if sha(ROOT / name) != digest:
                raise ValueError("Source/input changed during replay: " + name)
    execution = {"kind": "recomputed" if fresh else "snapshot-import", "computedAt": time,
                 "scope": "two synthetic fixtures only", "crosscheck": teaching["crosscheck"] if fresh else {"status": "NOT_EXECUTED_BY_IMPORT"}}
    small = make_case("small", execution, provenance(["data/synthetic-independent.csv", "data/expected-results.json"]),
                      ["examples/python/welch_demo.py", "examples/r/welch_demo.R"],
                      {"description": "人为构造的独立观测，无患者；全部结局已知", "unit": "独立模拟对象", "sampling": "人为构造"},
                      {"eligible": 24, "A": s["n_a"], "B": s["n_b"], "analyzed": s["n_a"] + s["n_b"], "weighted": False},
                      "未调整均值差", "A−B", {"rule": "拒绝缺失 / 非有限值，不删除或插补", "A": 0, "B": 0},
                      {"analysis": teaching["environment"] if fresh else {"status": "historical environment not recorded"}, "R": r_environment if fresh else None})
    small["estimates"] = [estimate("primary", s["difference"], s["ci_low"], s["ci_high"], "教学数值，未赋予临床单位", "未调整均值差", "A−B",
                                  "Welch t；Satterthwaite 自由度；双侧", {"t": s["statistic"], "df": s["df"], "p": s["p_value"]})]
    for g in ("A", "B"):
        stat(small, "value", g, "mean", s[f"mean_{g.lower()}"], s[f"n_{g.lower()}"])
    small["diagnostics"]["executed"] = ["unique IDs / finite values checked by the two implementations"] if fresh else []
    small["diagnostics"]["notExecuted"] = ["分布与极端值解释、独立性的方法学核查；数值一致不能代替这些检查"]
    small["warnings"] = ["只用于模拟教学；没有功效或临床疗效证据"]

    primary = c["primary"]
    clinical = make_case("clinical", execution, provenance(["data/synthetic-clinicalv2.0.csv", "data/clinical-resultsv2.0.json"]),
                         ["scripts/clinical-reportv2.0.py", "examples/r/clinical-crosscheckv2.0.R"],
                         {"description": "96 个独立模拟对象；只按主要结局观测情况纳入", "unit": "独立模拟对象", "sampling": "人为构造"},
                         {"eligible": sum(c["groupN"].values()), "groupTotal": c["groupN"], "A": primary["nA"], "B": primary["nB"], "analyzed": primary["nA"] + primary["nB"], "weighted": False},
                         "第 28 天未调整收缩压均值差", "A−B", {"rule": c["plan"]["missing"], "A": primary["missingA"], "B": primary["missingB"], "imputation": "none"},
                         {"analysis": {**c["versions"], **(teaching["environment"] if fresh else {"system": "not recorded"})}, "R": r_environment if fresh else None})
    clinical["estimates"] = [estimate("primary", primary["difference"], primary["ciLow"], primary["ciHigh"], "mmHg", clinical["estimand"], "A−B",
                                     "Welch t；Satterthwaite 自由度；双侧", {"t": primary["t"], "df": primary["df"], "p": primary["p"]})]
    for field, groups in c["table1"].items():
        for g, summary in groups.items():
            for key, value in summary.items():
                if key == "levels":
                    for level, metrics in value.items():
                        for name, number in metrics.items():
                            stat(clinical, field, g, name, number, summary["n"], level=level)
                else:
                    stat(clinical, field, g, key, value, c["groupN"][g] if key == "missing" else summary["n"])
    for g in ("A", "B"):
        for name in ("mean", "sd"):
            stat(clinical, "day28-sbp", g, name, primary[f"{name}{g.upper()}"], primary[f"n{g}"])
    clinical["diagnostics"] = {"executed": c["diagnostics"], "status": "recomputed" if fresh else "imported legacy diagnostic values",
                               "notExecuted": ["Q–Q 图的真人解释、缺失机制与研究方案审核"], "routing": "P values do not switch the planned analysis"}
    clinical["warnings"] = ["结局缺失；仅观测结局分析是预设教学处理，不是通用缺失方案", "基线变量缺失不额外剔除主要结局", "无临床疗效 / 因果或功效证据"]

    manifest = read(ROOT / "data/nhanes-source-manifestv2.1.json")
    comparator = load_module("scripts/verify-paperv2.1.py").validate(p, read(ROOT / "data/paper-targetsv2.1.json"))
    if comparator["status"] != "SELECTED_TARGETS_MATCH":
        raise ValueError("Paper targets differ; retain the difference and investigate")
    nhanes = make_case("nhanes", {"kind": "recomputed" if paper is not None else "snapshot-import", "computedAt": r_environment.get("computedAt") if paper is not None else None,
                                 "scope": p["scope"], "comparison": {"passed": comparator["passed"], "total": comparator["total"], "currentDefault": comparator["current_default_intervals"]}},
                      [{"path": "build/papersv2.1/" + f["file"], "sha256": f["sha256"], "url": f["url"], "role": "primary myopia input" if f["component"] != "ECQ" else "additional frozen public case input; not fitted in myopia"} for f in manifest["files"]] + provenance(["data/paper-targetsv2.1.json", "data/paper-replayv2.1.json"]),
                      ["examples/r/nhanes-replayv2.1.R"],
                      {"description": "NHANES 1999–2008；完整核心变量及原文手术排除顺序", "unit": "参与者", "sampling": "MEC10YR；SDMVSTRA / SDMVPSU；设计在纳排后创建；domain 敏感性另存"},
                      {"eligible": p["flow"]["downloaded_demographics"], "analyzed": p["flow"]["analysis"], "flow": p["flow"], "weighted": False, "meaning": "未加权人数，不是总体规模"},
                      "教育与屈光度关联系数 / 近视 OR", "教育 2–5 各自相对教育 1；非因果效应",
                      {"rule": "完整核心变量；将指定无效编码转缺失；按原文顺序排除手术及手术缺失", "flow": p["flow"]},
                      {"analysis": p["versions"], "R": r_environment if paper is not None else {"system": "not recorded in legacy snapshot"}})
    nhanes["code"]["authorCode"] = {"commit": "8beb4014f3a879b72271fe81ee1182c97b2b1adc", "status": "inspected, not executed; independently reimplemented; no explicit code license"}
    for row in p["estimates"]:
        logistic = row["model"].startswith("logistic")
        e = estimate(row["model"] + "." + row["term"], row["estimate"], row["normal_lower"], row["normal_upper"], "OR" if logistic else "D",
                     "优势比 OR" if logistic else "教育关联系数", row["term"] + " 相对 DMDEDUC21",
                     "正态 Wald z=qnorm(0.975)；OR 在 log 尺度构造再 exp；匹配原文约定", {"p": row["p"], "n": row["n"]})
        e["model"] = row["model"]
        model_diagnostic = paper_diagnostics.get("executed", {}).get("models", {}).get(row["model"], {}) if paper_diagnostics else {}
        e["modelSpec"] = {"formula": model_diagnostic.get("formula"), "adjustment": [] if row["model"].endswith("crude") else ["RIAGENDR", "age", "year"], "weighting": "MEC10YR, strata=SDMVSTRA, PSU=SDMVPSU", "family": "quasibinomial" if logistic else "gaussian"}
        e["metricsMethod"] = "P from this run's summary.svyglm default; the primary normal CI does not relabel its P as a normal-test P"
        e["ciVariants"] = {"currentDefault": {"level": .95, "lower": row["lower"], "upper": row["upper"], "algorithm": "该次 survey::confint.svyglm 默认 t 区间；软件版本见 environment"}}
        e["ciVariants"]["currentDefault"]["dfResidual"] = model_diagnostic.get("dfResidual")
        nhanes["estimates"].append(e)
    for row in p["descriptives"]:
        for key in ("n", "mean_spherical_equivalent", "myopia_percent"):
            stat(nhanes, "education", row["education"], key, row[key], row["n"], context="unweighted description")
    nhanes["sensitivity"] = {"domain": p["domain_sensitivity"], "status": "separate from publication-matching primary"}
    nhanes["diagnostics"] = paper_diagnostics if paper_diagnostics is not None else {"executed": [], "notExecuted": ["冻结快照未保存模型诊断，不能由 72 点一致推断模型适用"]}
    nhanes["warnings"] = ["只复算选定四个模型与流程，非整篇论文", "原文正态区间与当前默认 t 区间分别保留，不修改期望值", "作者代码未执行；发表方法不等于无错误金标准", "横断面关联不能支持教育的因果效应"]
    bundle = {"schemaVersion": "2.2", "createdAt": now(), "recordBuilder": py_environment(),
              "code": provenance(["scripts/统一结果v2.2.py", "scripts/分析流水线v2.2.R", "scripts/运行流水线v2.2.R", "scripts/论文重算v2.2.R", "scripts/恢复环境v2.2.R", "config/R环境锁v2.2.json", "config/Python环境锁v2.2.txt", "requirements.txt"]),
              "cases": {"small": small, "clinical": clinical, "nhanes": nhanes},
              "boundary": "Engineering / numerical replay / methodology / AI evaluation / human trial are separate; this object does not certify clinical validity."}
    validate(bundle)
    return bundle


def validate(bundle):
    if bundle.get("schemaVersion") != "2.2" or set(bundle.get("cases", {})) != set(NAMES):
        raise ValueError("Unsupported or incomplete result contract")
    required = {"id", "data", "code", "population", "denominators", "estimand", "direction", "missing", "diagnostics", "warnings", "environment", "estimates", "statistics", "execution"}
    for key, case in bundle["cases"].items():
        if not required <= case.keys() or case["id"] != key or case["execution"]["kind"] not in ("snapshot-import", "recomputed"):
            raise ValueError(f"{key}: missing provenance fields / invalid execution state")
        n = case["denominators"]["analyzed"]
        if not isinstance(n, int) or isinstance(n, bool) or n <= 0 or not case["estimates"]:
            raise ValueError("Missing analysis denominator / estimates")
        if key == "nhanes" and (len(case["estimates"]) != 16 or any("currentDefault" not in e.get("ciVariants", {}) for e in case["estimates"])):
            raise ValueError("The selected NHANES contract requires 16 rows and both interval conventions")
        for source in case["data"]:
            if not source.get("path") or len(source.get("sha256", "")) != 64:
                raise ValueError("Missing input path / SHA-256")
        identifiers = [x["id"] for x in case["estimates"]]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("Duplicate estimate IDs")
        for e in case["estimates"]:
            for ci in [e["ci"], *e.get("ciVariants", {}).values()]:
                if not ci["algorithm"] or ci["level"] != .95 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (e["value"], ci["lower"], ci["upper"])) or not ci["lower"] <= e["value"] <= ci["upper"]:
                    raise ValueError("Nonfinite / invalid interval or missing algorithm")
            if not e["direction"] or not e["estimand"]:
                raise ValueError("Missing target / direction")
        if key in ("small", "clinical"):
            d = case["denominators"]
            if d["A"] + d["B"] != d["analyzed"] or d["analyzed"] + case["missing"]["A"] + case["missing"]["B"] != d["eligible"]:
                raise ValueError("Observed and eligible denominators contradict")
        stat_keys = [(x["variable"], x["group"], x["context"], x["statName"], x["level"]) for x in case["statistics"]]
        if len(stat_keys) != len(set(stat_keys)):
            raise ValueError("Ambiguous statistic key")
        if any(not isinstance(x["denominator"], int) or x["denominator"] < 0 for x in case["statistics"]):
            raise ValueError("Statistic denominator must identify a nonnegative record count")
    json.dumps(bundle, allow_nan=False)


def clinical_view(case):
    # Compatibility view is derived, not a second analysis or hand-transcribed result.
    table = {}
    outcome = {}
    for x in case["statistics"]:
        if x["variable"] == "day28-sbp":
            outcome[x["statName"] + x["group"]] = x["value"]
        else:
            cell = table.setdefault(x["variable"], {}).setdefault(x["group"], {})
            if x["level"] is None:
                cell[x["statName"]] = x["value"]
            else:
                cell.setdefault("levels", {}).setdefault(x["level"], {})[x["statName"]] = x["value"]
    e = case["estimates"][0]
    d, m = case["denominators"], case["missing"]
    primary = {**outcome, "nA": d["A"], "nB": d["B"], "missingA": m["A"], "missingB": m["B"],
               "difference": e["value"], "ciLow": e["ci"]["lower"], "ciHigh": e["ci"]["upper"], **e["metrics"]}
    methods = f"人为构造的 {d['eligible']} 个独立模拟对象，组总数 A={d['groupTotal']['A']}、B={d['groupTotal']['B']}。目标为第 28 天 A−B 未调整均值差，单位 {e['unit']}。观测结局 A={d['A']}、B={d['B']}；{m['rule']}。区间算法：{e['ci']['algorithm']}，置信水平 {e['ci']['level']:.0%}。基线按变量已知分母汇总，不加 P 值。诊断不切换预定方法。软件版本与运行状态见统一结果对象。"
    results = f"A−B 均值差 {e['value']:.2f} {e['unit']}，95% CI [{e['ci']['lower']:.2f}, {e['ci']['upper']:.2f}]；t={e['metrics']['t']:.3f}，df={e['metrics']['df']:.3f}，双侧 P={e['metrics']['p']:.4g}。缺失 A={m['A']}、B={m['B']}。仅解释模拟计算，不提供疗效、因果或临床重要性证据。"
    legend = f"图：{case['label']}的 A−B 均值差（{e['unit']}）。点为 {e['value']:.2f}，横线为 Welch 95% CI [{e['ci']['lower']:.2f}, {e['ci']['upper']:.2f}]，虚线为零。观测结局 A n={d['A']}、B n={d['B']}；缺失 {m['A']} / {m['B']} 未插补。没有删除极端值。图不显示原始观测，也不构成临床证据。"
    return {"simulation": True, "primary": primary, "groupN": d["groupTotal"], "table1": table,
            "diagnosticLegend": f"保留的 v2.0 冻结分布图，本轮未重新绘制。上排随访结局 A n={d['A']} / B n={d['B']}；下排基线 CRP A n={table['baseline-crp']['A']['n']} / B n={table['baseline-crp']['B']['n']}。缺失不绘制、未删除极端值。下方数值诊断来自统一结果对象。",
            "diagnostics": case["diagnostics"]["executed"], "report": {"methods": methods, "results": results, "legend": legend}}


def views(bundle):
    small = bundle["cases"]["small"]
    e, d = small["estimates"][0], small["denominators"]
    small_view = {"difference": e["value"], "ci_low": e["ci"]["lower"], "ci_high": e["ci"]["upper"], "p_value": e["metrics"]["p"],
                  "legend": f"人为构造教学结果：A n={d['A']}、B n={d['B']}；A−B={e['value']:.2f}，Welch 95% CI [{e['ci']['lower']:.2f}, {e['ci']['upper']:.2f}]。点与区间从统一结果对象生成；不是患者结果或疗效证据。"}
    paper = bundle["cases"]["nhanes"]
    paper_view = {"comparison": paper["execution"]["comparison"], "legend": f"限定调整后线性模型：教育组 2–5 相对组 1，未加权分析 n={paper['denominators']['analyzed']}；单位 D。主线为匹配原文约定的正态 Wald 95% CI，另线为该次软件默认 t CI；domain 敏感性单列。图由统一结果对象生成，只反映关联；不是整篇论文复现或 AI 测评。"}
    return {"small": small_view, "clinical": clinical_view(bundle["cases"]["clinical"]), "nhanes": paper_view,
            "status": {key: case["execution"]["kind"] for key, case in bundle["cases"].items()}}


def report(bundle):
    lines = ["# 统一结果报告 v2.2", "", "所有数字由同一结果对象生成；页面读取的是上次保存的产物，打开页面不会重算。", ""]
    for key, case in bundle["cases"].items():
        lines += ["## " + case["label"], "", "运行状态：" + case["execution"]["kind"] + "；范围：" + case["execution"]["scope"], "", "分析人数：" + str(case["denominators"]["analyzed"]) + "（未加权人数）。", "", "| 分析 / 比较 | 目标量 | 估计 | 95% CI |", "|---|---|---|---|"]
        for e in case["estimates"]:
            lines += [f"| {e['id']}；{e['direction']} | {e['estimand']} | {e['value']:.6g} {e['unit']} | [{e['ci']['lower']:.6g}, {e['ci']['upper']:.6g}] |"]
        lines += ["", "区间算法：" + case["estimates"][0]["ci"]["algorithm"], "", "缺失：" + case["missing"]["rule"], "", "警告：" + "；".join(case["warnings"]), ""]
        if key == "clinical":
            for name, text in clinical_view(case)["report"].items():
                lines += ["### " + name, "", text, ""]
        if key == "nhanes":
            lines += ["当前默认 t 区间另保存在 ciVariants.currentDefault；domain 敏感性另存，均未替换原文约定。", ""]
    return "\n".join(lines) + "\n"


def render(bundle, destination, figures=True):
    validate(bundle)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    dump(destination / BUNDLE, bundle)
    (destination / VIEW).write_text("window.RESULT_VIEW = " + json.dumps(views(bundle), ensure_ascii=False, allow_nan=False) + ";\n", encoding="utf-8")
    text = report(bundle)
    (destination / "统一结果报告v2.2.md").write_text(text, encoding="utf-8")
    # Reuse the existing project's formatter on a derived compatibility view.
    formatter = load_module("scripts/clinical-reportv2.0.py") if figures else None
    if figures:
        cells = formatter.table_rows(views(bundle)["clinical"])
        with (destination / "基线表v2.2.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["基线变量 / 规则", "A", "B"])
            writer.writerows(cells)
        rows = "".join("<tr>" + "".join("<td>" + html.escape(x) + "</td>" for x in row) + "</tr>" for row in cells)
        (destination / "基线表v2.2.html").write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>模拟基线表 v2.2</title><style>body{font:16px/1.6 system-ui;margin:24px auto;padding:0 20px;max-width:1100px;color:#193c38}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd6d2;padding:12px;text-align:left}.table-scroll{overflow:auto}th{background:#e7f0e9}</style><main><h1>模拟基线表 v2.2</h1><p>由统一结果对象生成。无患者数据；不加基线 P 值；分母按变量已知记录计算。</p><div class="table-scroll"><table><thead><tr><th>变量</th><th>A</th><th>B</th></tr></thead><tbody>' + rows + '</tbody></table></div><p>Q1/Q3：线性插值（R type=7）。缺失单列；类别百分比分母排除该变量缺失。</p><a href="分析结果v2.2.json">查看机器可读结果</a></main></html>\n', encoding="utf-8")
        draw(bundle, destination)
    artifacts = {}
    for name in [BUNDLE, VIEW, "统一结果报告v2.2.md", "基线表v2.2.csv", "基线表v2.2.html", "教学效应图v2.2.png", "临床模拟效应图v2.2.png", "论文效应图v2.2.png"]:
        if (destination / name).exists():
            artifacts[name] = sha(destination / name)
    dump(destination / "产物来源v2.2.json", {"source": BUNDLE, "sourceSha256": sha(destination / BUNDLE), "artifacts": artifacts})
    return str(destination / "产物来源v2.2.json")


def draw(bundle, destination):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.spines.top": False, "axes.spines.right": False})
    for key, name in (("small", "教学效应图"), ("clinical", "临床模拟效应图"), ("nhanes", "论文效应图")):
        case = bundle["cases"][key]
        selected = [e for e in case["estimates"] if key != "nhanes" or e["model"] == "linear_adjusted"]
        fig, ax = plt.subplots(figsize=(9, 3.4 if key != "nhanes" else 4.4))
        for i, e in enumerate(selected):
            ax.errorbar(e["value"], i, xerr=[[e["value"] - e["ci"]["lower"]], [e["ci"]["upper"] - e["value"]]], fmt="o", color="#19786b", capsize=6, label="Primary 95% CI" if i == 0 else None)
            if e.get("ciVariants"):
                ci = e["ciVariants"]["currentDefault"]
                ax.errorbar(e["value"], i + .12, xerr=[[e["value"] - ci["lower"]], [ci["upper"] - e["value"]]], fmt=".", color="#8a639d", capsize=4, label="Current default t CI" if i == 0 else None)
            ax.annotate(f"{e['value']:.2f} [{e['ci']['lower']:.2f}, {e['ci']['upper']:.2f}]", (e["value"], i), xytext=(0, 20), textcoords="offset points", ha="center", fontsize=10)
        ax.axvline(0, linestyle="--", color="#778080")
        ax.set(yticks=range(len(selected)), yticklabels=[e["direction"] if key == "nhanes" else "A - B" for e in selected], xlabel="Education coefficient (D)" if key == "nhanes" else "Mean difference (" + ("mmHg" if key == "clinical" else "teaching units") + ")", ylim=(-.5, len(selected) - .3))
        # Font-independent, original ASCII labels; numeric values come only from bundle.
        if key == "nhanes":
            ax.set_yticklabels([e["id"].split(".")[-1] + " vs DMDEDUC21" for e in selected])
            handles, labels = ax.get_legend_handles_labels()
            fig.legend(handles, labels, loc="lower center", bbox_to_anchor=(.5, .075), ncol=2, fontsize=10)
        fig.suptitle("NHANES selected adjusted linear model" if key == "nhanes" else "Synthetic teaching estimate | Welch 95% CI")
        fig.text(.5, .02, f"n={case['denominators']['analyzed']} | {case['execution']['kind']} | NOT clinical validation", ha="center", fontsize=10)
        fig.tight_layout(rect=(0, .18 if key=="nhanes" else .07, 1, .93))
        fig.savefig(destination / (name + "v2.2.png"), dpi=150, metadata={"source-sha256": sha(destination / BUNDLE)})
        plt.close(fig)


def check(bundle, destination):
    validate(bundle)
    # Offline, compare already saved numbers, source hashes and generated views.
    for source in bundle["code"]:
        if sha(ROOT / source["path"]) != source["sha256"]:
            raise ValueError("Implementation / lock drift: " + source["path"] + "; replay to create new evidence, do not relabel old results")
    for case in bundle["cases"].values():
        for source in case["code"]["files"]:
            if sha(ROOT / source["path"]) != source["sha256"]:
                raise ValueError("Implementation / lock drift: " + source["path"] + "; replay to create new evidence, do not relabel old results")
        for source in case["data"]:
            if not source["path"].startswith("build/") and sha(ROOT / source["path"]) != source["sha256"]:
                raise ValueError("Frozen source drift: " + source["path"])
    s = bundle["cases"]["small"]["estimates"][0]
    expected = read(ROOT / "data/expected-results.json")
    for key, val in {"difference": s["value"], "ci_low": s["ci"]["lower"], "ci_high": s["ci"]["upper"], "p_value": s["metrics"]["p"]}.items():
        if not math.isclose(val, expected[key], rel_tol=1e-9, abs_tol=1e-10):
            raise ValueError("Small frozen target mismatch")
    clinical = clinical_view(bundle["cases"]["clinical"])
    expected = read(ROOT / "data/clinical-resultsv2.0.json")
    compare_values(leaves({k: clinical[k] for k in ("groupN", "table1", "primary", "diagnostics")}), leaves({k: expected[k] for k in ("groupN", "table1", "primary", "diagnostics")}), "clinical snapshot")
    paper = read(ROOT / "data/paper-replayv2.1.json")
    case = bundle["cases"]["nhanes"]
    if len(case["estimates"]) != len(paper["estimates"]):
        raise ValueError("Missing paper rows")
    for e, row in zip(case["estimates"], paper["estimates"]):
        if e["id"] != row["model"] + "." + row["term"]:
            raise ValueError("Paper comparison identity drift")
        compare_values({"value": e["value"], "low": e["ci"]["lower"], "high": e["ci"]["upper"]}, {"value": row["estimate"], "low": row["normal_lower"], "high": row["normal_upper"]}, e["id"])
    raw = (destination / VIEW).read_text(encoding="utf-8")
    if json.loads(raw.removeprefix("window.RESULT_VIEW = ").strip().removesuffix(";")) != views(bundle) or (destination / "统一结果报告v2.2.md").read_text(encoding="utf-8") != report(bundle):
        raise ValueError("Display/report drift from canonical object")
    manifest = read(destination / "产物来源v2.2.json")
    if manifest["source"] != BUNDLE or manifest["sourceSha256"] != sha(destination / BUNDLE):
        raise ValueError("Artifact source drift from canonical object")
    for name, digest in manifest["artifacts"].items():
        if sha(destination / name) != digest:
            raise ValueError("Artifact drift: " + name)
    print("PASS: offline snapshot/provenance/view/artifact checks; NO recalculation or public-data download")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["snapshot", "teaching", "combine", "render", "check"])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--bundle", type=Path, default=ASSETS / BUNDLE)
    parser.add_argument("--teaching", type=Path)
    parser.add_argument("--paper", type=Path)
    parser.add_argument("--r-environment", type=Path)
    parser.add_argument("--paper-diagnostics", type=Path)
    args = parser.parse_args()
    if args.output is None:
        args.output = ASSETS if args.action == "render" else (ROOT / "build/教学重算v2.2.json" if args.action == "teaching" else ASSETS / BUNDLE)
    if args.action == "teaching":
        print(recompute_teaching(args.output))
    elif args.action in ("snapshot", "combine"):
        if args.action == "combine" and not all([args.teaching, args.paper, args.r_environment, args.paper_diagnostics]):
            parser.error("combine requires actual teaching, paper, R environment and diagnostics outputs")
        bundle = assemble(read(args.teaching) if args.teaching else None, read(args.paper) if args.paper else None,
                          read(args.r_environment) if args.r_environment else None, read(args.paper_diagnostics) if args.paper_diagnostics else None)
        dump(args.output, bundle)
    elif args.action == "render":
        print(render(read(args.bundle), args.output))
    else:
        check(read(args.bundle), args.bundle.parent)


if __name__ == "__main__":
    main()
