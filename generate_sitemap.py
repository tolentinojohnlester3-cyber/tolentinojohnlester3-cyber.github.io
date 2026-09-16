"""Build sitemap.xml from indexable HTML pages in this GitHub Pages site."""
from __future__ import annotations

from datetime import date
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
BASE = "https://tolentinojohnlester3-cyber.github.io"
SKIP_FILES = {
    "404.html",
    "preview.html",
    "blog.html",
    "what-is-seo.html",
    "layers-of-seo.html",
    "google-august-2026-spam-update.html",
    "install-wordpress-cpanel.html",
    "fast-website-load-speed.html",
    "types-of-structured-data.html",
    "clone-website-cpanel.html",
    "geo-optimization.html",
    "aeo-optimization.html",
}
SKIP_PREFIXES = ("googled",)


def is_redirect_stub(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    return "location.replace(" in text and len(text) < 600


def collect_urls() -> list[tuple[str, str]]:
    urls: list[tuple[str, str]] = []

    home = ROOT / "index.html"
    if home.is_file():
        urls.append(("/", date.fromtimestamp(home.stat().st_mtime).isoformat()))

    blog_index = ROOT / "blog" / "index.html"
    if blog_index.is_file():
        urls.append(("/blog/", date.fromtimestamp(blog_index.stat().st_mtime).isoformat()))

    for post in sorted((ROOT / "blog").glob("*/index.html")):
        slug = post.parent.name
        loc = f"/blog/{slug}/"
        urls.append((loc, date.fromtimestamp(post.stat().st_mtime).isoformat()))

    for html in sorted(ROOT.glob("*.html")):
        if html.name in SKIP_FILES or html.name.startswith(SKIP_PREFIXES):
            continue
        if html.name == "index.html":
            continue
        if is_redirect_stub(html):
            continue
        loc = f"/{html.stem}/" if html.suffix == ".html" else f"/{html.name}/"
        urls.append((loc, date.fromtimestamp(html.stat().st_mtime).isoformat()))

    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for loc, lastmod in urls:
        if loc not in seen:
            seen.add(loc)
            unique.append((loc, lastmod))
    return unique


def priority_for(loc: str) -> str:
    if loc == "/":
        return "1.0"
    if loc == "/blog/":
        return "0.8"
    return "0.9"


def changefreq_for(loc: str) -> str:
    return "weekly" if loc in {"/", "/blog/"} else "monthly"


def render(urls: list[tuple[str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod in urls:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{BASE}{loc}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                f"    <changefreq>{changefreq_for(loc)}</changefreq>",
                f"    <priority>{priority_for(loc)}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    urls = collect_urls()
    out = ROOT / "sitemap.xml"
    out.write_text(render(urls), encoding="utf-8")
    print(f"Wrote {len(urls)} URLs to {out.name}:")
    for loc, lastmod in urls:
        print(f"  {BASE}{loc} ({lastmod})")


if __name__ == "__main__":
    main()
