/**
 * Optional Cloudinary upload. When CLOUDINARY_CLOUD_NAME + API key/secret are set,
 * upload images to Cloudinary and return the secure URL (stored in MongoDB only as URL).
 */

import crypto from 'crypto';
import { env } from '../config/env';

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

function sign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHmac('sha1', secret).update(sorted).digest('base64');
}

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
  _publicId?: string
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary not configured');
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = {
    timestamp,
    folder: 'zeni-listings',
  };
  const signature = sign(params, apiSecret);
  const base64 = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const body = new URLSearchParams({
    file: dataUri,
    api_key: apiKey,
    timestamp,
    signature,
    folder: 'zeni-listings',
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary did not return secure_url');
  return data.secure_url;
}
