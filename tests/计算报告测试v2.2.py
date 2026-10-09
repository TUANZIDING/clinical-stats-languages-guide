"""Snapshot integrity and tamper tests; no R calculation happens in this offline suite."""
import contextlib
import copy
import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('report',ROOT/'scripts/计算报告v2.2.py')
report=importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.record=json.loads(report.SAVED.read_text())

    def test_snapshot_matches_frozen_values_and_page(self):
        self.assertEqual(len(report.validate(self.record)),10)
        self.assertEqual(report.PAGE.read_text(),report.render(self.record))
        self.assertIn('本页是该次保存报告',report.render(self.record))

    def test_changed_number_is_rejected_not_fixed(self):
        self.record['result']['difference']+=0.01
        with self.assertRaisesRegex(ValueError,'R/reference difference'):
            report.validate(self.record)
        self.assertNotEqual(self.record['result']['difference'],json.loads(report.REFERENCE.read_text())['difference'])

    def test_code_or_data_hash_drift_is_rejected(self):
        for key in ('data/synthetic-independent.csv','examples/r/welch_demo.R','scripts/计算报告v2.2.py'):
            r=copy.deepcopy(self.record);r['sourceHashes'][key]='0'*64
            with self.assertRaisesRegex(ValueError,'hash drift'):report.validate(r)

    def test_missing_source_and_fake_execution_are_rejected(self):
        for mutate in (lambda r:r['sourceHashes'].pop('data/expected-results.json'),lambda r:r.update(kind='snapshot-import'),lambda r:r.update(direction='B-A')):
            r=copy.deepcopy(self.record);mutate(r)
            with self.assertRaises(ValueError):report.validate(r)

    def test_missing_nonfinite_result_cannot_render(self):
        for value in (None,float('nan'),float('inf'),True):
            r=copy.deepcopy(self.record);r['result']['ci_low']=value
            with self.assertRaises(ValueError):report.render(r)

    def test_offline_check_does_not_invoke_R(self):
        with patch.object(report,'compute',side_effect=AssertionError('unexpected calculation')),patch('sys.argv',['report','check']),contextlib.redirect_stdout(io.StringIO()) as captured:
            report.main()
        self.assertIn('snapshot only',captured.getvalue())

    def test_build_report_links_resolve_within_project(self):
        from html.parser import HTMLParser
        from urllib.parse import unquote,urlsplit
        class Links(HTMLParser):
            refs=[]
            def handle_starttag(self,tag,attrs):
                a=dict(attrs)
                if tag=='a':self.refs.append(a['href'])
        p=Links();p.feed(report.render(self.record,local=True))
        location=ROOT/'build/计算报告示范v2.2'
        for ref in p.refs:
            target=(location/unquote(urlsplit(ref).path)).resolve()
            self.assertTrue(target.is_relative_to(ROOT))
            if target.name==report.SAVED.name:
                # The run command creates this sibling. An offline fresh checkout has no build outputs.
                self.assertEqual(target,location/report.SAVED.name)
            else:
                self.assertTrue(target.exists(),ref)


if __name__=='__main__':
    unittest.main()
