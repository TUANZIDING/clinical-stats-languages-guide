"""Reproducible teaching report. Only synthetic, independent A/B records.

No method selection by diagnostic p values, imputation or outlier deletion.
Run --generate-data explicitly to replace the versioned simulation fixture.
"""
import argparse
import csv
import hashlib
import html
import json
import platform
import shutil
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import scipy
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/synthetic-clinicalv2.0.csv"
RESULT = ROOT / "data/clinical-resultsv2.0.json"
ASSETS = ROOT / "docs/assets"
SEED = 20261008
BASELINE = ("age", "sex", "baseline-sbp", "baseline-crp")
NUMERIC = ("age", "baseline-sbp", "baseline-crp", "day28-sbp")
FIELDS = ("id", "group", "age", "sex", "baseline-sbp", "baseline-crp", "day28-sbp")
LABELS = {"age": "年龄，岁；均值 (SD)", "sex": "记录性别；n / 已知分母 (%)",
          "baseline-sbp": "基线收缩压，mmHg；均值 (SD)",
          "baseline-crp": "基线 CRP，mg/L；中位数 [Q1, Q3]"}


def generate_data(path=DATA):
    rng = np.random.default_rng(SEED)
    groups = np.array(["A"] * 48 + ["B"] * 48)
    rng.shuffle(groups)
    age = np.clip(rng.normal(59, 12, 96), 20, 90).round(1)
    baseline = rng.normal(142, 14, 96).round(1)
    values = {"age": age, "sex": rng.choice(["F", "M"], size=96),
              "baseline-sbp": baseline, "baseline-crp": rng.lognormal(1.2, .9, 96).round(2),
              "day28-sbp": (baseline - np.where(groups == "A", 5, 9) + rng.normal(0, 9, 96)).round(1)}
    # Within each group, masks are sampled independently of the variable values.
    counts = {"age": (2, 3), "sex": (1, 2), "baseline-sbp": (2, 1),
              "baseline-crp": (4, 3), "day28-sbp": (3, 5)}
    masks = {}
    for field, sizes in counts.items():
        masks[field] = set()
        for group, size in zip(("A", "B"), sizes):
            masks[field].update(rng.choice(np.flatnonzero(groups == group), size, replace=False).tolist())
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for i, group in enumerate(groups):
            row = {"id": f"SIM{i+1:03d}", "group": group}
            row.update({field: "" if i in masks[field] else values[field][i] for field in values})
            writer.writerow(row)


def load_data(path=DATA):
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if tuple(reader.fieldnames or ()) != FIELDS:
            raise ValueError("Unexpected clinical teaching CSV schema")
        rows = list(reader)
    if not rows or len({r["id"] for r in rows}) != len(rows) or any(not r["id"] for r in rows):
        raise ValueError("Independent simulation IDs must be nonempty and unique")
    if len(rows) != 96 or {r["id"] for r in rows} != {f"SIM{i:03d}" for i in range(1, 97)}:
        raise ValueError("This lesson only accepts the 96 versioned simulation records")
    if any(sum(r["group"] == g for r in rows) != 48 for g in ("A", "B")):
        raise ValueError("The versioned fixture requires 48 simulation records per group")
    for row in rows:
        if row["group"] not in ("A", "B") or row["sex"] not in ("F", "M", ""):
            raise ValueError("Unknown group/sex category; do not silently drop it")
        for field in NUMERIC:
            if row[field] == "":
                row[field] = None
            else:
                row[field] = float(row[field])
                if not np.isfinite(row[field]):
                    raise ValueError("Nonfinite numeric value; blank cells alone denote missingness")
    return rows


def observed(rows, field):
    return np.asarray([r[field] for r in rows if r[field] is not None], dtype=float)


def summarize(rows, field):
    if field == "sex":
        n = sum(r[field] != "" for r in rows)
        levels = {level: {"n": sum(r[field] == level for r in rows)} for level in ("F", "M")}
        for level in levels.values():
            level["percent"] = 100 * level["n"] / n if n else None
        return {"n": n, "missing": len(rows) - n, "levels": levels}
    x = observed(rows, field)
    return {"n": len(x), "missing": len(rows) - len(x),
            "mean": float(np.mean(x)) if len(x) else None,
            "sd": float(np.std(x, ddof=1)) if len(x) > 1 else None,
            "median": float(np.median(x)) if len(x) else None,
            "q1": float(np.quantile(x, .25, method="linear")) if len(x) else None,
            "q3": float(np.quantile(x, .75, method="linear")) if len(x) else None}


