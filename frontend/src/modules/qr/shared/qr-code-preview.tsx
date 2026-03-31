/**
 * Client-side QR image generator with download support.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { toDataURL } from 'qrcode';
import { buildShortRedirectUrl } from '@/modules/qr/shared/short-url';

interface QRCodePreviewProps {
  shortCode: string;
  fileLabel?: string;
  size?: number;
  className?: string;
}

export default function QRCodePreview({
  shortCode,
  fileLabel,
  size = 256,
  className = '',
}: QRCodePreviewProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectUrl = useMemo(() => buildShortRedirectUrl(shortCode), [shortCode]);

  useEffect(() => {
    let cancelled = false;

    async function generateQrImage() {
      if (!shortCode) {
        setImageDataUrl('');
        return;
      }

      try {
        setErrorMessage(null);
        const generated = await toDataURL(redirectUrl, {
          width: size,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#ffffff',
            light: '#121214',
          },
        });

        if (!cancelled) {
          setImageDataUrl(generated);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to generate QR image.');
          setImageDataUrl('');
        }
      }
    }

    generateQrImage();

    return () => {
      cancelled = true;
    };
  }, [redirectUrl, shortCode, size]);

  return (
    <div className={`space-y-3 rounded-md border border-muted p-3 ${className}`.trim()}>
      <p className="text-xs text-muted-foreground">Redirect URL: {redirectUrl}</p>

      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={`QR code ${shortCode}`}
          className="h-48 w-48 rounded border border-muted bg-background object-contain"
        />
      ) : (
        <div className="flex h-48 w-48 items-center justify-center rounded border border-dashed border-muted text-xs text-muted-foreground">
          {errorMessage || 'Generating QR image...'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={imageDataUrl || '#'}
          download={`${fileLabel || shortCode || 'qr-code'}.png`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          aria-disabled={!imageDataUrl}
          onClick={(event) => {
            if (!imageDataUrl) {
              event.preventDefault();
            }
          }}
        >
          Download PNG
        </a>
        <a
          href={redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          Open Redirect URL
        </a>
      </div>
    </div>
  );
}

