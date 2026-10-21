#!/usr/bin/env python3
"""
Microsoft MarkItDown Bridge for Pure-Read
Converts Webpages, PDFs, DOCX, and other documents into Markdown.
"""

import sys
import os
import io
import json
import argparse
import re
import urllib.parse
import types
import base64
import requests

# Prevent loading magika/onnxruntime/numpy deep learning models which crash
# on CPUs or VMs (QEMU/KVM/Proxmox) lacking x86-64-v2 microarchitecture support.
# MarkItDown only uses magika for secondary stream identification, which is not needed
# because file extensions and HTTP content-types are already known.
try:
    import numpy
except (RuntimeError, ImportError, Exception):
    sys.modules["numpy"] = None
    sys.modules["pandas"] = None

mock_magika = types.ModuleType("magika")
class MockMagikaResult:
    status = "error"
class MockMagika:
    def identify_stream(self, file_stream):
        return MockMagikaResult()
    def identify_bytes(self, b):
        return MockMagikaResult()
    def identify_path(self, p):
        return MockMagikaResult()

mock_magika.Magika = MockMagika
sys.modules["magika"] = mock_magika

from markitdown import MarkItDown

def clean_markdown_text(text: str) -> str:
    if not text:
        return ""
    # Normalize newline characters
    return text.replace("\r\n", "\n").strip()

def extract_title_from_markdown(markdown: str, fallback: str = "Untitled Document") -> str:
    if not markdown:
        return fallback
    # Look for first markdown heading (# Title or ## Title)
    lines = markdown.split("\n")
    for line in lines:
        line_clean = line.strip()
        if line_clean.startswith("#"):
            heading = re.sub(r"^#+\s*", "", line_clean).strip()
            # Avoid using generic "Page 1" as title
            if heading and not re.match(r"^Page\s+\d+$", heading, re.IGNORECASE):
                return heading
        # If no heading yet, check first non-empty line with letters
        elif line_clean and re.search(r"[a-zA-Z0-9]", line_clean) and len(line_clean) < 100:
            if not re.match(r"^Page\s+\d+$", line_clean, re.IGNORECASE):
                return line_clean
    return fallback

def extract_excerpt(markdown: str, max_length: int = 220) -> str:
    if not markdown:
        return ""
    lines = markdown.split("\n")
    paragraphs = []
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        if cleaned.startswith("#") or cleaned.startswith("|") or cleaned.startswith("!"):
            continue
        paragraphs.append(cleaned)
        if len(" ".join(paragraphs)) >= max_length:
            break
    combined = " ".join(paragraphs).strip()
    if len(combined) > max_length:
        return combined[:max_length].rstrip() + "..."
    return combined

def determine_file_type(path_or_url: str) -> str:
    lower = path_or_url.lower().split("?")[0]
    if lower.endswith(".pdf"):
        return "pdf"
    if lower.endswith(".docx") or lower.endswith(".doc"):
        return "docx"
    if lower.endswith(".epub"):
        return "epub"
    if lower.endswith(".xlsx") or lower.endswith(".xls") or lower.endswith(".csv"):
        return "spreadsheet"
    if lower.endswith(".pptx") or lower.endswith(".ppt"):
        return "presentation"
    if lower.startswith("http://") or lower.startswith("https://"):
        return "web"
    return "file"

def extract_pdf_fallback(pdf_bytes: bytes) -> str:
    """
    Fallback for scanned PDFs or PDFs with no embedded text streams.
    First attempts OCR via pytesseract + pypdfium2.
    If OCR is unavailable or yields nothing, renders page images as Markdown images.
    """
    try:
        import pypdfium2 as pdfium
    except ImportError:
        return ""

    try:
        pdf = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
    except Exception:
        return ""

    total_pages = len(pdf)
    if total_pages == 0:
        pdf.close()
        return ""

    # 1. Attempt OCR if pytesseract is available
    try:
        import pytesseract
        pages_text = []
        for i, page in enumerate(pdf):
            pil_img = page.render(scale=2.0).to_pil()
            page.close()
            txt = pytesseract.image_to_string(pil_img).strip()
            if txt:
                pages_text.append(f"## Page {i + 1}\n\n{txt}")
        pdf.close()
        combined = "\n\n".join(pages_text).strip()
        if len(combined) > 50:
            return combined
    except Exception:
        pass

    # 2. Fallback: Render each page as an embedded base64 image
    try:
        pdf = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
        img_markdown = []
        for i, page in enumerate(pdf):
            pil_img = page.render(scale=1.5).to_pil()
            page.close()
            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            img_markdown.append(f"## Page {i + 1}\n\n![Page {i + 1}](data:image/jpeg;base64,{b64})")
        pdf.close()
        return "\n\n".join(img_markdown)
    except Exception:
        return ""

