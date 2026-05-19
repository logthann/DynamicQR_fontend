import { NextRequest } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getBackendApiBase(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '') + '/api/v1';
}

function buildProxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      headers.set(key, value);
    }
  });

  headers.set('x-forwarded-host', request.headers.get('host') ?? '');
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  return headers;
}

async function proxyApiRequest(
  request: NextRequest,
  { params }: { params: { path?: string[] } },
): Promise<Response> {
  const backendApiBase = getBackendApiBase();
  const path = (params.path ?? []).map(encodeURIComponent).join('/');

  if (!backendApiBase) {
    console.error('[api-proxy] Missing backend API base URL');

    return Response.json(
      { message: 'Backend API URL is not configured.' },
      { status: 500 },
    );
  }

  const targetUrl = new URL(`${backendApiBase}/${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers: buildProxyHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set('cache-control', 'no-store');

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[api-proxy] Backend request failed', {
      path,
      targetUrl: targetUrl.toString(),
      message: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { message: 'Unable to reach backend API.' },
      { status: 502 },
    );
  }
}

export {
  proxyApiRequest as DELETE,
  proxyApiRequest as GET,
  proxyApiRequest as HEAD,
  proxyApiRequest as OPTIONS,
  proxyApiRequest as PATCH,
  proxyApiRequest as POST,
  proxyApiRequest as PUT,
};
