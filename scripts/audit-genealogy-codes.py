#!/usr/bin/env python3
"""Read-only audit of public genealogy identifiers. Outputs counts, never names."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
BRANCHES = ("jurina", "petrova", "antina", "matina", "filipova")
FILES = ("jurinagrana", "petrovagrana", "antinagrana", "matinagrana", "filipovagrana")
CODE = re.compile(r"^\d+(?:\.\d+)*(?:-[A-Z]+(?:-\d+)?)?$")


class Codes(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.all_codes = []
        self.heading_codes = []
        self.family_codes = []
        self.in_heading = 0
        self.in_family = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.in_heading += 1
        if "family-code-list" in a.get("class", "").split():
            self.in_family += 1
        code = a.get("data-person-code")
        if code:
            self.all_codes.append(code)
            if self.in_heading:
                self.heading_codes.append(code)
        if a.get("data-family-code"):
            self.family_codes.append(a["data-family-code"])

    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.in_heading = max(0, self.in_heading - 1)
        if tag in ("p", "div", "section") and self.in_family:
            self.in_family -= 1


def parse(file):
    page = Codes()
    page.feed(file.read_text(encoding="utf-8-sig"))
    page.close()
    return page


def audit():
    failures = []
    total = set()
    for stem in FILES:
        hr_path = ROOT / (stem + ".html")
        en_path = ROOT / (stem + "-en.html")
        if not hr_path.is_file() or not en_path.is_file():
            failures.append(stem + ": missing HR or EN page")
            continue
        hr, en = parse(hr_path), parse(en_path)
        hr_set, en_set = set(hr.all_codes), set(en.all_codes)
        total.update(hr_set)
        print(f"{stem}: HR unique={len(hr_set)}, EN unique={len(en_set)}, "
              f"HR occurrences={len(hr.all_codes)}, EN occurrences={len(en.all_codes)}, "
              f"HR headings={len(set(hr.heading_codes))}")
        if hr_set != en_set:
            failures.append(f"{stem}: HR/EN identifier mismatch "
                            f"(HR-only={len(hr_set - en_set)}, EN-only={len(en_set - hr_set)})")
        for lang, page in (("HR", hr), ("EN", en)):
            invalid = sum(not CODE.fullmatch(code) for code in set(page.all_codes + page.family_codes))
            duplicated_headings = sum(n > 1 for n in Counter(page.heading_codes).values())
            if invalid:
                failures.append(f"{stem} {lang}: {invalid} malformed identifiers")
            if duplicated_headings:
                failures.append(f"{stem} {lang}: {duplicated_headings} duplicated heading identifiers")
    print(f"All HR branches: {len(total)} distinct identifiers (including repeated ancestors)")
    print(f"Audit findings: {len(failures)}")
    for failure in failures:
        print("REVIEW:", failure)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(audit())