def main():
    parser = argparse.ArgumentParser(description="Convert documents to Markdown using MarkItDown")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", help="Path to local file to convert")
    group.add_argument("--url", help="URL to convert")
    group.add_argument("--stdin-html", action="store_true", help="Read HTML from stdin and convert")
    parser.add_argument("--title", help="Optional title override")
    parser.add_argument("--original-name", help="Original filename for uploads")

    args = parser.parse_args()
    md = MarkItDown()

    try:
        if args.stdin_html:
            html_content = sys.stdin.read()
            stream = io.BytesIO(html_content.encode("utf-8"))
            result = md.convert_stream(stream, file_extension=".html")
            source_type = "web"
            site_name = "Web Article"
            default_fallback_title = "Web Article"
            markdown = clean_markdown_text(result.text_content or "")
        elif args.file:
            file_path = os.path.abspath(args.file)
            if not os.path.exists(file_path):
                print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
                sys.exit(1)
            
            result = md.convert(file_path)
            orig_name = args.original_name or os.path.basename(file_path)
            source_type = determine_file_type(orig_name)
            
            # Format siteName nicely (e.g., 'PDF Document', 'DOCX Document')
            type_names = {
                "pdf": "PDF Document",
                "docx": "DOCX Document",
                "epub": "EPUB Book",
                "spreadsheet": "Spreadsheet",
                "presentation": "Presentation",
                "file": "Local Document"
            }
            site_name = type_names.get(source_type, "Document")
            name_no_ext = os.path.splitext(orig_name)[0].replace("_", " ").replace("-", " ").strip()
            default_fallback_title = name_no_ext or orig_name
            markdown = clean_markdown_text(result.text_content or "")

            # Check if PDF returned empty/minimal text (scanned PDF)
            if source_type == "pdf" and len(markdown.strip()) < 50:
                with open(file_path, "rb") as f:
                    fallback_text = extract_pdf_fallback(f.read())
                    if fallback_text:
                        markdown = fallback_text
        else:
            url = args.url.strip()
            source_type = determine_file_type(url)
            try:
                parsed_url = urllib.parse.urlparse(url)
                site_name = parsed_url.hostname.replace("www.", "") if parsed_url.hostname else "Web Article"
            except Exception:
                site_name = "Web Article"
            default_fallback_title = "Web Article"

            result = md.convert(url)
            markdown = clean_markdown_text(result.text_content or "")

            # Check if PDF returned empty/minimal text (scanned PDF)
            if source_type == "pdf" and len(markdown.strip()) < 50:
                try:
                    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}, timeout=30)
                    if resp.ok:
                        fallback_text = extract_pdf_fallback(resp.content)
                        if fallback_text:
                            markdown = fallback_text
                except Exception:
                    pass

        # Determine title
        extracted_title = getattr(result, "title", None)
        title = args.title or extracted_title or extract_title_from_markdown(markdown, default_fallback_title)
        
        # Word count and reading time
        words = len(re.findall(r"\b\w+\b", markdown))
        reading_time = max(1, (words + 219) // 220)
        excerpt = extract_excerpt(markdown)

        output = {
            "success": True,
            "title": title,
            "markdown": markdown,
            "excerpt": excerpt,
            "siteName": site_name,
            "fileType": source_type,
            "wordCount": words,
            "readingTimeMinutes": reading_time,
            "author": None
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
