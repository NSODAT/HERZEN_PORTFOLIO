#!/usr/bin/env python3
"""Generate portfolio.json from HERZEN_PORTFOLIO_CONTENT (folder links per subject)."""

import json
import urllib.parse
from collections import defaultdict
from pathlib import Path

REPO = "NSODAT/HERZEN_PORTFOLIO_CONTENT"
BRANCH = "main"
GITHUB_TREE = f"https://github.com/{REPO}/tree/{BRANCH}/"

COURSE_SEMESTER = {
    "1 курс": "1–2 семестр",
    "2 курс": "3–4 семестр",
    "3 курс": "5–6 семестр",
    "4 курс": "7–8 семестр",
}

CATEGORY_ORDER = [
    ("internship", ["практик", "производствен", "учебн", "преддиплом"]),
    ("diploma", ["дипломная работа", "вкр", "выпускн", "дипломн"]),
    ("coursework", ["курсов", "курсовая", "курсовой"]),
]

SKIP_SUBJECTS = {"_root"}

ROOT = Path(__file__).resolve().parents[1]
TREE_PATH = ROOT / "content-tree.json"
OUT_PATH = ROOT / "data" / "portfolio.json"
PROFILE_PATH = ROOT / "data" / "portfolio.json"


def folder_url(course: str, subject: str) -> str:
    path = f"{course}/{subject}"
    encoded = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    return GITHUB_TREE + encoded


def folder_link(course: str, subject: str) -> dict:
    return {"type": "external", "url": folder_url(course, subject)}


def categorize_subject(name: str) -> str:
    n = name.lower()
    if "преддиплом" in n:
        return "diploma"
    if "курсов" in n:
        return "coursework"
    if "дипломная работа" in n or ("вкр" in n and "практик" not in n):
        return "diploma"
    for cat, keywords in CATEGORY_ORDER:
        if any(k in n for k in keywords):
            return cat
    if "диплом" in n and "практик" not in n:
        return "diploma"
    return "lab"


def subject_sort_key(course: str, subject: str) -> tuple:
    course_idx = list(COURSE_SEMESTER).index(course) if course in COURSE_SEMESTER else 99
    return (course_idx, subject.lower())


def build_folder_item(
    subject: str,
    course: str,
    semester: str,
    file_count: int,
    tag: str | None = None,
) -> dict:
    item = {
        "title": subject,
        "semester": semester,
        "course": course,
        "description": f"{file_count} файлов в репозитории",
        "link": folder_link(course, subject),
    }
    if tag:
        item["tags"] = [tag]
    return item


def add_unique_folder(collection: list, item: dict) -> None:
    url = item.get("link", {}).get("url", "").lower()
    if url and any(x.get("link", {}).get("url", "").lower() == url for x in collection):
        return
    collection.append(item)


def main():
    if not TREE_PATH.exists():
        raise SystemExit(
            f"Missing {TREE_PATH.name}. Download:\n"
            "  Invoke-WebRequest -Uri "
            f'"https://api.github.com/repos/{REPO}/git/trees/main?recursive=1" '
            f"-OutFile {TREE_PATH.name}"
        )

    with open(TREE_PATH, encoding="utf-8") as f:
        data = json.load(f)

    files = [t["path"] for t in data.get("tree", []) if t["type"] == "blob"]

    # course -> subject -> file count (merge duplicate folder names by lowercase key)
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    canonical: dict[str, dict[str, str]] = defaultdict(dict)

    for path in files:
        parts = path.split("/")
        if len(parts) < 3:
            continue
        course, raw_subject = parts[0], parts[1]
        key = raw_subject.strip().lower()
        if key in SKIP_SUBJECTS or key == "readme.md":
            continue
        if key not in canonical[course]:
            canonical[course][key] = raw_subject
        subject = canonical[course][key]
        counts[course][subject] += 1

    diploma_projects = []
    coursework_projects = []
    internship_projects = []
    lab_subjects = []

    entries = []
    for course in counts:
        for subject in counts[course]:
            entries.append((course, subject, counts[course][subject]))

    entries.sort(key=lambda x: subject_sort_key(x[0], x[1]))

    for course, subject, file_count in entries:
        semester = COURSE_SEMESTER.get(course, course)
        cat = categorize_subject(subject)

        if cat == "diploma":
            add_unique_folder(diploma_projects, build_folder_item(subject, course, semester, file_count, "diploma"))
        elif cat == "coursework":
            add_unique_folder(coursework_projects, build_folder_item(subject, course, semester, file_count, "coursework"))
        elif cat == "internship":
            add_unique_folder(internship_projects, build_folder_item(subject, course, semester, file_count, "internship"))
        else:
            lab_subjects.append({
                "title": subject,
                "semester": semester,
                "course": course,
                "description": f"{file_count} файлов в папке",
                "link": folder_link(course, subject),
            })

    with open(PROFILE_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    categories = []
    if diploma_projects:
        categories.append({
            "id": "diploma",
            "title": "Дипломная работа",
            "icon": "🎓",
            "description": "Материалы по курсам и предметам — папки в HERZEN_PORTFOLIO_CONTENT.",
            "projects": diploma_projects,
        })
    if coursework_projects:
        categories.append({
            "id": "coursework",
            "title": "Курсовые работы",
            "icon": "📚",
            "description": "Курсовые по дисциплинам — папки на GitHub.",
            "projects": coursework_projects,
        })
    if internship_projects:
        categories.append({
            "id": "internship",
            "title": "Практики",
            "icon": "💼",
            "description": "Отчёты и материалы практик — папки на GitHub.",
            "projects": internship_projects,
        })
    if lab_subjects:
        categories.append({
            "id": "lab",
            "title": "Лабораторные и учебные работы",
            "icon": "🔬",
            "description": "Материалы по предметам и курсам — папки в HERZEN_PORTFOLIO_CONTENT.",
            "subjects": lab_subjects,
        })

    output = {
        "meta": existing.get("meta", {}),
        "profile": existing.get("profile", {}),
        "contacts": existing.get("contacts", {}),
        "categories": categories,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Written {OUT_PATH}")
    print(f"  diploma folders: {len(diploma_projects)}")
    print(f"  coursework folders: {len(coursework_projects)}")
    print(f"  internship folders: {len(internship_projects)}")
    print(f"  lab subjects: {len(lab_subjects)}")


if __name__ == "__main__":
    main()
