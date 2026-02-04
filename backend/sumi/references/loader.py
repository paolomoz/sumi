"""Markdown reference file loader — replaces the YAML catalog system."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path


DATA_DIR = Path(__file__).parent / "data"


_NAME_OVERRIDES: dict[str, str] = {
    "ukiyo-e": "Ukiyo-e",
    "art-nouveau": "Art Nouveau",
    "ikea-manual": "IKEA Manual",
    "hub-spoke": "Hub & Spoke",
}


def _kebab_to_title(s: str) -> str:
    """Convert 'cyberpunk-neon' → 'Cyberpunk Neon', with overrides for special names."""
    if s in _NAME_OVERRIDES:
        return _NAME_OVERRIDES[s]
    return " ".join(word.capitalize() for word in s.split("-"))


@dataclass
class LayoutRef:
    id: str
    name: str
    best_for: list[str]
    recommended_pairings: list[str]
    content: str


@dataclass
class StyleRef:
    id: str
    name: str
    best_for: str
    color_palette_desc: str
    content: str


@dataclass
class ReferenceStore:
    layouts: dict[str, LayoutRef] = field(default_factory=dict)
    styles: dict[str, StyleRef] = field(default_factory=dict)
    frameworks: dict[str, str] = field(default_factory=dict)

    def load(self) -> "ReferenceStore":
        self._load_layouts()
        self._load_styles()
        self._load_frameworks()
        return self

    # ── Layouts ──────────────────────────────────────────────

    def _load_layouts(self):
        layout_dir = DATA_DIR / "layouts"
        if not layout_dir.exists():
            return
        for path in sorted(layout_dir.glob("*.md")):
            ref = self._parse_layout(path)
            if ref:
                self.layouts[ref.id] = ref

    def _parse_layout(self, path: Path) -> LayoutRef | None:
        text = path.read_text(encoding="utf-8")
        lines = text.strip().split("\n")
        if not lines:
            return None

        # ID from filename
        layout_id = path.stem

        # Name from first H1 — strip markdown heading and any trailing annotations
        name_line = lines[0].lstrip("# ").strip()
        name = name_line.split("(")[0].strip()
        # If the heading is just the kebab-case ID, convert to title case
        if name == layout_id:
            name = _kebab_to_title(layout_id)

        # Extract sections
        best_for = self._extract_list_items(text, "Best For")
        pairings = self._extract_pairings(text)

        return LayoutRef(
            id=layout_id,
            name=name,
            best_for=best_for,
            recommended_pairings=pairings,
            content=text,
        )

    # ── Styles ───────────────────────────────────────────────

    def _load_styles(self):
        style_dir = DATA_DIR / "styles"
        if not style_dir.exists():
            return
        for path in sorted(style_dir.glob("*.md")):
            ref = self._parse_style(path)
            if ref:
                self.styles[ref.id] = ref

    def _parse_style(self, path: Path) -> StyleRef | None:
        text = path.read_text(encoding="utf-8")
        lines = text.strip().split("\n")
        if not lines:
            return None

        style_id = path.stem

        # Name from first H1, strip annotations like (DEFAULT)
        name_line = lines[0].lstrip("# ").strip()
        name = re.sub(r"\s*\(.*?\)\s*$", "", name_line).strip()
        # If the heading is just the kebab-case ID, convert to title case
        if name == style_id:
            name = _kebab_to_title(style_id)

        # Best For — may be a list or a paragraph
        best_for = self._extract_section_text(text, "Best For")

        # Color Palette description
        color_palette_desc = self._extract_section_text(text, "Color Palette")

        return StyleRef(
            id=style_id,
            name=name,
            best_for=best_for,
            color_palette_desc=color_palette_desc,
            content=text,
        )

    # ── Frameworks ───────────────────────────────────────────

    def _load_frameworks(self):
        for name in ("analysis-framework", "structured-content-template", "base-prompt"):
            path = DATA_DIR / f"{name}.md"
            if path.exists():
                self.frameworks[name] = path.read_text(encoding="utf-8")

    # ── Public API ───────────────────────────────────────────

    def get_layout(self, layout_id: str) -> LayoutRef | None:
        return self.layouts.get(layout_id)

    def get_style(self, style_id: str) -> StyleRef | None:
        return self.styles.get(style_id)

    def list_layouts(self) -> list[LayoutRef]:
        return list(self.layouts.values())

    def list_styles(self) -> list[StyleRef]:
        return list(self.styles.values())

    def get_framework(self, name: str) -> str:
        """Get framework markdown by name (e.g. 'analysis-framework')."""
        return self.frameworks.get(name, "")

    def summary_for_llm(self) -> str:
        """Compact summary of all layouts and styles for LLM context."""
        parts: list[str] = []

        parts.append("## Available Layouts\n")
        for layout in self.layouts.values():
            best = ", ".join(layout.best_for[:4]) if layout.best_for else "general"
            parts.append(f"- **{layout.id}**: {best}")

        parts.append("\n## Available Styles\n")
        for style in self.styles.values():
            best = style.best_for[:120] if style.best_for else "general"
            parts.append(f"- **{style.id}** ({style.name}): {best}")

        return "\n".join(parts)

    # ── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _extract_list_items(text: str, section_name: str) -> list[str]:
        """Extract bullet-list items from a markdown section."""
        pattern = rf"##\s+{re.escape(section_name)}\s*\n(.*?)(?=\n##|\Z)"
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return []
        section = match.group(1)
        items = []
        for line in section.strip().split("\n"):
            line = line.strip()
            if line.startswith("- "):
                items.append(line[2:].strip())
        return items

    @staticmethod
    def _extract_pairings(text: str) -> list[str]:
        """Extract style IDs from Recommended Pairings section."""
        pattern = r"##\s+Recommended Pairings\s*\n(.*?)(?=\n##|\Z)"
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return []
        section = match.group(1)
        return re.findall(r"`([^`]+)`", section)

    @staticmethod
    def _extract_section_text(text: str, section_name: str) -> str:
        """Extract raw text content from a markdown section."""
        pattern = rf"##\s+{re.escape(section_name)}\s*\n(.*?)(?=\n##|\Z)"
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return ""
        return match.group(1).strip()


# ── Singleton ────────────────────────────────────────────────

_store: ReferenceStore | None = None


def get_references() -> ReferenceStore:
    global _store
    if _store is None:
        _store = ReferenceStore().load()
    return _store
