#!/usr/bin/env python3
"""Stage A extraction: epub -> per-chapter plain text.

Reads a book's epub, walks toc.ncx to map "Chapter N" / "Epilogue" nav points
to their xhtml files, strips tags, and writes clean UTF-8 text files to
data-src/<book>/chapters_txt/. Pure and idempotent.

Usage:
    python3 tools/extract_text.py books/book1-dungeon-crawler-carl.epub book1
"""
import html
import os
import re
import sys
import zipfile
from posixpath import dirname, join, normpath

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def strip_html(markup: str) -> str:
    # Drop script/style, convert block breaks to newlines, remove remaining tags.
    markup = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", markup)
    markup = re.sub(r"(?i)<(br|/p|/div|/h\d|/li)\s*>", "\n", markup)
    text = re.sub(r"<[^>]+>", " ", markup)
    text = html.unescape(text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    epub_path, book_id = sys.argv[1], sys.argv[2]
    out_dir = join(ROOT, "data-src", book_id, "chapters_txt")
    os.makedirs(out_dir, exist_ok=True)

    with zipfile.ZipFile(epub_path) as z:
        names = z.namelist()
        ncx_name = next(n for n in names if n.endswith("toc.ncx"))
        ncx = z.read(ncx_name).decode("utf-8", "replace")
        ncx_dir = dirname(ncx_name)

        # navPoint -> (label, src file). Order preserved.
        pairs = re.findall(
            r"<navPoint\b.*?<text>(.*?)</text>.*?<content\s+src=\"(.*?)\"",
            ncx,
            re.S,
        )

        written = 0
        for label, src in pairs:
            label = html.unescape(label).strip()
            m = re.match(r"Chapter\s+(\d+)$", label, re.I)
            if m:
                key = f"ch{int(m.group(1)):02d}"
            elif re.match(r"Epilogue$", label, re.I):
                key = "epilogue"
            else:
                continue  # skip front/back matter and Part dividers

            src_path = normpath(join(ncx_dir, src.split("#")[0]))
            markup = z.read(src_path).decode("utf-8", "replace")
            text = strip_html(markup)
            with open(join(out_dir, f"{key}.txt"), "w", encoding="utf-8") as f:
                f.write(text + "\n")
            written += 1

    print(f"Wrote {written} chapter files to {out_dir}")


if __name__ == "__main__":
    main()
