#!/usr/bin/env python3
"""產生 PWA icon(8-bit 問號方塊像素圖,純程式原創繪製、無第三方版權素材)。
零依賴:手寫 PNG(zlib + struct)。輸出 public/icons/icon-192.png / icon-512.png。"""
import struct
import zlib
from pathlib import Path

# 16x16 像素圖:B=邊框深色 Y=黃 W=亮部 D=深色(問號/鉚釘) .=背景(深夜藍)
GRID = [
    "BBBBBBBBBBBBBBBB",
    "BWWWWWWWWWWWWWYB",
    "BWDYYYYYYYYYYDYB",
    "BWYYYYDDDDYYYYYB",
    "BWYYYDDYYDDYYYYB",
    "BWYYYDDYYDDYYYYB",
    "BWYYYYYYYDDYYYYB",
    "BWYYYYYYDDYYYYYB",
    "BWYYYYYDDYYYYYYB",
    "BWYYYYYDDYYYYYYB",
    "BWYYYYYYYYYYYYYB",
    "BWYYYYYDDYYYYYYB",
    "BWYYYYYDDYYYYYYB",
    "BWDYYYYYYYYYYDYB",
    "BYYYYYYYYYYYYYYB",
    "BBBBBBBBBBBBBBBB",
]

COLORS = {
    "B": (11, 13, 20, 255),
    "Y": (251, 208, 0, 255),
    "W": (255, 232, 120, 255),
    "D": (18, 20, 29, 255),
    ".": (11, 13, 20, 255),
}


def make_png(size: int, out_path: Path) -> None:
    scale = size // 16
    raw = bytearray()
    for gy in range(16):
        row = bytearray()
        for gx in range(16):
            r, g, b, a = COLORS[GRID[gy][gx]]
            row += bytes((r, g, b, a)) * scale
        for _ in range(scale):
            raw += b"\x00" + row  # filter type 0 per scanline

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    out_path.write_bytes(png)
    print(f"wrote {out_path} ({size}x{size}, {len(png)} bytes)")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent.parent / "public" / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)
    make_png(192, out_dir / "icon-192.png")
    make_png(512, out_dir / "icon-512.png")
