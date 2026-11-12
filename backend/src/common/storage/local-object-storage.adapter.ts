import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { ObjectStoragePort } from './object-storage.port';

@Injectable()
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  private readonly rootDir = resolve(process.cwd(), '../storage');

  async putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
    const objectPath = this.resolveObjectPath(key);
    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, body);
    await writeFile(`${objectPath}.meta.json`, JSON.stringify({ mimeType }));
  }

  async getObject(key: string): Promise<Buffer> {
    return readFile(this.resolveObjectPath(key));
  }

  private resolveObjectPath(key: string): string {
    const objectPath = resolve(this.rootDir, key);
    if (!objectPath.startsWith(`${this.rootDir}${sep}`)) {
      throw new Error('Object key resolves outside storage root');
    }

    return objectPath;
  }
}
