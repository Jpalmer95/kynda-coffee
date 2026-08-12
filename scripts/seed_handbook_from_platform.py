#!/usr/bin/env python3
"""Parse the Kynda Employee Handbook docx into handbook_sections JSON.
Segments the body (after the TOC) into the numbered sections and emits
[{title, content:[...]}] matching the handbook_sections schema (content JSONB).
Writes to /tmp/kynda_handbook.json for bulk loading via psql.
"""
import zipfile, re, json, html

H = "/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/_PLATFORM/handbook/Kynda Coffee Employee Handbook.docx"

def extract():
    z = zipfile.ZipFile(H)
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    paras = []
    for para in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", para))
        t = html.unescape(t).strip()
        if t:
            paras.append(t)
    return paras

def is_section_header(t):
    # e.g. "I. ABOUT THE COMPANY" / "IX. HEALTH & SAFETY"
    # Reject TOC entries (which carry a trailing page number, e.g. "I. ABOUT THE COMPANY 5")
    if re.match(r"^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[A-Z]", t.strip()):
        if re.search(r"\d\s*$", t.strip()):
            return False
        return True
    return False

def main():
    paras = extract()
    # find start of body = first section header after the TOC
    start = next((i for i, t in enumerate(paras) if is_section_header(t) and i > 8), 0)
    sections = []
    cur_title = None
    cur_content = []
    order = 0
    for t in paras[start:]:
        if is_section_header(t):
            # flush previous
            if cur_title:
                sections.append({"title": cur_title, "content": cur_content, "order_index": order})
                order += 1
            cur_title = re.sub(r"^[IVX]+\.\s+", "", t).strip()
            cur_content = []
        else:
            cur_content.append(t)
    if cur_title:
        sections.append({"title": cur_title, "content": cur_content, "order_index": order})

    # drop tiny trailing sections (acknowledgement boilerplate / page numbers)
    kept = [s for s in sections if len(s["content"]) >= 2 and len(" ".join(s["content"])) > 60]
    with open("/tmp/kynda_handbook.json", "w") as f:
        json.dump(kept, f)
    print(f"Extracted {len(kept)} handbook sections from {len(paras)} paragraphs")
    for s in kept:
        print(f"  [{s['order_index']}] {s['title']}  ({len(s['content'])} paras)")

if __name__ == "__main__":
    main()
