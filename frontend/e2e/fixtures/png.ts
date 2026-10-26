import { deflateSync } from "node:zlib";

/** CRC32 (PNG bo'laklari uchun) */
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Bir rangli haqiqiy PNG (RGB, 8 bit) — rasm yuklash oqimini sinash uchun. Standart o'lcham
 * backend talabidan (kichik tomoni kamida 200 px) katta.
 */
export function solidPng(
  width = 320,
  height = 240,
  rgb: [number, number, number] = [15, 118, 110],
): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit chuqurligi
  header.writeUInt8(2, 9); // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3).map((_, i) => rgb[i % 3]!)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
