from pathlib import Path
from dataclasses import dataclass, field

import yaml


DATA_DIR = Path(__file__).parent / "data"
CATALOG_PATH = DATA_DIR / "catalog.yaml"
GUIDES_DIR = DATA_DIR / "guides"


@dataclass
class Style:
    id: str
    name: str
    category: str
    rating: int
    mood: list[str]
    color_palette: list[str]
    best_for: list[str]
    has_guide: bool
    description: str


@dataclass
class StyleCatalog:
    styles: list[Style] = field(default_factory=list)
    _by_id: dict[str, Style] = field(default_factory=dict, repr=False)
    _by_category: dict[str, list[Style]] = field(default_factory=dict, repr=False)

    @classmethod
    def load(cls) -> "StyleCatalog":
        with open(CATALOG_PATH) as f:
            data = yaml.safe_load(f)

        catalog = cls()
        for entry in data["styles"]:
            style = Style(**entry)
            catalog.styles.append(style)
            catalog._by_id[style.id] = style
            catalog._by_category.setdefault(style.category, []).append(style)
        return catalog

    def get(self, style_id: str) -> Style | None:
        return self._by_id.get(style_id)

    def list_categories(self) -> list[str]:
        return sorted(self._by_category.keys())

    def filter(
        self,
        *,
        category: str | None = None,
        mood: str | None = None,
        min_rating: int | None = None,
        best_for: str | None = None,
        search: str | None = None,
    ) -> list[Style]:
        results = self.styles

        if category:
            results = [s for s in results if s.category == category]
        if mood:
            results = [s for s in results if mood in s.mood]
        if min_rating:
            results = [s for s in results if s.rating >= min_rating]
        if best_for:
            results = [s for s in results if best_for in s.best_for]
        if search:
            q = search.lower()
            results = [
                s for s in results
                if q in s.name.lower()
                or q in s.description.lower()
                or q in s.category.lower()
                or any(q in m for m in s.mood)
            ]
        return results

    def get_guide(self, style_id: str) -> str | None:
        guide_path = GUIDES_DIR / f"{style_id}.md"
        if guide_path.exists():
            return guide_path.read_text()
        return None

    def summary_for_llm(self) -> str:
        lines = []
        for s in self.styles:
            lines.append(
                f"- {s.id}: {s.name} ({s.category}) — {s.description} "
                f"[mood: {', '.join(s.mood)}] [best_for: {', '.join(s.best_for)}] "
                f"[rating: {s.rating}]"
            )
        return "\n".join(lines)


# Singleton instance
_catalog: StyleCatalog | None = None


def get_catalog() -> StyleCatalog:
    global _catalog
    if _catalog is None:
        _catalog = StyleCatalog.load()
    return _catalog
