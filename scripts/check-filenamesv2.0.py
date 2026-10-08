"""Enforce the owner's naming rule on files added after the v1 baseline."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = "84250e99a5523574a345356b8bcf9a0bf3b8864a"
def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().split("\0")

existing = set(git("ls-tree", "-r", "--name-only", "-z", BASE))
current = set(git("ls-files", "-z")) | set(git("ls-files", "--others", "--exclude-standard", "-z"))
new = sorted(p for p in current - existing if p and (ROOT / p).is_file())
bad = [p for p in new if "_" in Path(p).name or not re.search(r"v\d+\.\d+(?:\.\d+)?\.[^.]+$", Path(p).name)]
if bad:
    raise SystemExit("New filenames must use name + version + extension, without underscores:\n" + "\n".join(bad))
print(f"PASS: {len(new)} new filenames; legacy names retained.")
