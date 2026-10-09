#!/bin/sh
# Explicit online/material restoration + actual R fits. No publish operation.
set -eu
test -f data/纵向论文目标v2.2.json || { printf '%s\n' 'Run from the project root.' >&2; exit 1; }
command -v Rscript >/dev/null || { printf '%s\n' 'System R is required; renv does not install R.' >&2; exit 1; }
if test ! -x build/文献检索环境v2.2/bin/python; then
  python3 -m venv build/文献检索环境v2.2
fi
build/文献检索环境v2.2/bin/python -m pip install -r config/文献检索环境锁v2.2.txt
build/文献检索环境v2.2/bin/python scripts/获取纵向论文v2.2.py
PATH="$PWD/build/文献检索环境v2.2/bin:$PATH" Rscript --vanilla scripts/纵向环境恢复v2.2.R restore
Rscript --vanilla scripts/纵向论文复算v2.2.R
if test ! -x build/Python恢复环境v2.2/bin/python; then
  python3 -m venv build/Python恢复环境v2.2
fi
build/Python恢复环境v2.2/bin/python -m pip install -r config/Python环境锁v2.2.txt
build/Python恢复环境v2.2/bin/python scripts/纵向结果v2.2.py build build/纵向论文重跑v2.2/纵向计算结果v2.2.json
python3 -S scripts/纵向结果v2.2.py check
