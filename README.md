# HERZEN_PORTFOLIO

Портфолио работ студента **ИВТ1.1** (СПбГУ им. И. И. Герцена).

**Сайт (GitHub Pages):** https://nsodat.github.io/HERZEN_PORTFOLIO/

Одностраничное портфолио: **Обо мне**, **Проекты**, **Контакты**. Весь текст и список работ — в [`data/portfolio.json`](data/portfolio.json).

Подробный план: [`PLAN.md`](PLAN.md).

## Быстрое наполнение

1. Откройте `data/portfolio.json`.
2. Заполните `profile` (имя, биография, навыки) и `contacts`.
3. Добавьте работу в категорию (`diploma`, `coursework`, `internship`, `lab`):

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

4. PDF положите в `assets/pdfs/`.
5. Фото: `assets/img/ваше-фото.jpg` → путь в `profile.photo`.

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
