from __future__ import annotations

import argparse
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node"] = field(default_factory=list)
    text: str = ""

    def classes(self) -> set[str]:
        return set(self.attrs.get("class", "").split())


class TreeParser(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key.lower(): value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag.lower() not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for idx in range(len(self.stack) - 1, 0, -1):
            if self.stack[idx].tag == tag:
                del self.stack[idx:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].text += data


def walk(node: Node) -> Iterable[Node]:
    yield node
    for child in node.children:
        yield from walk(child)


def text_content(node: Node) -> str:
    parts: list[str] = []

    def collect(current: Node) -> None:
        if current.text:
            parts.append(current.text)
        for child in current.children:
            collect(child)

    collect(node)
    return normalize_text(" ".join(parts))


def first(node: Node, *, tag: str | None = None, id_: str | None = None, cls: str | None = None) -> Node | None:
    for candidate in walk(node):
        if tag and candidate.tag != tag:
            continue
        if id_ and candidate.attrs.get("id") != id_:
            continue
        if cls and cls not in candidate.classes():
            continue
        return candidate
    return None


def normalize_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    if not value:
        return ""
    try:
        repaired = value.encode("latin-1").decode("utf-8")
        if "�" not in repaired:
            value = repaired
    except UnicodeError:
        pass
    replacements = {
        "Â": "",
        "â€“": "-",
        "â€”": "-",
        "â€™": "'",
        "â€œ": '"',
        "â€": '"',
        "â€˜": "'",
        "Â½": "1/2",
        "Â¼": "1/4",
        "Â¾": "3/4",
        "Â°F": "°F",
    }
    for bad, good in replacements.items():
        value = value.replace(bad, good)
    return unicodedata.normalize("NFKC", value).strip()


def slugify(value: str, used: set[str]) -> str:
    slug = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", slug.lower()).strip("-") or "recipe"
    base = slug
    counter = 2
    while slug in used:
        slug = f"{base}-{counter}"
        counter += 1
    used.add(slug)
    return slug


def list_items(parent: Node | None, item_class: str, heading_class: str | None = None) -> list[dict[str, str]]:
    if not parent:
        return []
    items: list[dict[str, str]] = []
    for child in parent.children:
        classes = child.classes()
        text = text_content(child)
        if not text:
            continue
        if heading_class and heading_class in classes:
            items.append({"type": "heading", "text": text})
        elif item_class in classes:
            items.append({"type": "item", "text": text})
    return items


def instruction_items(parent: Node | None) -> list[dict[str, str]]:
    if not parent:
        return []
    steps: list[dict[str, str]] = []
    for child in parent.children:
        classes = child.classes()
        text = text_content(child)
        if not text:
            continue
        if "instruction_subheader" in classes:
            steps.append({"type": "heading", "text": text})
        elif "instruction_next" in classes and steps and steps[-1]["type"] == "step":
            steps[-1]["text"] = f'{steps[-1]["text"]}\n{text}'
        elif "instruction" in classes:
            steps.append({"type": "step", "text": text})
    return steps


def parse_recipes(html_path: Path) -> list[dict]:
    parser = TreeParser()
    parser.feed(html_path.read_text(encoding="utf-8", errors="replace"))
    recipe_nodes = [node for node in walk(parser.root) if node.tag == "div" and "recipe" in node.classes()]
    recipes: list[dict] = []
    used_slugs: set[str] = set()

    for index, node in enumerate(recipe_nodes, start=1):
        name = text_content(first(node, id_="name") or node) or f"Recipe {index}"
        slug = slugify(name, used_slugs)
        link_node = first(node, tag="a", id_="original_link")
        image_node = first(node, tag="img", cls="recipeImage")
        yield_node = first(node, id_="recipeYield")
        categories_parent = first(node, id_="categories")

        categories: list[str] = []
        if categories_parent:
            categories = [text_content(cat) for cat in walk(categories_parent) if "recipeCategory" in cat.classes()]
            categories = [cat for cat in categories if cat]

        recipes.append(
            {
                "id": slug,
                "title": name,
                "description": text_content(first(node, id_="description") or Node("empty")),
                "source": {
                    "label": text_content(link_node) if link_node else "",
                    "url": link_node.attrs.get("href", "") if link_node else "",
                },
                "image": image_node.attrs.get("src", "").replace("\\", "/") if image_node else "",
                "servings": text_content(yield_node) if yield_node else "",
                "categories": categories,
                "ingredients": list_items(first(node, id_="recipeIngredients"), "recipeIngredient", "recipeIngredient_subheader"),
                "instructions": instruction_items(first(node, id_="recipeInstructions")),
                "notes": [item["text"] for item in list_items(first(node, id_="recipeNotes"), "recipeNote")],
                "extra": text_content(first(node, id_="extra_info") or Node("empty")),
            }
        )
    return recipes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--images", required=True, type=Path)
    parser.add_argument("--out", default=Path("."), type=Path)
    args = parser.parse_args()

    recipes = parse_recipes(args.html)
    data_dir = args.out / "data" / "recipes"
    image_dir = args.out / "assets" / "images"
    data_dir.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)

    for path in data_dir.glob("*.json"):
        path.unlink()
    for recipe in recipes:
        (data_dir / f'{recipe["id"]}.json').write_text(json.dumps(recipe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for image in args.images.glob("*"):
        if image.is_file():
            shutil.copy2(image, image_dir / image.name)

    print(f"Extracted {len(recipes)} recipes and copied {len(list(args.images.glob('*')))} images.")


if __name__ == "__main__":
    main()
