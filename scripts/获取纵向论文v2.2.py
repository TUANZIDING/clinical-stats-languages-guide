"""Retrieve the selected CC-BY paper/SI and unmodified GPL-3 author artifacts.

No analysis, login, controlled-access data, or repository upload. Requires requests.
Original materials stay in ignored build/. Names map back to immutable source paths.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build/纵向论文材料v2.2"
COMMIT = "b81c02788e9a223505ac8dc7b52fd9a641669b2d"
DOI = "10.1371/journal.pone.0121760"
RAW = f"https://raw.githubusercontent.com/crtahlin/medplot/{COMMIT}/"
FILES = {
    "作者包说明v2.2.txt": (RAW+"DESCRIPTION", "GPL-3", "DESCRIPTION"),
    "作者公共数据v2.2.tsv": (RAW+"inst/extdata/DataEM.txt", "GPL-3 package distribution; no separate data license found", "inst/extdata/DataEM.txt"),
    "作者混合模型v2.2.R": (RAW+"R/PlotSymptomsMixedModel.R", "GPL-3", "R/PlotSymptomsMixedModel.R"),
    "作者变量类型v2.2.R": (RAW+"R/PlotSymptomsDetermineTypeofVariable.R", "GPL-3", "R/PlotSymptomsDetermineTypeofVariable.R"),
    "作者数据概况v2.2.R": (RAW+"R/PlotSymptomsTabDataSummary.R", "GPL-3", "R/PlotSymptomsTabDataSummary.R"),
    "作者许可v2.2.txt": (RAW+"inst/doc/gpl-3.0.txt", "GPL-3", "inst/doc/gpl-3.0.txt"),
    "论文网页v2.2.html": (f"https://journals.plos.org/plosone/article?id={DOI}", "CC-BY-4.0 article", "publisher main text"),
    "论文正文v2.2.pdf": (f"https://journals.plos.org/plosone/article/file?id={DOI}&type=printable", "CC-BY-4.0 article", "publisher printable"),
}
for i in range(1,20):
    name = ["补充文本1", "补充表1", "补充表2"][i-1] if i<=3 else f"补充图{i-3}"
    ext = "pdf" if i<=3 else "tif"
    FILES[f"{name}v2.2.{ext}"] = (f"https://journals.plos.org/plosone/article/file?type=supplementary&id={DOI}.s{i:03}", "CC-BY-4.0 article supplementary material; attribution required", f"{DOI}.s{i:03}")

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = "clinical-stats-languages-guide/2.2 public-paper-audit"
    items = []
    for name,(url,license_name,source_path) in FILES.items():
        path = OUT/name
        if not path.exists():
            response = session.get(url,timeout=120)
            response.raise_for_status()
            content = response.content
            if name.endswith(".pdf") and not content.startswith(b"%PDF"):
                raise ValueError(f"Not a PDF: {name}")
            if name.endswith(".tif") and content[:4] not in (b"II*\x00",b"MM\x00*"):
                raise ValueError(f"Not a TIFF: {name}")
            path.write_bytes(content)
        content = path.read_bytes()
        items.append(dict(file=name,url=url,sourcePath=source_path,bytes=len(content),
                          sha256=hashlib.sha256(content).hexdigest(),license=license_name,
                          publicRedistribution="not performed; original materials remain in ignored build/"))
        print(name,len(content),flush=True)
    for name,url in {
        "作者提交v2.2.json":f"https://api.github.com/repos/crtahlin/medplot/commits/{COMMIT}",
        "作者文件树v2.2.json":f"https://api.github.com/repos/crtahlin/medplot/git/trees/{COMMIT}?recursive=1",
    }.items():
        path=OUT/name
        if not path.exists():
            r=session.get(url,timeout=60); r.raise_for_status(); path.write_text(r.text)
        items.append(dict(file=name,url=url,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),license="GitHub repository metadata"))
    manifest=dict(retrievedAt=datetime.now(timezone.utc).isoformat(),authorCommit=COMMIT,
                  attribution="Ahlin Č, Stupica D, Strle F, Lusa L (2015), DOI 10.1371/journal.pone.0121760; medplot package author Črt Ahlin with Lara Lusa",files=items,
                  limitation="Retrieval and file hashes do not establish numerical reproduction or methodological adequacy. Data license is package GPL-3, not an independently stated dataset CC license.")
    (OUT/"材料清单v2.2.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")

if __name__ == "__main__":
    main()
