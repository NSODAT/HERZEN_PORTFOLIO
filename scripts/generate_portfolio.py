#!/usr/bin/env python3
"""Generate portfolio.json from HERZEN_PORTFOLIO_CONTENT tree."""

import json
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

REPO = "NSODAT/HERZEN_PORTFOLIO_CONTENT"
BRANCH = "main"
GITHUB_BLOB = f"https://github.com/{REPO}/blob/{BRANCH}/"
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

SKIP_SUBJECTS = {"README.md", "_root"}
SKIP_FILE_NAMES = {
    "readme.md", "readme", ".ds_store", "thumbs.db", "desktop.ini",
    ".gitignore", "_config.yml",
}
SKIP_FILE_PATTERNS = [
    re.compile(r"\.pyc$", re.I),
    re.compile(r"__pycache__", re.I),
    re.compile(r"^\.", re.I),
]
SKIP_EXTENSIONS = {
    ".docx", ".doc", ".odt", ".xlsx", ".xls", ".pptx", ".ppt",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".mov",
    ".py", ".js", ".php", ".css", ".scss", ".yaml", ".yml",
    ".json", ".md", ".txt", ".archimate", ".bpm", ".potx",
}
PREFERRED_VIEW = {".pdf"}

ROOT = Path(__file__).resolve().parents[1]
TREE_PATH = ROOT / "content-tree.json"
OUT_PATH = ROOT / "data" / "portfolio.json"
PROFILE_PATH = ROOT / "data" / "portfolio.json"


def github_url(path: str) -> str:
    encoded = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    return GITHUB_BLOB + encoded


def link_for_path(path: str) -> dict:
    lower = path.lower()
    if lower.endswith(".pdf"):
        return {"type": "github", "url": github_url(path)}
    return {"type": "external", "url": github_url(path)}


DIPLOMA_FILE_KEYWORDS = ["вкр", "дипломная работа", "дипломн", "тезис", "выпускн"]


def categorize_subject(name: str) -> str:
    n = name.lower()
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


def is_diploma_file(filename: str) -> bool:
    n = filename.lower()
    return any(k in n for k in DIPLOMA_FILE_KEYWORDS)


def should_skip_file(filename: str) -> bool:
    low = filename.lower()
    if low in SKIP_FILE_NAMES:
        return True
    return any(p.search(filename) for p in SKIP_FILE_PATTERNS)


def clean_title(filename: str, subject: str) -> str:
    name = filename
    for ext in (".pdf", ".docx", ".doc", ".pptx", ".xlsx", ".py", ".mp4", ".png"):
        if name.lower().endswith(ext):
            name = name[: -len(ext)]
    prefixes = [
        r"^шульга[_\s]*",
        r"^шульга\.?\s*",
        re.escape(subject.lower()),
        r"^lr[\s._]*",
        r"^лр[\s._]*",
        r"^лабораторн\w*[\s._]*",
    ]
    low = name.lower()
    for p in prefixes:
        low = re.sub(p, "", low, flags=re.I)
    name = low.strip(" _-.")
    if not name:
        name = filename
    return name[:1].upper() + name[1:] if name else filename


def lab_sort_key(name: str):
    nums = re.findall(r"\d+(?:\.\d+)?", name)
    return [float(n) for n in nums] if nums else [9999]


def pick_viewable_file(paths: list[str]) -> str | None:
    pdfs = [p for p in paths if p.lower().endswith(".pdf")]
    if pdfs:
        return sorted(pdfs, key=lab_sort_key)[0]
    for p in sorted(paths):
        ext = "." + p.rsplit(".", 1)[-1].lower() if "." in p else ""
        if ext not in SKIP_EXTENSIONS:
            return p
    return None


def group_lab_files(rel_paths: list[str], pdf_only: bool = False) -> list[tuple[str, list[str], str]]:
    """Group files into logical lab entries."""
    filtered = [p for p in rel_paths if not should_skip_file(p.split("/")[-1])]
    top_level = [p for p in filtered if "/" not in p]
    nested = [p for p in filtered if "/" in p]

    groups: dict[str, list[str]] = defaultdict(list)

    for p in top_level:
        fname = p.split("/")[-1]
        ext = "." + fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
        if pdf_only and ext != ".pdf":
            continue
        if ext in SKIP_EXTENSIONS and ext not in PREFERRED_VIEW:
            if ext == ".docx":
                continue
        stem = fname.rsplit(".", 1)[0] if "." in fname else fname
        groups[stem].append(p)

    for p in nested:
        if pdf_only and not p.lower().endswith(".pdf"):
            continue
        parts = p.split("/")
        key = parts[0] if len(parts) > 1 else p
        groups[key].append(p)

    result = []
    for key, files in groups.items():
        view = pick_viewable_file(files)
        if view:
            result.append((key, files, view))
        elif not pdf_only and len(files) == 1:
            result.append((key, files, files[0]))

    result.sort(key=lambda x: lab_sort_key(x[0]))
    return result


def is_large_project(files: list[str]) -> bool:
    code_ext = {".php", ".js", ".py", ".java", ".ts", ".vue", ".html"}
    code_count = sum(
        1 for f in files
        if any(f.lower().endswith(e) for e in code_ext)
    )
    return len(files) > 80 or code_count > 30


def add_unique(collection: list, item: dict) -> None:
    url = item.get("link", {}).get("url")
    if url:
        fname = urllib.parse.unquote(url.rsplit("/", 1)[-1]).lower()
        if any(
            urllib.parse.unquote(x.get("link", {}).get("url", "").rsplit("/", 1)[-1]).lower() == fname
            for x in collection
        ):
            return
    collection.append(item)


