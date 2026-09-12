from __future__ import annotations

import re
import unicodedata


META_KEYS = ["id", "title", "servings", "image", "source_url", "source_label", "categories"]


def repair_text(value: str) -> str:
    value = str(value or "")
    if not value:
        return ""
    for encoding in ("cp1252", "latin-1"):
        try:
            repaired = value.encode(encoding).decode("utf-8")
            if repaired.count("�") <= value.count("�"):
                value = repaired
                break
        except UnicodeError:
            pass
    replacements = {
        "Â": "",
        "â€¢": "•",
        "â€“": "-",
        "â€”": "-",
        "â€™": "'",
        "â€œ": '"',
        "â€\u009d": '"',
        "â€˜": "'",
        "Â½": "1/2",
        "Â¼": "1/4",
        "Â¾": "3/4",
        "Â°F": "°F",
    }
    for bad, good in replacements.items():
        value = value.replace(bad, good)
    return unicodedata.normalize("NFKC", value).strip()


def recipe_to_markdown(recipe: dict) -> str:
    title = repair_text(recipe.get("title", "Untitled Recipe"))
    source = recipe.get("source", {}) or {}
    meta = {
        "id": recipe.get("id", ""),
        "title": title,
        "servings": repair_text(recipe.get("servings", "")),
        "image": recipe.get("image", ""),
        "source_url": source.get("url", ""),
        "source_label": repair_text(source.get("label", "")),
        "categories": ", ".join(repair_text(item) for item in recipe.get("categories", [])),
    }

    lines = ["---"]
    for key in META_KEYS:
        lines.append(f"{key}: {meta[key]}")
    lines.extend(["---", "", f"# {title}"])

    description = repair_text(recipe.get("description", ""))
    if description:
        lines.extend(["", description])

    lines.extend(["", "## Ingredients"])
    lines.extend(items_to_markdown(recipe.get("ingredients", []), ordered=False))
    lines.extend(["", "## Steps"])
    lines.extend(items_to_markdown(recipe.get("instructions", []), ordered=True))

    notes = [repair_text(note) for note in recipe.get("notes", []) if repair_text(note)]
    if notes:
        lines.extend(["", "## Notes"])
        lines.extend(f"- {note}" for note in notes)

    extra = repair_text(recipe.get("extra", ""))
    if extra:
        lines.extend(["", "## Extra", extra])

    return "\n".join(lines).rstrip() + "\n"


def items_to_markdown(items: list[dict], *, ordered: bool) -> list[str]:
    lines: list[str] = []
    number = 1
    for item in items:
        text = repair_text(item.get("text", ""))
        if not text:
            continue
        if item.get("type") == "heading":
            lines.append(f"### {text}")
            continue
        marker = f"{number}." if ordered else "-"
        parts = text.splitlines() or [text]
        lines.append(f"{marker} {parts[0]}")
        for continuation in parts[1:]:
            lines.append(f"   {continuation}")
        if ordered:
            number += 1
    if not lines:
        lines.append("- ")
    return lines


def markdown_to_recipe(markdown: str, fallback_id: str) -> dict:
    metadata, body = split_front_matter(markdown)
    sections = split_sections(body)
    title = metadata.get("title") or heading_title(body) or fallback_id.replace("-", " ").title()

    return {
        "id": metadata.get("id") or fallback_id,
        "title": repair_text(title),
        "description": repair_text(sections.get("description", "")),
        "source": {
            "label": repair_text(metadata.get("source_label", "")),
            "url": metadata.get("source_url", "").strip(),
        },
        "image": metadata.get("image", "").strip(),
        "servings": repair_text(metadata.get("servings", "")),
        "categories": [repair_text(item) for item in metadata.get("categories", "").split(",") if repair_text(item)],
        "ingredients": parse_list_section(sections.get("ingredients", ""), item_type="item"),
        "instructions": parse_list_section(sections.get("steps", ""), item_type="step"),
        "notes": [item["text"] for item in parse_list_section(sections.get("notes", ""), item_type="item") if item["type"] == "item"],
        "extra": repair_text(sections.get("extra", "")),
    }


def split_front_matter(markdown: str) -> tuple[dict[str, str], str]:
    lines = markdown.replace("\r\n", "\n").split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, markdown
    metadata: dict[str, str] = {}
    end = 0
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = index
            break
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip()
    if not end:
        return metadata, markdown
    return metadata, "\n".join(lines[end + 1 :])


def heading_title(body: str) -> str:
    for line in body.splitlines():
        match = re.match(r"^#\s+(.+)$", line.strip())
        if match:
            return match.group(1).strip()
    return ""


def split_sections(body: str) -> dict[str, str]:
    sections = {"description": ""}
    current = "description"
    collected: dict[str, list[str]] = {current: []}
    for line in body.splitlines():
        h1 = re.match(r"^#\s+(.+)$", line.strip())
        h2 = re.match(r"^##\s+(.+)$", line.strip())
        if h1:
            continue
        if h2:
            current = normalize_section_name(h2.group(1))
            collected.setdefault(current, [])
            continue
        collected.setdefault(current, []).append(line)
    for key, lines in collected.items():
        sections[key] = "\n".join(lines).strip()
    return sections


def normalize_section_name(value: str) -> str:
    value = value.strip().lower()
    if value in {"instructions", "directions", "method"}:
        return "steps"
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def parse_list_section(section: str, *, item_type: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for raw_line in section.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        heading = re.match(r"^###\s+(.+)$", line.strip())
        bullet = re.match(r"^\s*(?:[-*+]|\d+[.)])\s+(.+)$", line)
        if heading:
            current = None
            items.append({"type": "heading", "text": repair_text(heading.group(1))})
        elif bullet:
            current = {"type": item_type, "text": repair_text(bullet.group(1))}
            items.append(current)
        elif current:
            current["text"] = repair_text(f'{current["text"]}\n{line.strip()}')
        else:
            items.append({"type": item_type, "text": repair_text(line.strip())})
    return items
