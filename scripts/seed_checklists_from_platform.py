#!/usr/bin/env python3
"""Parse the Kynda Shift Duties 2025 docx into the three shift checklists
(opening / mid-shift / closing) and emit SQL to update the `checklists` table
(items JSONB = [{text, order, is_critical}]).
"""
import zipfile, re, json, html

H = "/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/_PLATFORM/checklists/Shift Duties 2025.docx"

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

def main():
    paras = extract()
    # Headers
    headers = {
        "opening": "KYNDA OPENING DUTIES",
        "mid-shift": "KYNDA MID-SHIFT DUTIES",
        "closing": "KYNDA CLOSING DUTIES",
    }
    idx = {}
    for i, t in enumerate(paras):
        key = t.strip().upper()
        if key in headers.values():
            # map back to type
            for typ, h in headers.items():
                if key == h:
                    idx[typ] = i
    order_list = ["opening", "mid-shift", "closing"]
    items = {}
    for j, typ in enumerate(order_list):
        start = idx.get(typ)
        if start is None:
            print(f"WARN: {typ} header not found"); continue
        end = idx.get(order_list[j+1], len(paras)) if j+1 < len(order_list) else len(paras)
        chunk = paras[start+1:end]
        # items are non-empty paragraphs (skip pure page-number/whitespace)
        chunk_items = []
        for t in chunk:
            if t.strip() and not re.match(r"^(Tab \d|Page)", t, re.I):
                chunk_items.append({"text": t.strip(), "order": len(chunk_items)+1, "is_critical": False})
        items[typ] = chunk_items

    # Emit SQL updates
    lines = []
    for typ in order_list:
        if typ not in items:
            continue
        arr = json.dumps(items[typ]).replace("'", "''")
        title = {
            "opening": "Opening Shift Checklist",
            "mid-shift": "Mid-Shift Checklist",
            "closing": "Closing Shift Checklist",
        }[typ]
        lines.append(
            f"UPDATE public.checklists SET items='{arr}'::jsonb, description='{title} — from Shift Duties 2025'::text WHERE type='{typ}';"
        )
    sql = "\n".join(lines) + "\n"
    open("/tmp/load_checklists.sql", "w").write(sql)
    print("Generated /tmp/load_checklists.sql")
    for typ in order_list:
        print(f"  {typ}: {len(items.get(typ, []))} items")

if __name__ == "__main__":
    main()
