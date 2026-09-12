from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from recipes_markdown import markdown_to_recipe

ROOT = Path(__file__).resolve().parents[1]
RECIPES_DIR = ROOT / "data" / "recipes"
MARKDOWN_DIR = ROOT / "data" / "recipes-md"
INDEX_PATH = ROOT / "data" / "recipes-index.json"
JSONL_PATH = ROOT / "data" / "recipes.jsonl"
JS_PATH = ROOT / "data" / "recipes.js"
SITE_CONFIG_PATH = ROOT / "data" / "site-config.js"


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
        "editPath": f'data/recipes-md/{recipe["id"]}.md',
        "ingredientCount": len([item for item in recipe.get("ingredients", []) if item.get("type") == "item"]),
        "stepCount": len([item for item in recipe.get("instructions", []) if item.get("type") == "step"]),
        "search": searchable.lower(),
    }


def main() -> None:
    recipes = load_recipes()

    recipes.sort(key=lambda recipe: recipe["title"].lower())
    index = {
        "count": len(recipes),
        "recipes": [recipe_summary(recipe) for recipe in recipes],
    }

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    JSONL_PATH.write_text("".join(json.dumps(recipe, ensure_ascii=False) + "\n" for recipe in recipes), encoding="utf-8")
    index_js = json.dumps(index, ensure_ascii=False, separators=(",", ":")).translate(str.maketrans({"<": "\\u003c", ">": "\\u003e", "&": "\\u0026"}))
    recipes_js = json.dumps(recipes, ensure_ascii=False, separators=(",", ":")).translate(str.maketrans({"<": "\\u003c", ">": "\\u003e", "&": "\\u0026"}))
    JS_PATH.write_text(f"window.RECIPE_INDEX = {index_js};\nwindow.RECIPE_DATA = {recipes_js};\n", encoding="utf-8")
    repository = repository_name()
    SITE_CONFIG_PATH.write_text(f"window.RECIPE_REPOSITORY = {json.dumps(repository)};\n", encoding="utf-8")
    print(f"Built {INDEX_PATH.relative_to(ROOT)}, {JSONL_PATH.relative_to(ROOT)}, {JS_PATH.relative_to(ROOT)}, and {SITE_CONFIG_PATH.relative_to(ROOT)} for {len(recipes)} recipes.")


def repository_name() -> str:
    configured = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if configured and "/" in configured:
        return configured
    try:
        remote = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        remote = ""
    if remote:
        remote = remote.removesuffix(".git")
        if remote.startswith("git@github.com:"):
            return remote.split(":", 1)[1]
        if "github.com/" in remote:
            return remote.split("github.com/", 1)[1].rstrip("/")
    return "abusamt/recipes"


def load_recipes() -> list[dict]:
    recipes: list[dict] = []
    if MARKDOWN_DIR.exists() and any(MARKDOWN_DIR.glob("*.md")):
        RECIPES_DIR.mkdir(parents=True, exist_ok=True)
        for path in sorted(RECIPES_DIR.glob("*.json")):
            path.unlink()
        for path in sorted(MARKDOWN_DIR.glob("*.md")):
            recipe = markdown_to_recipe(path.read_text(encoding="utf-8"), path.stem)
            recipes.append(recipe)
            (RECIPES_DIR / f'{recipe["id"]}.json').write_text(
                json.dumps(recipe, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        return recipes

    for path in sorted(RECIPES_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            recipes.append(json.load(handle))
    return recipes


if __name__ == "__main__":
    main()
