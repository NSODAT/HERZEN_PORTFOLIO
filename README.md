# HERZEN_PORTFOLIO

Портфолио работ студента **ИВТ1.1** (СПбГУ им. И. И. Герцена).

**Сайт (GitHub Pages):** https://nsodat.github.io/HERZEN_PORTFOLIO/

Одностраничное портфолио: **Обо мне**, **Проекты**, **Контакты**. Весь текст и список работ — в [`data/portfolio.json`](data/portfolio.json).

Подробный план: [`PLAN.md`](PLAN.md).

## Быстрое наполнение

1. Откройте `data/portfolio.json`.
2. Заполните `profile` (имя, биография, навыки) и `contacts`.
3. Добавьте работу в категорию (`diploma`, `coursework`, `internship`) или лабораторные по предметам (см. ниже).

### Лабораторные по предметам

В категории `lab` используйте массив `subjects` — каждый предмет со своим списком лабораторных:

```json
{
  "id": "lab",
  "subjects": [
    {
      "title": "Информатика",
      "semester": "1 семестр",
      "labs": [
        {
          "title": "Лабораторная работа №1",
          "url": "https://docs.google.com/document/d/ID/edit?usp=sharing"
        },
        {
          "title": "Лабораторная работа №2",
          "url": "https://docs.google.com/document/d/ID2/edit?usp=sharing"
        }
      ]
    }
  ]
}
```

**Типы ссылок для лабораторных** (поле `url` или объект `link`):

| Способ | Пример в JSON |
|--------|----------------|
| Google Документ | `"url": "https://docs.google.com/document/d/ID/edit?usp=sharing"` |
| PDF в этом репозитории | `"link": { "type": "pdf", "url": "assets/pdfs/lr1.pdf" }` |
| Файл на GitHub (PDF) | `"link": { "type": "github", "url": "https://github.com/NSODAT/HERZEN_PORTFOLIO/blob/main/assets/pdfs/lr1.pdf" }` |

Тип определяется автоматически по ссылке, если не указан `link.type`. PDF с GitHub и из папки `assets/pdfs/` открываются в просмотрщике на сайте; прочие файлы на GitHub — в новой вкладке.

4. Для курсовых/диплома — пример карточки:

```json
{
  "title": "Курсовая — веб-разработка",
  "semester": "5 семестр",
  "description": "Краткое описание",
  "tags": ["HTML", "CSS"],
  "link": {
    "type": "pdf",
    "url": "assets/pdfs/kursovaya-5.pdf"
  }
}
```

### Типы ссылок (`link.type`)

| type | url | Поведение |
|------|-----|-----------|
| `pdf` | `assets/pdfs/файл.pdf` | Просмотр на сайте + скачивание |
| `google-drive` | Ссылка «Поделиться» на файл | Превью в окне; **папка** — новая вкладка |
| `google-doc` | Ссылка на Google Документ | Превью в окне |
| `external` | Любой URL (GitHub, raw PDF и т.д.) | Новая вкладка |

5. PDF положите в `assets/pdfs/` **или** укажите файлы из [HERZEN_PORTFOLIO_CONTENT](https://github.com/NSODAT/HERZEN_PORTFOLIO_CONTENT) (`link.type`: `github`).
6. Фото: `assets/img/ваше-фото.jpg` → путь в `profile.photo`.

### Автогенерация из HERZEN_PORTFOLIO_CONTENT

```powershell
Invoke-WebRequest -Uri "https://api.github.com/repos/NSODAT/HERZEN_PORTFOLIO_CONTENT/git/trees/main?recursive=1" -OutFile content-tree.json
python scripts/generate_portfolio.py
```

Скрипт заполняет `data/portfolio.json` (курсовые, практики, диплом, лабораторные по предметам). Профиль и контакты сохраняются.

## Локальный просмотр

```bash
python -m http.server 8080
```

Откройте http://localhost:8080

## Обновление на GitHub

```bash
git add .
git commit -m "Обновление контента"
git push
```

**Pages:** Settings → Pages → branch `main`, folder `/ (root)`.
