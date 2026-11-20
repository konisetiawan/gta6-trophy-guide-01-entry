import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(appRoot, '.' + pathname);
  if (!filePath.startsWith(appRoot + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': types.get(path.extname(filePath)) || 'application/octet-stream' });
    response.end(content);
  });
});

server.listen(Number(process.env.PORT) || 0, '127.0.0.1', () => {
  console.log('PORT=' + server.address().port);
});
