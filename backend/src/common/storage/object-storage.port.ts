export interface ObjectStoragePort {
  putObject(key: string, body: Buffer, mimeType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
