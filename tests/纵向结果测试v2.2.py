"""Result-contract tests; no patient file, R fit or AI invocation."""
import copy
import importlib.util
import json
import unittest
import subprocess
import sys
from unittest.mock import patch
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('longitudinalv22',ROOT/'scripts/纵向结果v2.2.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
RECORD=json.loads(module.RESULT.read_text())

class Contract(unittest.TestCase):
    def test_honest_differences_pass_snapshot_contract(self):
        counts=module.validate(RECORD)
        self.assertEqual(counts['DIFFERENCE'],5)
        self.assertEqual(counts['MATCH'],22)

    def test_difference_cannot_be_reclassified_as_match(self):
        record=copy.deepcopy(RECORD)
        next(x for x in record['comparison'] if x['status']=='DIFFERENCE')['status']='MATCH'
        with self.assertRaises(ValueError):module.validate(record)

    def test_wrong_visit_denominator_rejected(self):
        record=copy.deepcopy(RECORD);record['denominators']['absentVisits']=0
        with self.assertRaises(ValueError):module.validate(record)

    def test_compatibility_cannot_be_relabeled_as_original_success(self):
        record=copy.deepcopy(RECORD);record['authorRuns']['continuousUnmodified']['error']=None
        with self.assertRaises(ValueError):module.validate(record)

    def test_changed_statistic_cannot_desynchronize_report_from_actual_comparison(self):
        record=copy.deepcopy(RECORD);record['statistics']['logistic14']['estimate']=2
        with self.assertRaises(ValueError):module.validate(record)

    def test_freeze_drift_stops_check(self):
        real=module.sha
        with patch.object(module,'sha',side_effect=lambda p:'changed' if p==module.TARGETS else real(p)):
            with self.assertRaises(ValueError):module.validate(RECORD)

    def test_optimized_python_retains_denominator_and_difference_guards(self):
        code = """import copy, importlib.util, json, sys
s=importlib.util.spec_from_file_location('audit',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=json.loads(m.RESULT.read_text()); rejected=0
for kind in ('denominator','difference'):
 x=copy.deepcopy(r)
 if kind=='denominator': x['denominators']['absentVisits']=0
 else: next(row for row in x['comparison'] if row['status']=='DIFFERENCE')['status']='MATCH'
 try: m.validate(x)
 except ValueError: rejected+=1
if rejected!=2: raise SystemExit('Optimized integrity checks were bypassed')
print('2 optimized tampering cases rejected')
"""
        result=subprocess.run([sys.executable,'-B','-O','-c',code,str(ROOT/'scripts/纵向结果v2.2.py')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIn('2 optimized tampering cases rejected',result.stdout)

    def test_two_different_estimands_are_rendered_separately(self):
        v=module.view(RECORD)
        self.assertIn('β',v['linear']);self.assertIn('条件 OR',v['binary'])
        changed=copy.deepcopy(RECORD);changed['statistics']['linear14']['estimate']=.25
        self.assertIn('0.25000',module.view(changed)['linear'])
        self.assertIn('22/27',v['summary']);self.assertIn('5 项差异',v['summary'])

if __name__=='__main__':unittest.main()
