"""Reject conflating material checks with numerical/expert/human validation."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('register',ROOT/'scripts/案例状态v2.2.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
b=json.loads(m.BUNDLE.read_text());l=json.loads(m.LONG.read_text())
class States(unittest.TestCase):
 def test_six_axes_with_pending_expert_human_and_ai(self):
  r=m.derive(b,l);m.validate(r,b,l)
  self.assertEqual(len(r['cases']),6)
  for row in r['cases']:
   for key in ['独立专家审阅','真人试用']:self.assertEqual(row['statuses'][key]['state'],'待核查')
  self.assertEqual(r['ai']['state'],'待核查')
 def test_false_expert_completion_is_rejected(self):
  r=m.derive(b,l);r['cases'][0]['statuses']['独立专家审阅']['state']='已通过'
  with self.assertRaises(ValueError):m.validate(r,b,l)
 def test_materials_cannot_promote_unexecuted_paper(self):
  r=m.derive(b,l);row=next(x for x in r['cases'] if x['id']=='birthweight')
  self.assertEqual(row['statuses']['数值对照']['state'],'待核查')
  row['statuses']['代码运行']['state']='已运行'
  with self.assertRaises(ValueError):m.validate(r,b,l)
 def test_replay_differences_and_author_failure_remain_explicit(self):
  r=m.derive(b,l);row=next(x for x in r['cases'] if x['id']=='medplot')
  self.assertEqual(row['statuses']['数值对照']['state'],'差异保留');self.assertIn('5 差异',row['statuses']['数值对照']['detail'])
  self.assertIn('原函数报错',row['statuses']['代码运行']['detail'])
 def test_survey_n_and_ci_algorithm_differences_come_from_result(self):
  x=copy.deepcopy(b);x['cases']['nhanes']['denominators']['analyzed']=123
  r=m.derive(x,l);row=next(v for v in r['cases'] if v['id']=='nhanes')
  self.assertIn('n=123',row['statuses']['数值对照']['detail']);self.assertIn('16/32',row['statuses']['数值对照']['detail'])
if __name__=='__main__':unittest.main()
