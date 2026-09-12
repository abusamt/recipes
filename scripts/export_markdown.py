from __future__ import annotations

import json
from pathlib import Path

from recipes_markdown import recipe_to_markdown


ROOT = Path(__file__).resolve().parents[1]
RECIPES_DIR = ROOT / "data" / "recipes"
MARKDOWN_DIR = ROOT / "data" / "recipes-md"


def main() -> None:
    MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)
    for path in sorted(MARKDOWN_DIR.glob("*.md")):
        path.unlink()
    count = 0
    for path in sorted(RECIPES_DIR.glob("*.json")):
        recipe = json.loads(path.read_text(encoding="utf-8"))
        recipe_id = recipe.get("id") or path.stem
        (MARKDOWN_DIR / f"{recipe_id}.md").write_text(recipe_to_markdown(recipe), encoding="utf-8")
        count += 1
    print(f"Exported {count} Markdown recipes to {MARKDOWN_DIR.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
