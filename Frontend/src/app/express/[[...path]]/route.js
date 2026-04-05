import http from 'node:http';
import https from 'node:https';
import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';


const BACKEND = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

export const runtime = 'nodejs';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'host'
]);

function requestBackend(method, urlObj, incomingHeaders, bodyBuf) {
  const isHttps = urlObj.protocol === 'https:';
  const lib = isHttps ? https : http;
  const port = urlObj.port || (isHttps ? 443 : 80);

  const headers = {};
  const cookie = incomingHeaders.get('cookie');
  if (cookie) headers.cookie = cookie;
  for (const name of ['accept', 'accept-language', 'content-type', 'user-agent']) {
    const v = incomingHeaders.get(name);
    if (v) headers[name] = v;
  }
  if (bodyBuf?.length) {
    headers['content-length'] = String(bodyBuf.length);
  }

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port,
        path: `${urlObj.pathname}${urlObj.search}`,
        method,
        headers
      },
      (backendRes) => {
        const chunks = [];
        backendRes.on('data', (c) => chunks.push(c));
        backendRes.on('end', () => {
          resolve({
            statusCode: backendRes.statusCode || 500,
            statusMessage: backendRes.statusMessage || '',
            rawHeaders: backendRes.rawHeaders,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('error', reject);
    if (bodyBuf?.length) req.write(bodyBuf);
    req.end();
  });
}

function extractSetCookies(rawHeaders) {
  const out = [];
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (String(rawHeaders[i]).toLowerCase() === 'set-cookie') {
      out.push(rawHeaders[i + 1]);
    }
  }
  return out;
}

function buildNextResponse({ statusCode, statusMessage, rawHeaders, body }) {
  const next = new NextResponse(body, {
    status: statusCode,
    statusText: statusMessage
  });

  const setCookies = extractSetCookies(rawHeaders);

  for (let i = 0; i < rawHeaders.length; i += 2) {
    const key = String(rawHeaders[i]);
    const val = rawHeaders[i + 1];
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k) || k === 'set-cookie') continue;
    try {
      next.headers.append(key, val);
    } catch {
      console.log("error hai bhai")
    }
  }

  for (const line of setCookies) {
    next.headers.append('Set-Cookie', line);
  }

  return next;
}

async function handle(request, context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 });
  }

  const params = await context.params;
  const segments = Array.isArray(params?.path) ? params.path : [];
  const suffix = segments.length ? `/${segments.join('/')}` : '';
  let targetUrl;
  try {
    targetUrl = new URL(`${BACKEND}${suffix}${request.nextUrl.search}`);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid BACKEND_URL' }, { status: 500 });
  }

  let bodyBuf = null;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const buf = await request.arrayBuffer();
    bodyBuf = buf.byteLength ? Buffer.from(buf) : null;
  }

  try {
    const backendRes = await requestBackend(request.method, targetUrl, request.headers, bodyBuf);
    return buildNextResponse(backendRes);
  } catch (e) {
    return NextResponse.json(
      { error: 'Proxy error', message: e instanceof Error ? e.message : 'Unknown' },
      { status: 502 }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
