"""Compare numerical implementations against the synthetic reference; no real data."""
import argparse
import importlib.util
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def compare(name, got, expected):
    for key, value in expected.items():
        if key not in got or not math.isclose(float(got[key]),value,rel_tol=1e-9,abs_tol=1e-10):
            raise AssertionError(f'{name}: mismatch in {key}: {got.get(key)} != {value}')
    print(f'{name}: all {len(expected)} values agree (relative tolerance 1e-9).')

def parse_lines(output):
    return {k:float(v) for k,v in (line.split('=',1) for line in output.splitlines() if '=' in line)}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--r',action='store_true')
    parser.add_argument('--cpp',type=Path)
    args=parser.parse_args()
    expected=json.loads((ROOT/'data/expected-results.json').read_text())
    spec=importlib.util.spec_from_file_location('welch_demo',ROOT/'examples/python/welch_demo.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    compare('Python / SciPy',module.analyze(),expected)
    if args.r:
        output=subprocess.check_output(['Rscript','examples/r/welch_demo.R'],cwd=ROOT,text=True)
        compare('R / stats',parse_lines(output),expected)
    if args.cpp:
        output=subprocess.check_output([str(args.cpp.resolve()),str(ROOT/'data/synthetic-independent.csv')],cwd=ROOT,text=True)
        compare('C++ / Boost',parse_lines(output),expected)
    print('Numerical agreement does not validate the research design or assumptions.')

if __name__=='__main__':main()
