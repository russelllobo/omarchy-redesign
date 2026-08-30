"""Intrinsic image dimensions from file headers. No dependencies.

Covers the formats the site ships: WebP (lossy, lossless, extended), PNG, GIF,
JPEG and SVG. Returns None when a file can't be understood so callers can fall
back to leaving markup untouched.
"""
import re
import struct
from pathlib import Path

_SOF = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def _webp(head: bytes) -> tuple[int, int] | None:
    fourcc = head[12:16]
    if fourcc == b"VP8 ":
        if head[23:26] != b"\x9d\x01\x2a":
            return None
        w, h = struct.unpack("<HH", head[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if fourcc == b"VP8L":
        if head[20] != 0x2F:
            return None
        bits = int.from_bytes(head[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if fourcc == b"VP8X":
        w = int.from_bytes(head[24:27], "little") + 1
        h = int.from_bytes(head[27:30], "little") + 1
        return w, h
    return None


def _jpeg(data: bytes) -> tuple[int, int] | None:
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in _SOF:
            h, w = struct.unpack(">HH", data[i + 5 : i + 9])
            return w, h
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        i += 2 + struct.unpack(">H", data[i + 2 : i + 4])[0]
    return None


def _svg(data: bytes) -> tuple[int, int] | None:
    text = data[:4096].decode("utf-8", "replace")
    box = re.search(r'viewBox\s*=\s*"[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"', text)
    if box:
        return round(float(box.group(1))), round(float(box.group(2)))
    w = re.search(r'\swidth\s*=\s*"(\d+)', text)
    h = re.search(r'\sheight\s*=\s*"(\d+)', text)
    if w and h:
        return int(w.group(1)), int(h.group(1))
    return None


def size(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if len(data) < 30:
        return None
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return _webp(data[:32])
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    if data[:2] == b"\xff\xd8":
        return _jpeg(data)
    if path.suffix.lower() == ".svg":
        return _svg(data)
    return None
