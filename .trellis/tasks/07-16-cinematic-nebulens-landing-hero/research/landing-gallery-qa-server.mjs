import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = 'http://127.0.0.1:5173';
const root = resolve(import.meta.dirname, '../../../../output/imagegen');
const gallery = [
  ['gallery-1.png', 'nebulens-hero-option-1-faithful-1440x1024.png', '月光下的未来影像工作室'],
  ['gallery-2.png', 'nebulens-hero-option-2-cinematic-1440x1024.png', '雾气与灯光交叠的电影场景'],
  ['gallery-3.png', 'nebulens-hero-option-3-restrained-1440x1024.png', '安静克制的视觉创作空间'],
  ['gallery-4.png', 'nebulens-option-1-editorial-workbench-1440x1024.png', '编辑部风格的图像工作台'],
  ['gallery-5.png', 'nebulens-option-2-gallery-studio-1440x1024.png', '画廊式创意影像空间'],
  ['gallery-6.png', 'nebulens-option-3-maker-desk-1440x1024.png', '创作者桌面的光影与材质'],
];
const imageById = new Map(gallery.map(([id, file]) => [id, resolve(root, file)]));
const records = gallery.map(([id, _file, prompt], index) => ({
  id,
  createdAt: new Date(Date.UTC(2026, 6, 27, 10, 0, 0) - index * 60000).toISOString(),
  prompt,
  model: 'gpt-image-2',
  width: 1440,
  height: 1024,
  isPublic: true,
}));

function headers(contentType) {
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Content-Type': contentType,
  };
}

createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers('application/json; charset=utf-8'));
    response.end();
    return;
  }

  if (request.url === '/api/auth/get-session') {
    response.writeHead(200, headers('application/json; charset=utf-8'));
    response.end('null');
    return;
  }

  if (request.url === '/api/history/public') {
    response.writeHead(200, headers('application/json; charset=utf-8'));
    response.end(JSON.stringify({ records }));
    return;
  }

  const outputMatch = request.url?.match(/^\/api\/outputs\/([^/?]+)$/);
  const imagePath = outputMatch ? imageById.get(decodeURIComponent(outputMatch[1])) : undefined;
  if (imagePath) {
    response.writeHead(200, headers('image/png'));
    response.end(readFileSync(imagePath));
    return;
  }

  response.writeHead(404, headers('application/json; charset=utf-8'));
  response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'QA endpoint not found' } }));
}).listen(3000, '127.0.0.1');