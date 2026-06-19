import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  // Чистим типичные повреждения ссылки (%0A, переносы строк, пробелы),
  // которые делают URL невалидным при копировании/вставке.
  const urlParam = rawUrl
    .trim()
    .replace(/%0A|%0D|%09/gi, '')
    .replace(/\s+/g, '');

  // Разрешаем только http(s) — защита от file://, data: и SSRF к локальным схемам.
  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  try {
    const fileResponse = await fetch(urlParam);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const contentType =
      fileResponse.headers.get('content-type') || 'application/octet-stream';
    const filename = urlParam.split('/').pop()?.split('?')[0] || 'download';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'no-cache');

    return new Response(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    );
  }
}