def resolve_full_path(course: str, subject: str, rel: str, rel_to_full: dict) -> str:
    return rel_to_full.get(course, {}).get(subject, {}).get(rel) or f"{course}/{subject}/{rel}"


def build_work_item(title: str, full_path: str, semester: str, description: str = "") -> dict:
    item = {
        "title": title,
        "semester": semester,
        "link": link_for_path(full_path),
    }
    if description:
        item["description"] = description
    return item


def main():
    with open(TREE_PATH, encoding="utf-8") as f:
        data = json.load(f)

    files = [t["path"] for t in data.get("tree", []) if t["type"] == "blob"]

    by_course_subject: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    # rel path -> full GitHub path segment (preserves folder casing on GitHub)
    rel_to_full: dict[str, dict[str, dict[str, str]]] = defaultdict(lambda: defaultdict(dict))

    for path in files:
        parts = path.split("/")
        if len(parts) < 2:
            continue
        course = parts[0]
        if len(parts) == 2:
            by_course_subject[course]["_root"].append(parts[1])
        else:
            subject = parts[1]
            rel = "/".join(parts[2:])
            by_course_subject[course][subject].append(rel)
            rel_to_full[course][subject][rel] = path

    diploma_projects = []
    coursework_projects = []
    internship_projects = []
    lab_subjects = []

    for course in sorted(by_course_subject.keys(), key=lambda c: list(COURSE_SEMESTER).index(c) if c in COURSE_SEMESTER else 99):
        semester = COURSE_SEMESTER.get(course, course)
        for subject in sorted(by_course_subject[course].keys()):
            if subject in SKIP_SUBJECTS:
                continue
            rel_files = by_course_subject[course][subject]
            cat = categorize_subject(subject)

            if is_large_project(rel_files):
                folder_path = f"{course}/{subject}"
                item = build_work_item(
                    subject,
                    folder_path,
                    semester,
                    f"Проект в репозитории ({len(rel_files)} файлов). Откроется на GitHub.",
                )
                item["link"] = {"type": "external", "url": GITHUB_TREE + urllib.parse.quote(folder_path, safe="/")}
                item["tags"] = ["проект"]
                if cat == "diploma":
                    add_unique(diploma_projects, item)
                elif cat == "coursework":
                    add_unique(coursework_projects, item)
                elif cat == "internship":
                    add_unique(internship_projects, item)
                else:
                    lab_subjects.append({
                        "title": subject,
                        "semester": semester,
                        "description": f"Материалы: {len(rel_files)} файлов",
                        "labs": [item],
                    })
                continue

            if cat in ("diploma", "coursework", "internship"):
                groups = group_lab_files(rel_files, pdf_only=not is_large_project(rel_files))
                use_subject_title = len(groups) == 1
                for key, _files, view_path in groups:
                    fname = view_path.split("/")[-1]
                    file_cat = cat
                    if cat == "internship" and is_diploma_file(fname):
                        file_cat = "diploma"
                    full = resolve_full_path(course, subject, view_path, rel_to_full)
                    if file_cat == "coursework":
                        title = f"Курсовая — {course}"
                    elif file_cat == "diploma":
                        title = clean_title(fname, subject)
                    else:
                        title = subject if use_subject_title else clean_title(fname, subject)
                    item = build_work_item(title, full, semester)
                    item["tags"] = [file_cat]
                    if file_cat == "diploma":
                        add_unique(diploma_projects, item)
                    elif file_cat == "coursework":
                        add_unique(coursework_projects, item)
                    else:
                        add_unique(internship_projects, item)
                continue

            groups = group_lab_files(rel_files)
            if not groups:
                continue

            labs = []
            for key, _files, view_path in groups:
                full = resolve_full_path(course, subject, view_path, rel_to_full)
                fname = view_path.split("/")[-1]
                title = clean_title(fname, subject)
                if len(groups) > 1:
                    lab_title = f"Лабораторная — {title}"
                else:
                    lab_title = title
                labs.append({
                    "title": lab_title,
                    "link": link_for_path(full),
                })

            if len(labs) == 1 and len(groups) == 1:
                labs[0]["title"] = clean_title(groups[0][2].split("/")[-1], subject)

            lab_subjects.append({
                "title": subject,
                "semester": semester,
                "labs": labs,
            })

    with open(PROFILE_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    categories = []
    if diploma_projects:
        categories.append({
            "id": "diploma",
            "title": "Дипломная работа",
            "icon": "🎓",
            "description": "Выпускная квалификационная работа.",
            "projects": diploma_projects,
        })
    if coursework_projects:
        categories.append({
            "id": "coursework",
            "title": "Курсовые работы",
            "icon": "📚",
            "description": "Академические проекты по дисциплинам.",
            "projects": coursework_projects,
        })
    if internship_projects:
        categories.append({
            "id": "internship",
            "title": "Практики",
            "icon": "💼",
            "description": "Отчёты о прохождении производственной и учебной практики.",
            "projects": internship_projects,
        })
    if lab_subjects:
        categories.append({
            "id": "lab",
            "title": "Лабораторные работы",
            "icon": "🔬",
            "description": "Лабораторные работы по курсам и предметам. Файлы хранятся в репозитории HERZEN_PORTFOLIO_CONTENT.",
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
    print(f"  diploma: {len(diploma_projects)}")
    print(f"  coursework: {len(coursework_projects)}")
    print(f"  internship: {len(internship_projects)}")
    print(f"  lab subjects: {len(lab_subjects)}")
    print(f"  lab works: {sum(len(s['labs']) for s in lab_subjects)}")


if __name__ == "__main__":
    main()
