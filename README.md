# Muminah's Recipes

A static, interactive GitHub Pages recipe archive generated from a CopyMeThat export.

## Source of Truth

Recipe data lives in `data/recipes/*.json`. Each recipe is one JSON file with:

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

Run this after adding or editing recipe JSON:

```powershell
python scripts/build_data.py
```

GitHub Actions also runs that build automatically on pushes to `main`.

## Adding a Recipe

Open the site, go to `Create JSON`, fill out the form, and download or copy the generated JSON. Save it in `data/recipes/`, commit, and push. The Pages workflow will rebuild the index automatically.

## Reimporting CopyMeThat

```powershell
python scripts/extract_copymethat.py --html path\to\recipes.html --images path\to\images --out .
python scripts/build_data.py
```

That rewrites `data/recipes/*.json` and copies image files into `assets/images/`.
