#!/usr/bin/env python3
import os
import re
import hashlib
import csv
from pathlib import Path
from collections import defaultdict
from functools import cmp_to_key
from difflib import SequenceMatcher

# === CONFIG ===
CSS_ROOT = Path(".")
OUTPUT_SHARED = Path("shared.css")
OUTPUT_CSV = Path("refactor-suggestions.csv")
OUTPUT_NEAR = Path("near-duplicates.csv")

# similarity threshold for near-duplicates (0.9 = 90%)
NEAR_DUP_THRESHOLD = 0.9

# Path priorities: lower number = more preferred canonical
PATH_PRIORITY = {
    "components/": 1,
    "base/": 1,
    "layout/": 2,
    "utilities/": 2,
    "features/": 3,
    "pages/": 4,
}

# === HELPERS ===

def normalize_declarations(decl_block: str) -> str:
    # remove comments
    decl_block = re.sub(r'/\*.*?\*/', '', decl_block, flags=re.DOTALL)
    # split into properties
    props = [p.strip() for p in decl_block.strip().strip('{}').split(';') if p.strip()]
    props = sorted(props)
    return ";\n  ".join(props) + (';' if props else '')

def hash_declarations(norm: str) -> str:
    return hashlib.sha256(norm.encode('utf-8')).hexdigest()

def score_path(p: Path):
    # returns tuple to compare: (priority, depth, path string)
    s = 99
    sp = str(p).replace("\\", "/")
    for prefix, pr in PATH_PRIORITY.items():
        if prefix in sp:
            s = pr
            break
    depth = len(p.parts)
    return (s, depth, sp)

def compare_score(a: tuple, b: tuple):
    return -1 if a < b else (1 if a > b else 0)

def parse_css_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="ignore")
    # naive rule capture: selector { ... }
    pattern = re.compile(r'([^{]+)\{([^}]+)\}', flags=re.MULTILINE)
    entries = []
    for match in pattern.finditer(text):
        selector = match.group(1).strip()
        decl = match.group(2).strip()
        norm = normalize_declarations(decl)
        h = hash_declarations(norm)
        entries.append({
            "selector": selector,
            "normalized": norm,
            "hash": h,
            "file": path,
        })
    return entries

def find_near_duplicates(entries):
    # Compare all normalized declarations pairwise (could be heavy, but dataset is modest)
    near_pairs = []
    seen = set()
    for i in range(len(entries)):
        for j in range(i+1, len(entries)):
            a = entries[i]
            b = entries[j]
            if a["hash"] == b["hash"]:
                continue  # exact duplicate already handled
            key = tuple(sorted([(a["selector"], str(a["file"])), (b["selector"], str(b["file"]))]))
            if key in seen:
                continue
            seen.add(key)
            sm = SequenceMatcher(a=a["normalized"], b=b["normalized"])
            ratio = sm.ratio()
            if ratio >= NEAR_DUP_THRESHOLD:
                near_pairs.append({
                    "selector_a": a["selector"],
                    "file_a": str(a["file"]),
                    "selector_b": b["selector"],
                    "file_b": str(b["file"]),
                    "similarity": round(ratio, 3),
                    "common_subsequence": sm.get_matching_blocks(),  # for deeper inspection
                })
    return near_pairs

# === MAIN ===

def main():
    print("Scanning CSS files...")
    all_entries = []
    for root, _, files in os.walk(CSS_ROOT):
        for f in files:
            if f.endswith(".css"):
                p = Path(root) / f
                all_entries.extend(parse_css_file(p))

    # Group by exact normalized declaration (hash)
    groups = defaultdict(list)
    for e in all_entries:
        groups[e["hash"]].append(e)

    shared_lines = []
    csv_rows = []
    shared_count = 0

    print("Processing exact duplicate groups...")
    for h, items in groups.items():
        if len(items) <= 1:
            continue  # not duplicated
        shared_count += 1
        shared_class = f".shared-{shared_count}"
        norm_decl = items[0]["normalized"]

        # Decide canonical entry
        canonical = min(items, key=lambda it: score_path(it["file"]))
        canonical_selector = canonical["selector"]
        canonical_file = canonical["file"]

        # Build shared class
        shared_lines.append(f"{shared_class} {{\n  {norm_decl}\n}}\n\n")

        for item in items:
            if item["selector"] == canonical_selector and item["file"] == canonical_file:
                action = "keep full block (canonical)"
            else:
                action = f"replace/remove and use {shared_class}"
            csv_rows.append({
                "shared_class": shared_class,
                "canonical_selector": canonical_selector,
                "canonical_file": str(canonical_file),
                "other_selector": item["selector"],
                "other_file": str(item["file"]),
                "action": action,
            })

    # Write shared.css
    if shared_lines:
        with open(OUTPUT_SHARED, "w", encoding="utf-8") as f:
            f.writelines(shared_lines)
        print(f"Written shared classes to {OUTPUT_SHARED}")
    else:
        print("No exact duplicates found; skipping shared.css")

    # Write refactor-suggestions.csv
    if csv_rows:
        headers = ["shared_class", "canonical_selector", "canonical_file", "other_selector", "other_file", "action"]
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as cf:
            writer = csv.DictWriter(cf, fieldnames=headers)
            writer.writeheader()
            for row in csv_rows:
                writer.writerow(row)
        print(f"Written refactor plan to {OUTPUT_CSV}")
    else:
        print("No refactor suggestions (no duplicates).")

    # Near-duplicates
    print("Scanning for near-duplicates...")
    near = find_near_duplicates(all_entries)
    if near:
        with open(OUTPUT_NEAR, "w", newline="", encoding="utf-8") as nf:
            fieldnames = ["selector_a", "file_a", "selector_b", "file_b", "similarity"]
            writer = csv.DictWriter(nf, fieldnames=fieldnames)
            writer.writeheader()
            for pair in near:
                writer.writerow({
                    "selector_a": pair["selector_a"],
                    "file_a": pair["file_a"],
                    "selector_b": pair["selector_b"],
                    "file_b": pair["file_b"],
                    "similarity": pair["similarity"],
                })
        print(f"Written near-duplicates to {OUTPUT_NEAR} (threshold {NEAR_DUP_THRESHOLD})")
    else:
        print("No near-duplicates above threshold.")

    print(f"Done. Found {shared_count} exact duplicate groups.")

if __name__ == "__main__":
    main()
