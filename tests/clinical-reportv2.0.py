"""Test denominators, missingness, method invariance and reference provenance."""
import copy
import csv
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("clinical", ROOT / "scripts/clinical-reportv2.0.py")
clinical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clinical)


def leaves(value, prefix=""):
    result = {}
    for key, item in value.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(item, dict):
            result.update(leaves(item, path))
        elif isinstance(item, (int, float)) and not isinstance(item, bool):
            result[path] = item
    return result


class ClinicalLesson(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = clinical.load_data()
        cls.sha = hashlib.sha256(clinical.DATA.read_bytes()).hexdigest()
        cls.result = clinical.analyze(cls.rows, cls.sha)
        cls.reference = json.loads(clinical.RESULT.read_text(encoding="utf-8"))

    def test_source_and_export_are_current(self):
        self.assertEqual(self.reference["sourceSha256"], self.sha)
        self.assertEqual((clinical.ASSETS / clinical.DATA.name).read_bytes(), clinical.DATA.read_bytes())
        self.assertEqual((clinical.ASSETS / "统计核查提示词v2.0.md").read_bytes(),
                         (ROOT / "templates/统计核查提示词v2.0.md").read_bytes())
        for key, value in leaves(self.result).items():
            self.assertTrue(math.isclose(value, leaves(self.reference)[key], rel_tol=1e-9, abs_tol=1e-10), key)
        raw = (clinical.ASSETS / "clinical-resultsv2.0.js").read_text(encoding="utf-8")
        self.assertEqual(json.loads(raw.removeprefix("window.CLINICAL_RESULT = ").strip().removesuffix(";")), self.reference)
        self.assertEqual(self.reference["report"], clinical.report_text(self.reference))
        with (clinical.ASSETS / "table-onev2.0.csv").open(encoding="utf-8-sig", newline="") as f:
            self.assertEqual(list(csv.reader(f))[1:], clinical.table_rows(self.reference))

    def test_baseline_has_no_outcome_or_p_column(self):
        self.assertEqual(set(self.result["table1"]), set(clinical.BASELINE))
        self.assertNotIn("day28-sbp", self.result["table1"])
        self.assertFalse(any(k.endswith(".p") for k in leaves(self.result["table1"])))

    def test_variable_denominators_and_missing_counts(self):
        expected = {"age": (2, 3), "sex": (1, 2), "baseline-sbp": (2, 1), "baseline-crp": (4, 3)}
        self.assertEqual(self.result["groupN"], {"A": 48, "B": 48})
        for field, counts in expected.items():
            for group, count in zip(("A", "B"), counts):
                s = self.result["table1"][field][group]
                self.assertEqual(s["missing"], count)
                self.assertEqual(s["n"] + count, 48)
        for group in ("A", "B"):
            s = self.result["table1"]["sex"][group]
            self.assertEqual(sum(v["n"] for v in s["levels"].values()), s["n"])
            self.assertAlmostEqual(sum(v["percent"] for v in s["levels"].values()), 100)

    def test_baseline_missingness_does_not_drop_observed_outcomes(self):
        altered = copy.deepcopy(self.rows)
        for row in altered:
            for field in ("age", "baseline-sbp", "baseline-crp"):
                row[field] = None
            row["sex"] = ""
        actual = clinical.analyze(altered, "test")
        self.assertEqual(actual["primary"], self.result["primary"])
        self.assertEqual((actual["primary"]["nA"], actual["primary"]["nB"]), (45, 43))

    def test_clinical_units_ci_and_no_diagnostic_routing(self):
        p = self.result["primary"]
        self.assertAlmostEqual(p["difference"], p["meanA"] - p["meanB"])
        self.assertLess(p["ciLow"], p["difference"])
        self.assertGreater(p["ciHigh"], p["difference"])
        self.assertEqual(self.result["plan"]["contrast"], "A-B")
        self.assertEqual(self.result["plan"]["method"], "Welch t, two-sided, 95% CI")
        # Inject radically different diagnostic p values. Primary calculation is independent.
        original = clinical.stats.shapiro
        try:
            clinical.stats.shapiro = lambda x: type("Diagnostic", (), {"statistic": .8, "pvalue": 1e-12})()
            self.assertEqual(clinical.analyze(self.rows, "test")["primary"], p)
        finally:
            clinical.stats.shapiro = original

    def test_input_rejects_duplicate_ids_unknown_categories_and_nonfinite(self):
        import tempfile
        text = clinical.DATA.read_text(encoding="utf-8")
        cases = [text.replace("SIM002", "SIM001"), text.replace(",F,", ",X,", 1),
                 text.replace(",A,", ",Z,", 1)]
        lines = text.splitlines(); fields = lines[1].split(","); fields[2] = "NaN"
        cases.append("\n".join([lines[0], ",".join(fields)] + lines[2:]))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid-inputv2.0.csv"
            for bad in cases:
                path.write_text(bad, encoding="utf-8")
                with self.assertRaises(ValueError):
                    clinical.load_data(path)

    def test_r_python_independent_crosscheck(self):
        process = subprocess.run(["Rscript", "examples/r/clinical-crosscheckv2.0.R"], cwd=ROOT,
                                 capture_output=True, text=True, check=True)
        actual = {row["key"]: float(row["value"]) for row in csv.DictReader(io.StringIO(process.stdout))}
        expected = leaves({k: self.result[k] for k in ("groupN", "table1", "primary", "diagnostics")})
        self.assertEqual(set(actual), set(expected))
        for key, value in actual.items():
            # Shapiro implementations differ very slightly in their approximations.
            tolerance = 1e-6 if ".shapiro" in key else 1e-9
            self.assertTrue(math.isclose(value, expected[key], rel_tol=tolerance, abs_tol=1e-9), f"{key}: R={value}, Python={expected[key]}")
        print(f"R/Python clinical cross-check: {len(actual)} values agree")


if __name__ == "__main__":
    unittest.main()
