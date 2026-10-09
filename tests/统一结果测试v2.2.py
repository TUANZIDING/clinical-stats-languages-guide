"""Offline contract / presentation / drift tests. No fitting or package downloads."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("results",ROOT / "scripts/统一结果v2.2.py")
results = importlib.util.module_from_spec(spec)
spec.loader.exec_module(results)


class ResultContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = results.assemble()

    def test_snapshot_import_never_claims_a_fresh_run(self):
        for case in self.snapshot["cases"].values():
            self.assertEqual(case["execution"]["kind"],"snapshot-import")
            self.assertIsNone(case["execution"]["computedAt"])
        self.assertIn("not recorded",self.snapshot["cases"]["small"]["environment"]["analysis"]["status"])

    def test_population_outcome_and_variable_denominators_stay_distinct(self):
        c = self.snapshot["cases"]["clinical"]
        self.assertEqual((c["denominators"]["eligible"],c["denominators"]["A"],c["denominators"]["B"]),(96,45,43))
        self.assertEqual((c["missing"]["A"],c["missing"]["B"]),(3,5))
        s = next(x for x in c["statistics"] if x["variable"]=="sex" and x["group"]=="A" and x["level"]=="F" and x["statName"]=="percent")
        self.assertEqual(s["denominator"],47)
        self.assertNotEqual(s["denominator"],c["denominators"]["A"])

    def test_required_provenance_cannot_be_omitted(self):
        for field in ["data","code","population","estimand","direction","missing","diagnostics","warnings","environment"]:
            b = copy.deepcopy(self.snapshot)
            del b["cases"]["clinical"][field]
            with self.assertRaises(ValueError): results.validate(b)

    def test_interval_algorithms_and_both_paper_variants_survive(self):
        b = copy.deepcopy(self.snapshot)
        c = b["cases"]["nhanes"]
        self.assertEqual(len(c["estimates"]),16)
        e = c["estimates"][0]
        self.assertIn("正态 Wald",e["ci"]["algorithm"])
        self.assertNotEqual(e["ci"]["lower"],e["ciVariants"]["currentDefault"]["lower"])
        self.assertEqual(c["execution"]["comparison"]["passed"],72)
        self.assertEqual(c["execution"]["comparison"]["currentDefault"]["passed"],16)
        self.assertIn("not executed",c["code"]["authorCode"]["status"])
        del c["estimates"][0]["ciVariants"]
        with self.assertRaises(ValueError): results.validate(b)

    def test_nonfinite_or_reversed_ci_and_missing_algorithm_are_rejected(self):
        for changes in [{"lower":float("nan")},{"upper":-100},{"algorithm":""},{"level":.9}]:
            b = copy.deepcopy(self.snapshot)
            b["cases"]["small"]["estimates"][0]["ci"].update(changes)
            with self.assertRaises(ValueError): results.validate(b)

    def test_count_contradiction_and_duplicate_statistic_keys_are_rejected(self):
        for mode in ["count","duplicate"]:
            b = copy.deepcopy(self.snapshot)
            c = b["cases"]["clinical"]
            if mode=="count": c["denominators"]["analyzed"] = 96
            else: c["statistics"].append(c["statistics"][0])
            with self.assertRaises(ValueError): results.validate(b)

    def test_text_and_caption_follow_the_object_not_copied_numbers(self):
        b = copy.deepcopy(self.snapshot)
        b["cases"]["clinical"]["estimates"][0]["value"] = 9.63
        view = results.views(b)["clinical"]
        self.assertEqual(view["primary"]["difference"],9.63)
        self.assertIn("9.63",view["report"]["results"])
        self.assertIn("9.63",view["report"]["legend"])
        self.assertIn("9.63",results.report(b))

    def test_snapshot_diagnostics_do_not_become_method_approval(self):
        c = self.snapshot["cases"]["clinical"]
        self.assertEqual(c["diagnostics"]["status"],"imported legacy diagnostic values")
        self.assertIn("do not switch",c["diagnostics"]["routing"])
        self.assertTrue(c["diagnostics"]["notExecuted"])
        self.assertFalse(self.snapshot["cases"]["nhanes"]["diagnostics"]["executed"])

    def test_generated_view_drift_is_detected_without_recomputation(self):
        with tempfile.TemporaryDirectory(prefix="结果测试v2.2-",dir=ROOT / "build") as folder:
            dest = Path(folder)
            results.render(self.snapshot,dest,figures=False)
            results.check(self.snapshot,dest)
            (dest / results.VIEW).write_text("window.RESULT_VIEW = {};\n",encoding="utf-8")
            with self.assertRaisesRegex(ValueError,"drift"): results.check(self.snapshot,dest)

    def test_source_version_drift_cannot_be_silently_relabelled(self):
        for scope in ["generator", "analysis"]:
            b = copy.deepcopy(self.snapshot)
            source = b["code"][0] if scope=="generator" else b["cases"]["clinical"]["code"]["files"][0]
            source["sha256"] = "0" * 64
            with tempfile.TemporaryDirectory(prefix="来源测试v2.2-",dir=ROOT / "build") as folder:
                dest = Path(folder)
                results.render(b,dest,figures=False)
                with self.assertRaisesRegex(ValueError,"Implementation / lock drift"): results.check(b,dest)


if __name__ == "__main__":
    unittest.main()
