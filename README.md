# Muminah's Recipes

A static, interactive GitHub Pages recipe archive generated from a CopyMeThat export.

## Source of Truth

Recipe data lives in `data/recipes-md/*.md`. Each recipe is one Markdown file with YAML-like front matter and stable sections for the title, ingredients, steps, notes, and extra text. This is the editable SSOT.

The build converts those Markdown files into generated JSON files with:

- `id`, `title`, `description`, `servings`
- `source`
- `image`
- `categories`
- `ingredients`
- `instructions`
- `notes`

Generated files:

- `data/recipes-index.json` powers search, cards, and sorting.
- `data/recipes.jsonl` stores the full collection as newline-delimited JSON.

Run this after adding or editing recipe Markdown:

```powershell
python scripts/build_data.py
```

GitHub Actions also runs that build automatically on pushes to `main`.

## Editing and Adding a Recipe

Open any recipe and click `Edit`. GitHub opens the canonical Markdown file in its authenticated editor. The site never receives or stores a GitHub token.

For a new recipe, open `Create Recipe`, then copy or download the generated Markdown into `data/recipes-md/<stable-id>.md`. The formatter uses the same shape as the build parser, so Markdown -> JSON -> Markdown is stable and repeatable.

## Reimporting CopyMeThat

```powershell
python scripts/extract_copymethat.py --html path\to\recipes.html --images path\to\images --out .
python scripts/export_markdown.py
python scripts/build_data.py
```

That rewrites `data/recipes/*.json` and copies image files into `assets/images/`.