def analyze(rows, source_hash):
    split = {g: [r for r in rows if r["group"] == g] for g in ("A", "B")}
    table = {field: {g: summarize(split[g], field) for g in split} for field in BASELINE}
    a, b = (observed(split[g], "day28-sbp") for g in ("A", "B"))
    if min(len(a), len(b)) < 3 or min(np.std(a), np.std(b)) <= 0:
        raise ValueError("Need at least 3 observed, nonconstant outcomes per group in this lesson")
    t = stats.ttest_ind(a, b, equal_var=False, alternative="two-sided", nan_policy="raise")
    ci = t.confidence_interval(confidence_level=.95)
    primary = {"nA": len(a), "nB": len(b), "meanA": float(np.mean(a)), "meanB": float(np.mean(b)),
               "sdA": float(np.std(a, ddof=1)), "sdB": float(np.std(b, ddof=1)),
               "missingA": len(split["A"]) - len(a), "missingB": len(split["B"]) - len(b),
               "difference": float(np.mean(a) - np.mean(b)), "ciLow": float(ci.low), "ciHigh": float(ci.high),
               "t": float(t.statistic), "df": float(t.df), "p": float(t.pvalue)}
    diagnostics = {g: {"shapiroW": float(stats.shapiro(x).statistic),
                       "shapiroP": float(stats.shapiro(x).pvalue)} for g, x in zip(("A", "B"), (a, b))}
    levene = stats.levene(a, b, center="median")
    diagnostics["levene"] = {"center": "median", "F": float(levene.statistic), "p": float(levene.pvalue)}
    return {"schemaVersion": "2.0", "simulation": True, "seed": SEED, "sourceSha256": source_hash,
            "units": "Independent synthetic records; not real patients", "groupN": {g: len(split[g]) for g in split},
            "plan": {"outcome": "day28-sbp", "time": "day 28", "contrast": "A-B", "unit": "mmHg",
                     "method": "Welch t, two-sided, 95% CI", "adjustment": "none; teaching only",
                     "missing": "observed outcome only; no imputation; baseline missingness does not exclude outcome",
                     "multiplicity": "one teaching primary contrast; diagnostics are not outcome tests",
                     "exclusions": "no outlier deletion", "sampleSize": "96 illustrative records; no power calculation"},
            "table1": table, "primary": primary, "diagnostics": diagnostics,
            "versions": {"Python": platform.python_version(), "NumPy": np.__version__,
                         "SciPy": scipy.__version__, "Matplotlib": matplotlib.__version__}}


def table_rows(result):
    rows = []
    for field in BASELINE:
        if field == "sex":
            for level, label in (("F", "F（模拟分类）"), ("M", "M（模拟分类）")):
                cells = []
                for g in ("A", "B"):
                    s = result["table1"][field][g]; value = s["levels"][level]
                    cells.append(f'{value["n"]} / {s["n"]} ({value["percent"]:.1f}%)' if s["n"] else "无已知记录")
                rows.append([label] + cells)
        else:
            cells = []
            for g in ("A", "B"):
                s = result["table1"][field][g]
                if s["n"] < 2:
                    text = "记录不足"
                elif field == "baseline-crp":
                    text = f'{s["median"]:.2f} [{s["q1"]:.2f}, {s["q3"]:.2f}]'
                else:
                    text = f'{s["mean"]:.1f} ({s["sd"]:.1f})'
                cells.append(f'{text}；已知 n={s["n"]}')
            rows.append([LABELS[field]] + cells)
        rows.append([f"{LABELS[field].split('；')[0]}：缺失 n"] + [str(result["table1"][field][g]["missing"]) for g in ("A", "B")])
    return rows


