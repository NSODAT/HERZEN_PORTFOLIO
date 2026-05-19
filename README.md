# HERZEN_PORTFOLIO — портфолио работ студента ИВТ1.1

Одностраничный сайт на GitHub Pages: [NSODAT/HERZEN_PORTFOLIO](https://github.com/NSODAT/HERZEN_PORTFOLIO)

---

# Портфолио студента ИИТ (GitHub Pages)

Одностраничное портфолио: **Обо мне**, **Проекты**, **Контакты**. Весь текст и список работ — в одном файле [`data/portfolio.json`](data/portfolio.json).

Подробный план: [`PLAN.md`](PLAN.md).

## Быстрое наполнение

1. Откройте `data/portfolio.json`.
2. Заполните `profile` (имя, институт, биография, навыки) и `contacts`.
3. Добавьте работу в нужную категорию (`diploma`, `coursework`, `internship`, `lab`):

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

**Google Drive (файл):** `https://drive.google.com/file/d/ID/view?usp=sharing`  
**Google Документ:** `https://docs.google.com/document/d/ID/edit?usp=sharing`

4. PDF положите в `assets/pdfs/`.
5. Фото замените: `assets/img/ваше-фото.jpg` и путь в `profile.photo`.

## Локальный просмотр

Из корня проекта:

```bash
python -m http.server 8080
```

Откройте http://localhost:8080 (без сервера `fetch` к JSON не сработает).

## Публикация на GitHub Pages

1. Создайте репозиторий на GitHub.
2. В папке проекта:

```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

3. **Settings → Pages → Build and deployment → Branch:** `main`, folder `/ (root)`.
4. Сайт: `https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПО/`

Для репозитория `username.github.io` сайт будет на `https://username.github.io/`.

## Структура

```
├── index.html
├── css/main.css
├── js/app.js
├── data/portfolio.json   ← редактируете только это
├── assets/
│   ├── img/
│   └── pdfs/
├── PLAN.md
└── README.md
```
