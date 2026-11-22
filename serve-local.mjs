import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const host = '127.0.0.1';
const preferredPort = 8765;
const lastPort = 8774;
let port = preferredPort;
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.bcmap', 'application/octet-stream'],
  ['.ttf', 'font/ttf'],
  ['.pfb', 'application/octet-stream']
]);

const server = createServer(async (request, response) => {
  try {
    const {pathname} = new URL(request.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    const type = types.get(extname(path));
    if (!path.startsWith(root + sep) || !type || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end();
      return;
    }
    const data = await readFile(path);
    response.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status = error instanceof URIError ? 400 : ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    response.writeHead(status).end();
  }
});

function localUrl(port) {
  return `http://${host}:${port}/`;
}

function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;
  const browser = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'start', url], {windowsHide: true});
  browser.on('error', () => console.log(`Open this address in your browser: ${url}`));
  browser.on('exit', code => {
    if (code !== 0) console.log(`Open this address in your browser: ${url}`);
  });
}

async function servesThisApp(url) {
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(1000), redirect: 'error'});
    if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) {
      await response.body?.cancel();
      return false;
    }
    return await response.text() === await readFile(resolve(root, 'index.html'), 'utf8');
  } catch {
    return false;
  }
}

server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    const url = localUrl(port);
    if (await servesThisApp(url)) {
      console.log(`Folio English is already running at ${url}`);
      openBrowser(url);
      return;
    }
    if (port < lastPort) {
      port++;
      server.listen(port, host);
      return;
    }
    console.error(`All Folio English ports (${preferredPort}-${lastPort}) are in use.`);
  } else {
    console.error('Could not start Folio English:', error.message);
  }
  process.exitCode = 1;
});

server.on('listening', () => {
  const url = localUrl(port);
  console.log(`Folio English is running at ${url}`);
  openBrowser(url);
});

server.listen(port, host);