def report_text(result):
    p = result["primary"]
    version = "; ".join(f"{k} {v}" for k, v in result["versions"].items())
    methods = (f"本教学案例含 96 个独立模拟对象，A、B 组各 48 个；数据不对应真实患者。"
               f"预设教学比较为第 28 天收缩压的 A−B 均值差（mmHg），采用双侧 Welch t 检验与 95% 置信区间，"
               f"不假设等方差、不调整协变量。仅纳入主要结局已观测者（A={p['nA']}，B={p['nB']}），"
               f"不因基线变量缺失额外排除、不插补、不删除异常值。缺失掩码在每组内独立于变量取值随机生成；"
               f"这种生成机制不能替代真实研究缺失机制评估。基线表为描述性汇总，不加 P 值。"
               f"Q–Q 图、Shapiro–Wilk 和以中位数为中心的 Levene 检验用于诊断讨论，不据其 P 值切换主分析。"
               f"仅演示一个主要对比；未进行结局多重检验。软件：{version}。")
    results = (f"A 组第 28 天收缩压为 {p['meanA']:.2f} (SD {p['sdA']:.2f}) mmHg，"
               f"B 组为 {p['meanB']:.2f} (SD {p['sdB']:.2f}) mmHg；缺失分别为 {p['missingA']} 和 {p['missingB']}。"
               f"A−B 均值差为 {p['difference']:.2f} mmHg，95% CI [{p['ciLow']:.2f}, {p['ciHigh']:.2f}]；"
               f"t={p['t']:.3f}，df={p['df']:.3f}，双侧 P={p['p']:.4g}。"
               f"这些数值仅解释模拟计算，不提供临床疗效、临床重要性或真实研究因果证据。")
    legend = (f"图：独立模拟对象第 28 天收缩压及 A−B 均值差。每个散点代表一个有结局记录的独立模拟对象，"
              f"A n={p['nA']}，B n={p['nB']}；缺失 {p['missingA']} / {p['missingB']} 不绘制且未插补。"
              f"左图横线为组均值，不是 CI。右图点为均值差、横线为双侧 Welch 95% CI，虚线为零差异。"
              f"未删除极端点。分析单位、方向、检验与软件同方法段。")
    return {"methods": methods, "results": results, "legend": legend}


def draw_figures(rows, result, destination):
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "axes.spines.top": False,
                         "axes.spines.right": False, "svg.hashsalt": "clinical-v2", "savefig.facecolor": "#0b1220",
                         "figure.facecolor": "#0b1220", "axes.facecolor": "#0b1220", "text.color": "#e9f3fa",
                         "axes.labelcolor": "#e9f3fa", "xtick.color": "#a9bdce", "ytick.color": "#a9bdce",
                         "axes.edgecolor": "#4b6174"})
    colors = {"A": "#00d4ff", "B": "#7cf29c"}
    split = {g: [r for r in rows if r["group"] == g] for g in ("A", "B")}
    data = {g: observed(split[g], "day28-sbp") for g in split}
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.8), gridspec_kw={"width_ratios": [1, 1]})
    jitter = np.random.default_rng(20261009)
    for i, g in enumerate(("A", "B")):
        x = data[g]
        axes[0].scatter(i + jitter.uniform(-.13, .13, len(x)), x, color=colors[g], s=24, alpha=.8)
        axes[0].plot([i-.22, i+.22], [np.mean(x)]*2, color="white", lw=2)
    axes[0].set(xticks=[0, 1], xticklabels=[f"A: n={len(data['A'])}", f"B: n={len(data['B'])}"],
                ylabel="Day 28 systolic BP (mmHg)", title="Observed independent synthetic records")
    p = result["primary"]
    axes[1].axvline(0, color="#7890a2", ls="--", lw=1)
    axes[1].errorbar(p["difference"], 0, xerr=[[p["difference"]-p["ciLow"]], [p["ciHigh"]-p["difference"]]],
                     fmt="o", color="#00d4ff", capsize=7, markersize=9, lw=2)
    axes[1].set(yticks=[], ylim=(-1, 1), xlabel="A - B mean difference (mmHg)", title="Welch 95% confidence interval")
    axes[1].text(.5, .78, f"{p['difference']:.2f} [{p['ciLow']:.2f}, {p['ciHigh']:.2f}]\nTwo-sided P = {p['p']:.4g}",
                 transform=axes[1].transAxes, ha="center", fontsize=14)
    fig.text(.5, .035, f"SIMULATION ONLY | Missing outcome A={p['missingA']}, B={p['missingB']} | No imputation / no outlier deletion", ha="center", color="#a9bdce", fontsize=10)
    fig.tight_layout(rect=(0, .08, 1, 1))
    for ext in ("png", "svg"):
        fig.savefig(destination / f"clinical-effectv2.0.{ext}", dpi=160, metadata={"Date": None} if ext == "svg" else None)
    plt.close(fig)
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    for i, g in enumerate(("A", "B")):
        x = data[g]
        theoretical, ordered = stats.probplot(x, dist="norm", fit=False)
        _, (slope, intercept, _) = stats.probplot(x, dist="norm")
        axes[0, i].scatter(theoretical, ordered, s=22, color=colors[g])
        axes[0, i].plot(theoretical, slope*np.asarray(theoretical)+intercept, color="#a9bdce", lw=1)
        axes[0, i].set(title=f"{g}: outcome Q-Q plot (n={len(x)})", xlabel="Normal theoretical quantiles", ylabel="Day 28 SBP (mmHg)")
        crp = observed(split[g], "baseline-crp")
        axes[1, i].hist(crp, bins=12, color=colors[g], alpha=.7, edgecolor="#0b1220")
        axes[1, i].set(title=f"{g}: baseline CRP (observed n={len(crp)})", xlabel="Baseline CRP (mg/L)", ylabel="Synthetic record count")
    fig.text(.5, .025, "DIAGNOSTICS, NOT A METHOD SWITCH | Keep the estimand, design, missingness and extreme values in view", ha="center", color="#a9bdce", fontsize=10)
    fig.tight_layout(rect=(0, .05, 1, 1))
    for ext in ("png", "svg"):
        fig.savefig(destination / f"distribution-checkv2.0.{ext}", dpi=160, metadata={"Date": None} if ext == "svg" else None)
    plt.close(fig)


