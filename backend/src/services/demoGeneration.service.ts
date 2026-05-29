import { randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';

import { AppError } from '../errors/AppError.js';
import { saveOutput } from '../storage/localStorage.js';
import type { AspectRatio } from '../types/image.js';

import type { GenerateImageOutput } from './imageGeneration.service.js';

export const DEMO_GENERATION_PRESET_ID = 'studio-showcase';
const DEMO_GENERATION_DELAY_MS = 2_000;
const DEMO_IMAGE_WIDTH = 1024;
const DEMO_IMAGE_HEIGHT = 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = buildCrcTable();

export interface GenerateDemoImageInput {
  presetId: string;
  delayMs?: number;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export async function generateDemoImage(
  input: GenerateDemoImageInput,
): Promise<GenerateImageOutput> {
  if (input.presetId !== DEMO_GENERATION_PRESET_ID) {
    throw new AppError('BAD_REQUEST', '未知的演示预设。', 400, undefined, {
      demoPresetId: input.presetId,
    });
  }

  const delayMs = input.delayMs ?? DEMO_GENERATION_DELAY_MS;
  if (delayMs > 0) await delay(delayMs);

  const saved = await saveOutput(createDemoPng(), 'png');
  return {
    batchId: randomUUID(),
    aspectRatio: '1:1' satisfies AspectRatio,
    mode: 'text-to-image',
    images: [
      {
        filename: saved.filename,
        absolutePath: saved.absolutePath,
        mime: saved.mime,
        width: DEMO_IMAGE_WIDTH,
        height: DEMO_IMAGE_HEIGHT,
      },
    ],
  };
}

function createDemoPng(): Buffer {
  const raw = Buffer.alloc((DEMO_IMAGE_WIDTH * 4 + 1) * DEMO_IMAGE_HEIGHT);
  paintBackground(raw);
  drawCircle(raw, 212, 186, 170, rgba(217, 102, 79, 64));
  drawCircle(raw, 820, 720, 220, rgba(69, 122, 126, 58));
  fillRoundedRect(raw, 144, 132, 736, 760, 44, rgba(42, 49, 57, 232));
  fillRoundedRect(raw, 182, 172, 660, 680, 30, rgba(248, 239, 222, 255));
  fillRoundedRect(raw, 230, 218, 564, 468, 26, rgba(238, 196, 142, 255));
  paintDemoScene(raw);
  fillRoundedRect(raw, 266, 724, 492, 26, 13, rgba(42, 49, 57, 38));
  fillRoundedRect(raw, 298, 776, 428, 18, 9, rgba(42, 49, 57, 28));
  drawCircle(raw, 512, 520, 118, rgba(255, 245, 214, 42));
  return encodePng(raw, DEMO_IMAGE_WIDTH, DEMO_IMAGE_HEIGHT);
}

function paintBackground(raw: Buffer): void {
  for (let y = 0; y < DEMO_IMAGE_HEIGHT; y += 1) {
    const vertical = y / (DEMO_IMAGE_HEIGHT - 1);
    for (let x = 0; x < DEMO_IMAGE_WIDTH; x += 1) {
      const horizontal = x / (DEMO_IMAGE_WIDTH - 1);
      const warm = interpolateColor(
        { r: 245, g: 235, b: 219, a: 255 },
        { r: 223, g: 210, b: 190, a: 255 },
        vertical,
      );
      const cool = interpolateColor(
        { r: 219, g: 232, b: 226, a: 255 },
        { r: 211, g: 218, b: 225, a: 255 },
        vertical,
      );
      setPixel(raw, x, y, interpolateColor(warm, cool, horizontal * 0.34));
    }
  }
}

function paintDemoScene(raw: Buffer): void {
  fillRoundedRect(raw, 230, 218, 564, 260, 26, rgba(105, 139, 151, 255));
  drawCircle(raw, 620, 326, 70, rgba(246, 202, 112, 255));
  fillRoundedRect(raw, 230, 408, 564, 278, 0, rgba(55, 79, 83, 255));
  fillRoundedRect(raw, 280, 344, 280, 342, 0, rgba(30, 54, 61, 255));
  fillRoundedRect(raw, 464, 382, 236, 304, 0, rgba(27, 72, 75, 255));
  fillRoundedRect(raw, 246, 578, 252, 56, 28, rgba(214, 104, 82, 232));
  fillRoundedRect(raw, 502, 604, 238, 46, 23, rgba(247, 226, 185, 218));
  drawCircle(raw, 356, 470, 92, rgba(232, 170, 106, 208));
  drawCircle(raw, 396, 492, 54, rgba(249, 226, 179, 210));
  fillRoundedRect(raw, 286, 262, 160, 24, 12, rgba(255, 246, 227, 132));
  fillRoundedRect(raw, 286, 300, 110, 14, 7, rgba(255, 246, 227, 96));
  fillRoundedRect(raw, 618, 536, 108, 126, 14, rgba(232, 230, 194, 154));
  drawCircle(raw, 666, 526, 42, rgba(244, 219, 134, 166));
}

function encodePng(raw: Buffer, width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function setPixel(raw: Buffer, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= DEMO_IMAGE_WIDTH || y >= DEMO_IMAGE_HEIGHT) return;
  const row = y * (DEMO_IMAGE_WIDTH * 4 + 1);
  const offset = row + 1 + x * 4;
  raw[offset] = color.r;
  raw[offset + 1] = color.g;
  raw[offset + 2] = color.b;
  raw[offset + 3] = color.a;
}

function blendPixel(raw: Buffer, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= DEMO_IMAGE_WIDTH || y >= DEMO_IMAGE_HEIGHT) return;
  const row = y * (DEMO_IMAGE_WIDTH * 4 + 1);
  const offset = row + 1 + x * 4;
  const alpha = color.a / 255;
  raw[offset] = Math.round(color.r * alpha + raw[offset]! * (1 - alpha));
  raw[offset + 1] = Math.round(color.g * alpha + raw[offset + 1]! * (1 - alpha));
  raw[offset + 2] = Math.round(color.b * alpha + raw[offset + 2]! * (1 - alpha));
  raw[offset + 3] = 255;
}

function fillRoundedRect(
  raw: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: Rgba,
): void {
  const right = x + width - 1;
  const bottom = y + height - 1;
  for (let yy = y; yy <= bottom; yy += 1) {
    for (let xx = x; xx <= right; xx += 1) {
      const dx = xx < x + radius ? x + radius - xx : xx > right - radius ? xx - (right - radius) : 0;
      const dy =
        yy < y + radius ? y + radius - yy : yy > bottom - radius ? yy - (bottom - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(raw, xx, yy, color);
    }
  }
}

function drawCircle(raw: Buffer, cx: number, cy: number, radius: number, color: Rgba): void {
  const left = Math.max(0, cx - radius);
  const right = Math.min(DEMO_IMAGE_WIDTH - 1, cx + radius);
  const top = Math.max(0, cy - radius);
  const bottom = Math.min(DEMO_IMAGE_HEIGHT - 1, cy + radius);
  const radiusSquared = radius * radius;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSquared) blendPixel(raw, x, y, color);
    }
  }
}

function interpolateColor(from: Rgba, to: Rgba, amount: number): Rgba {
  return rgba(
    Math.round(from.r + (to.r - from.r) * amount),
    Math.round(from.g + (to.g - from.g) * amount),
    Math.round(from.b + (to.b - from.b) * amount),
    Math.round(from.a + (to.a - from.a) * amount),
  );
}

function rgba(r: number, g: number, b: number, a: number): Rgba {
  return { r, g, b, a };
}
