from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECIPES_DIR = ROOT / "data" / "recipes"
INDEX_PATH = ROOT / "data" / "recipes-index.json"
JSONL_PATH = ROOT / "data" / "recipes.jsonl"


def flatten(entries: list[dict[str, str]]) -> str:
    return " ".join(entry.get("text", "") for entry in entries)


def recipe_summary(recipe: dict) -> dict:
    searchable = " ".join(
        [
            recipe.get("title", ""),
            recipe.get("description", ""),
            recipe.get("servings", ""),
            " ".join(recipe.get("categories", [])),
            flatten(recipe.get("ingredients", [])),
            flatten(recipe.get("instructions", [])),
            " ".join(recipe.get("notes", [])),
            recipe.get("source", {}).get("label", ""),
        ]
    )
    return {
        "id": recipe["id"],
        "title": recipe["title"],
        "description": recipe.get("description", ""),
        "image": recipe.get("image", ""),
        "servings": recipe.get("servings", ""),
        "categories": recipe.get("categories", []),
        "source": recipe.get("source", {}),
        "ingredientCount": len([item for item in recipe.get("ingredients", []) if item.get("type") == "item"]),
        "stepCount": len([item for item in recipe.get("instructions", []) if item.get("type") == "step"]),
        "search": searchable.lower(),
    }


def main() -> None:
    recipes = []
    for path in sorted(RECIPES_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            recipe = json.load(handle)
        recipes.append(recipe)

    recipes.sort(key=lambda recipe: recipe["title"].lower())
    index = {
        "count": len(recipes),
        "recipes": [recipe_summary(recipe) for recipe in recipes],
    }

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    JSONL_PATH.write_text("".join(json.dumps(recipe, ensure_ascii=False) + "\n" for recipe in recipes), encoding="utf-8")
    print(f"Built {INDEX_PATH.relative_to(ROOT)} and {JSONL_PATH.relative_to(ROOT)} for {len(recipes)} recipes.")


if __name__ == "__main__":
    main()