def export(rows, result):
    ASSETS.mkdir(exist_ok=True)
    result["report"] = report_text(result)
    text = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    RESULT.write_text(text, encoding="utf-8")
    (ASSETS / "clinical-resultsv2.0.js").write_text("window.CLINICAL_RESULT = " + text.rstrip() + ";\n", encoding="utf-8")
    # The docs/ tree is also the standalone Pages/offline web root.
    shutil.copyfile(DATA, ASSETS / DATA.name)
    shutil.copyfile(ROOT / "templates/统计核查提示词v2.0.md", ASSETS / "统计核查提示词v2.0.md")
    cells = table_rows(result)
    headings = ["基线变量 / 描述规则", "A 组（48）", "B 组（48）"]
    with (ASSETS / "table-onev2.0.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle); writer.writerow(headings); writer.writerows(cells)
    body = "".join("<tr>" + "".join(f"<{('th' if i == 0 else 'td')}{(' scope=\"row\"' if i == 0 else '')}>{html.escape(cell)}</{('th' if i == 0 else 'td')}>" for i, cell in enumerate(row)) + "</tr>" for row in cells)
    caption = "Table 1 · 96 个独立模拟对象的基线描述"
    table = '<table><caption>' + caption + '</caption><thead><tr>' + ''.join(f'<th scope="col">{h}</th>' for h in headings) + '</tr></thead><tbody>' + body + '</tbody></table>'
    page = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>模拟基线表 v2.0</title><link rel="stylesheet" href="../styles.css"><main class="wrap section"><h1>模拟基线表</h1><p>无真实患者数据。基线变量与第 28 天结局分开报告；不含基线 P 值。</p><div class="table-scroll">' + table + '</div><p class="small">SD：样本标准差。Q1/Q3：25%/75% 分位数（线性插值，R type=7）。连续变量按各变量已知记录汇总；类别百分比分母排除该变量缺失，缺失单列。F/M 是模拟分类标签，不覆盖真实研究的性别/社会性别定义。</p><a href="../index.html#reporting">返回实操实验室</a></main></html>\n'
    (ASSETS / "table-onev2.0.html").write_text(page, encoding="utf-8")
    report = "# 模拟统计报告 v2.0\n\n仅用于教学，不是可直接用于真实研究的已审核统计报告。\n\n"
    for key, title in (("methods", "方法"), ("results", "结果"), ("legend", "图注")):
        report += f"## {title}\n\n{result['report'][key]}\n\n"
    report += f"源 CSV SHA-256：`{result['sourceSha256']}`。\n\n[基线表](table-onev2.0.html) · [源数据](synthetic-clinicalv2.0.csv) · [报告核对清单](../统计报告核对v2.0.md)\n"
    (ASSETS / "clinical-reportv2.0.md").write_text(report, encoding="utf-8")
    draw_figures(rows, result, ASSETS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generate-data", action="store_true")
    args = parser.parse_args()
    if args.generate_data:
        generate_data()
    rows = load_data()
    result = analyze(rows, hashlib.sha256(DATA.read_bytes()).hexdigest())
    export(rows, result)
    print(json.dumps(result["primary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
