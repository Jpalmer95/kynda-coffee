#!/usr/bin/env python3
"""Parse the Kynda Training Checklist 2025/2026 docx into training_modules rows.
Each section header becomes a module; its paragraphs become markdown content.
Emits /tmp/load_training.sql (category, title, content, order_index).
"""
import zipfile, re, json, html

H = "/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/_PLATFORM/training/Kynda Training Checklist 2025.docx"

CATEGORY_MAP = {
    "Team Onboarding": "onboarding",
    "Kynda Brand Knowledge": "customer_service",
    "Coffee Bean Knowledge": "drinks",
    "POS System Knowledge": "opening",
    "Customer Service": "customer_service",
    "Opening Duties": "opening",
    "Mid Shift Duties": "closing",
    "Closing Duties": "closing",
    "Drink Recipes": "drinks",
    "Food Recipes": "food",
    "Presentation and Food Packaging": "food",
    "Lobby Maintenance": "maintenance",
    "Equipment Maintenance": "equipment",
}

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

def is_header(t):
    return bool(re.match(r"^_{1,3}\s*", t.strip()))

def main():
    paras = extract()
    sections = []
    cur_title = None
    cur_lines = []
    for t in paras:
        if is_header(t):
            if cur_title:
                sections.append((cur_title, cur_lines))
            cur_title = re.sub(r"^_{1,3}\s*", "", t).strip()
            cur_lines = []
        else:
            cur_lines.append(t)
    if cur_title:
        sections.append((cur_title, cur_lines))

    rows = []
    order = 0
    for title, lines in sections:
        cat = CATEGORY_MAP.get(title, "onboarding")
        content = "\n".join(f"- {l}" if l else l for l in lines).strip()
        if not content:
            continue
        rows.append({"title": title, "category": cat, "content": content, "order_index": order})
        order += 1

    sql_lines = []
    for r in rows:
        content_sql = r["content"].replace("'", "''")
        title_sql = r["title"].replace("'", "''")
        sql_lines.append(
            f"INSERT INTO public.training_modules (title, category, content, order_index, is_required) VALUES "
            f"('{title_sql}', '{r['category']}', '{content_sql}', {r['order_index']}, true) ON CONFLICT DO NOTHING;"
        )
    open("/tmp/load_training.sql", "w").write("\n".join(sql_lines) + "\n")
    print(f"Wrote {len(rows)} training modules to /tmp/load_training.sql")
    for r in rows:
        print(f"  [{r['category']}] {r['title']}  ({len(r['content'])} chars)")

if __name__ == "__main__":
    main()
