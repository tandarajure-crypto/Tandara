#!/usr/bin/env python3
"""Structural regression check for diagram controls; no data is printed or changed.
This does not replace real interaction testing in a browser.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import sys

EXPECTED = ("box1", "box2a", "box2b", "box2c", "box2d")
REQUIRED_IDS = {
    "diagramData", "treeSvg", "viewport", "links", "nodesLayer",
    "workspace", "diagramStatus", "searchResults", "searchResultsTitle",
    "searchResultItems", "searchCode", "searchPerson", "searchFather",
    "searchMother", "personDetails", "personDetailsClose",
    "personDetailsName", "personDetailsCode", "personDetailsDates",
    "personDetailsParents", "personDetailsText", "findBtn",
    "searchResultsClose", "expandAll", "collapse", "threeLevels",
    "fit", "zoomIn", "zoomOut", "fullscreenDiagram", "printDiagram",
    "diagramHeader", "headerCollapse"
}

class Diagram(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.scripts = []
        self.lang = ""
        self.json_mode = False
        self.json_data = []
        self.blocks = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang", "")
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "script":
            if attrs.get("src"):
                self.scripts.append(attrs["src"])
            if attrs.get("id") == "diagramData" and attrs.get("type") == "application/json":
                self.json_mode = True
                self.json_data = []
    def handle_data(self, data):
        if self.json_mode:
            self.json_data.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self.json_mode:
            self.blocks.append("".join(self.json_data))
            self.json_mode = False

failures = []
checked = 0
for base in EXPECTED:
    for suffix, expected_lang in (("", "hr"), ("-en", "en")):
        path = Path(base + suffix + ".html")
        if not path.is_file():
            failures.append(f"{path.name}: missing diagram file")
            continue
        page = Diagram()
        try:
            page.feed(path.read_text(encoding="utf-8-sig"))
            page.close()
        except (OSError, UnicodeError, ValueError):
            failures.append(f"{path.name}: unreadable document")
            continue
        missing = REQUIRED_IDS - page.ids
        if missing:
            failures.append(f"{path.name}: {len(missing)} missing engine control IDs")
        if not any("tandara-diagram-engine.js" in src for src in page.scripts):
            failures.append(f"{path.name}: diagram engine script missing")
        if not page.lang.lower().startswith(expected_lang):
            failures.append(f"{path.name}: HTML language mismatch")
        if len(page.blocks) != 1:
            failures.append(f"{path.name}: expected one embedded diagramData JSON block")
        else:
            try:
                data = json.loads(page.blocks[0])
                if not isinstance(data, dict) or not isinstance(data.get("primary"), dict):
                    failures.append(f"{path.name}: diagram's primary data structure is invalid")
            except (ValueError, TypeError):
                failures.append(f"{path.name}: diagramData cannot be parsed")
        checked += 1

print(f"Diagram controls contract: checked {checked} diagram pages")
print(f"Diagram controls contract: {len(failures)} failures")
for finding in failures:
    print("ERROR:", finding)
sys.exit(1 if failures else 0)
