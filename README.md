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
- `data/recipes.js` embeds the catalog for browsers that block runtime JSON requests.
- `data/site-config.js` records the current repository identity for fork-safe GitHub links.

Run this after adding or editing recipe Markdown:

```powershell
python scripts/build_data.py
```

GitHub Actions also runs that build automatically on pushes to `main`.

## Forking

Forks are first-class copies of the app. GitHub Actions derives the fork owner and repository name automatically, and the Edit and Open GitHub New File links target that fork. A fork owner can add or edit Markdown recipes, let the workflow regenerate the derived data, and submit the resulting branch or commits as a pull request.

## Editing and Adding a Recipe

Open any recipe and click `Edit`. GitHub opens the canonical Markdown file in its authenticated editor. The site never receives or stores a GitHub token.

For a new recipe, open `Create Recipe`, fill out the form, copy the Markdown, then use `Open GitHub New File` to create `data/recipes-md/<stable-id>.md` while signed into GitHub. The formatter uses the same shape as the build parser, so Markdown -> JSON -> Markdown is stable and repeatable.

## Reimporting CopyMeThat

```powershell
python scripts/extract_copymethat.py --html path\to\recipes.html --images path\to\images --out .
python scripts/export_markdown.py
python scripts/build_data.py
```

That rewrites `data/recipes/*.json` and copies image files into `assets/images/`.
