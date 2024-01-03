import { Container, Injectable } from '@decorators/di';
import { rm, writeFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { UPLOAD_DIR } from '../config';

const writeFileAsync = promisify(writeFile);
const rmFileAsync = promisify(rm);

class LocalFileSystem {
  async upload(data: Buffer, filename: string) {
    const path = resolve(UPLOAD_DIR, filename);
    await writeFileAsync(resolve(UPLOAD_DIR, filename), data);

    return path;
  }

  async remove(filename: string) {
    await rmFileAsync(filename, { force: true });
  }
}

@Injectable()
export class FileSystemFactory {
  readonly UPLOAD_DIR = UPLOAD_DIR;

  createUploadPath(filename: string) {
    return resolve(UPLOAD_DIR, filename);
  }

  upload(data: Buffer, filename: string) {
    const service = new LocalFileSystem();

    return service.upload(data, filename);
  }

  remove(filename: string) {
    const service = new LocalFileSystem();

    return service.remove(filename);
  }
}

Container.provide([
  { provide: 'FileSystemFactory', useClass: FileSystemFactory }
]);
