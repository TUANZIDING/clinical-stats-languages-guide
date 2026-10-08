"""Same synthetic data, A-B, two-sided Welch test. No patient analysis."""
import csv
import json
import math
from pathlib import Path
import numpy as np
from scipy import stats


def analyze(path=None):
    path = Path(path) if path else Path(__file__).resolve().parents[2] / 'data/synthetic-independent.csv'
    with path.open(encoding='utf-8', newline='') as handle:
        rows = list(csv.DictReader(handle))
    if len({r['id'] for r in rows}) != len(rows):
        raise ValueError('Each synthetic ID must be unique: this example assumes independent observations.')
    if {r['group'] for r in rows} != {'A', 'B'}:
        raise ValueError('Expected exactly groups A and B.')
    groups = {g: np.array([float(r['value']) for r in rows if r['group'] == g]) for g in ('A', 'B')}
    if any(len(v) < 2 or not np.isfinite(v).all() for v in groups.values()):
        raise ValueError('Missing/non-finite values or insufficient data; no silent deletion.')
    a, b = groups['A'], groups['B']
    # SciPy defaults to equal_var=True; explicit False gives Welch.
    result = stats.ttest_ind(a, b, equal_var=False, alternative='two-sided', nan_policy='raise')
    interval = result.confidence_interval(confidence_level=0.95)
    answer = dict(n_a=len(a), n_b=len(b), mean_a=float(a.mean()), mean_b=float(b.mean()),
                  difference=float(a.mean()-b.mean()), statistic=float(result.statistic),
                  df=float(result.df), p_value=float(result.pvalue),
                  ci_low=float(interval.low), ci_high=float(interval.high))
    if not all(math.isfinite(v) for v in answer.values()):
        raise ValueError('Undefined test result; inspect variance and data.')
    return answer


if __name__ == '__main__':
    print(json.dumps(analyze(), indent=2))
