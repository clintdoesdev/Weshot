import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * File storage. Cloudflare R2 through the S3 API in production; a local folder in development
 * (when R2_ACCOUNT_ID is empty), served by the web app at /api/files/*.
 */
export interface Storage {
  readonly kind: 'r2' | 'local';
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  /** Public URL of an object (CDN in production). */
  publicUrl(key: string): string;
  /** URL the browser can PUT to directly. */
  presignPut(key: string, contentType: string, maxBytes: number): Promise<{ url: string; headers: Record<string, string> }>;
  size(key: string): Promise<number | null>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const KEY_RE = /^(captures|recordings|templates|shares)\/[\w\-/.]+$/;

export function assertKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes('..')) throw new Error(`Invalid storage key ${key}`);
}

export function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

class R2Storage implements Storage {
  readonly kind = 'r2';
  private client: S3Client;
  constructor(
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
    private bucket: string,
    private publicBase: string,
  ) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  async put(key: string, body: Buffer | Uint8Array, contentType: string) {
    assertKey(key);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=86400, immutable' }),
    );
  }
  publicUrl(key: string) {
    return `${this.publicBase.replace(/\/$/, '')}/${key}`;
  }
  async presignPut(key: string, contentType: string, maxBytes: number) {
    assertKey(key);
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 600 },
    );
    void maxBytes; // R2 presigned PUTs cannot enforce a size; /api/share checks the object size afterwards.
    return { url, headers: { 'content-type': contentType } };
  }
  async size(key: string) {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? null;
    } catch {
      return null;
    }
  }
  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export class LocalStorage implements Storage {
  readonly kind = 'local';
  constructor(
    readonly root: string,
    private secret: string,
  ) {}
  path(key: string): string {
    assertKey(key);
    const p = resolve(this.root, key);
    if (!p.startsWith(resolve(this.root) + sep)) throw new Error('Invalid key');
    return p;
  }
  async put(key: string, body: Buffer | Uint8Array, contentType: string) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    await writeFile(`${p}.type`, contentType);
  }
  publicUrl(key: string) {
    return `/api/files/${key}`;
  }
  sign(key: string, contentType: string, maxBytes: number, exp: number): string {
    return createHmac('sha256', this.secret).update(`${key}\n${contentType}\n${maxBytes}\n${exp}`).digest('hex');
  }
  verify(key: string, contentType: string, maxBytes: number, exp: number, sig: string): boolean {
    if (exp < Date.now() / 1000) return false;
    const expected = Buffer.from(this.sign(key, contentType, maxBytes, exp));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
  async presignPut(key: string, contentType: string, maxBytes: number) {
    assertKey(key);
    const exp = Math.floor(Date.now() / 1000) + 600;
    const q = new URLSearchParams({ ct: contentType, max: String(maxBytes), exp: String(exp), sig: this.sign(key, contentType, maxBytes, exp) });
    return { url: `/api/files/${key}?${q}`, headers: { 'content-type': contentType } };
  }
  async read(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const p = this.path(key);
      const [body, contentType] = await Promise.all([readFile(p), readFile(`${p}.type`, 'utf8').catch(() => 'application/octet-stream')]);
      return { body, contentType };
    } catch {
      return null;
    }
  }
  async get(key: string) {
    return (await this.read(key))?.body ?? null;
  }
  async size(key: string) {
    try {
      return (await stat(this.path(key))).size;
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const p = this.path(key);
    await rm(p, { force: true });
    await rm(`${p}.type`, { force: true });
  }
}

let storage: Storage | null = null;

export function getStorage(): Storage {
  if (storage) return storage;
  const env = process.env;
  if (env.R2_ACCOUNT_ID) {
    storage = new R2Storage(
      env.R2_ACCOUNT_ID,
      env.R2_ACCESS_KEY_ID ?? '',
      env.R2_SECRET_ACCESS_KEY ?? '',
      env.R2_BUCKET || 'weshot',
      env.R2_PUBLIC_BASE_URL || 'https://cdn.weshot.app',
    );
  } else {
    const root = env.STORAGE_DIR || join(findRepoRoot(), '.data/storage');
    storage = new LocalStorage(root, env.CRON_SECRET || 'local-dev-secret');
  }
  return storage;
}

function findRepoRoot(): string {
  // Web runs from apps/web, the worker from apps/worker; both share <repo>/.data.
  const cwd = process.cwd();
  return /[\\/]apps[\\/](web|worker)$/.test(cwd) ? resolve(cwd, '../..') : cwd;
}
