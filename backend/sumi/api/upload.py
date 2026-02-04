"""File upload endpoint — extracts text from uploaded files."""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upload"])

# 10 MB max per file
MAX_FILE_SIZE = 10 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf", ".docx"}


class UploadResponse(BaseModel):
    text: str
    file_names: list[str]
    char_count: int


async def _extract_text(file: UploadFile) -> str:
    """Read an uploaded file and extract its text content."""
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File '{file.filename}' exceeds the 10 MB size limit",
        )

    suffix = Path(file.filename or "").suffix.lower()

    if suffix in (".md", ".txt", ""):
        # Plain text / markdown — decode directly
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1")

    if suffix == ".pdf":
        return _extract_pdf(content, file.filename or "file.pdf")

    raise HTTPException(
        status_code=415,
        detail=f"Unsupported file type '{suffix}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
    )


def _extract_pdf(content: bytes, filename: str) -> str:
    """Extract text from a PDF file using pypdf."""
    try:
        import pypdf
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF support requires the 'pypdf' package. Install it with: pip install pypdf",
        )

    import io

    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        if not pages:
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract text from '{filename}'. The PDF may be image-only.",
            )
        return "\n\n".join(pages)
    except pypdf.errors.PdfReadError as e:
        raise HTTPException(status_code=422, detail=f"Invalid PDF file '{filename}': {e}")


@router.post("/upload", response_model=UploadResponse)
async def upload_files(files: list[UploadFile]):
    """Upload one or more files and extract their text content.

    Supports .md, .txt, and .pdf files. Multiple files are concatenated
    with clear section markers.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    extracted = []
    file_names = []

    for file in files:
        if not file.filename:
            continue

        suffix = Path(file.filename).suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS and suffix != "":
            raise HTTPException(
                status_code=415,
                detail=(
                    f"Unsupported file type '{suffix}' for '{file.filename}'. "
                    f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
                ),
            )

        text = await _extract_text(file)
        if text.strip():
            extracted.append(text.strip())
            file_names.append(file.filename)

    if not extracted:
        raise HTTPException(status_code=422, detail="No text could be extracted from the uploaded files")

    # Join multiple files with section markers
    if len(extracted) == 1:
        combined = extracted[0]
    else:
        sections = []
        for name, text in zip(file_names, extracted):
            sections.append(f"--- {name} ---\n\n{text}")
        combined = "\n\n".join(sections)

    logger.info(
        "Extracted %d chars from %d file(s): %s",
        len(combined),
        len(file_names),
        ", ".join(file_names),
    )

    return UploadResponse(
        text=combined,
        file_names=file_names,
        char_count=len(combined),
    )
