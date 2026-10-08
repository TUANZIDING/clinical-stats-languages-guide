"""Fetch only the bounded CDC public-use files for two published NHANES cases.

No patient credentials, third-party executable code, or restricted files are used.
Run explicitly; ordinary project tests never download public participant records.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "build" / "papersv2.1"
FILES = [(year, component, suffix) for year, suffix in
         [(1999, ""), (2001, "_B"), (2003, "_C"), (2005, "_D"), (2007, "_E")]
         for component in ["DEMO", "VIX", "ECQ"]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Fetch 15 CDC public XPT files")
    args = parser.parse_args()
    if not args.download:
        parser.error("Use --download explicitly; the fetch is not part of offline tests.")
    CACHE.mkdir(parents=True, exist_ok=True)
    frozen_path = ROOT / "data" / "nhanes-source-manifestv2.1.json"
    frozen = {(f["year"], f["component"]): f["sha256"]
              for f in json.loads(frozen_path.read_text())["files"]} if frozen_path.exists() else {}
    records = []
    for year, component, suffix in FILES:
        url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{year}/DataFiles/{component}{suffix}.XPT"
        path = CACHE / f"{year}-{component.lower()}v2.1.xpt"
        cached = path.exists()
        if not cached:
            temporary = CACHE / f"{year}-{component.lower()}-partialv2.1.xpt"
            try:
                subprocess.run(["curl", "--silent", "--show-error", "--fail", "--location",
                                "--max-time", "60", "--retry", "1", "--output", str(temporary), url], check=True)
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
        blob = path.read_bytes()
        if not blob.startswith(b"HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!"):
            path.unlink()
            raise ValueError(f"{component} {year}: response is not a SAS transport file")
        digest = hashlib.sha256(blob).hexdigest()
        if (year, component) in frozen and digest != frozen[(year, component)]:
            raise ValueError(f"{component} {year}: source differs from the frozen SHA-256; investigate source drift before analysis")
        records.append(dict(year=year, component=component, url=url,
                            file=path.name, bytes=len(blob), sha256=digest))
        print(f"{year} {component}: {len(blob)} bytes ({'cache' if cached else 'download'})", flush=True)
    (CACHE / "nhanes-source-manifestv2.1.json").write_text(
        json.dumps(dict(source="CDC/NCHS NHANES public-use", files=records), indent=2) + "\n")


if __name__ == "__main__":
    main()
