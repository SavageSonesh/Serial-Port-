"""HTTP range-request support so <video> scrubbing works for local files."""
import re
from pathlib import Path

from fastapi import HTTPException, Request
from starlette.responses import Response, StreamingResponse

CHUNK_SIZE = 1024 * 1024
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


def serve_file_with_range(request: Request, path: Path, media_type: str) -> Response:
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    if not range_header:
        def full_iter():
            with open(path, "rb") as f:
                while chunk := f.read(CHUNK_SIZE):
                    yield chunk

        return StreamingResponse(
            full_iter(),
            media_type=media_type,
            headers={"Content-Length": str(file_size), "Accept-Ranges": "bytes"},
        )

    match = RANGE_RE.match(range_header)
    if not match:
        raise HTTPException(status_code=416, detail="Invalid range header.")

    start_str, end_str = match.groups()
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1
    end = min(end, file_size - 1)
    if start > end or start >= file_size:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable.")

    length = end - start + 1

    def range_iter():
        with open(path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
    }
    return StreamingResponse(range_iter(), status_code=206, media_type=media_type, headers=headers)
