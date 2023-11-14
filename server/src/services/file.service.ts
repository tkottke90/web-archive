import { Container, Injectable } from '@decorators/di';
import { writeFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { UPLOAD_DIR } from '../constants';

const writeFileAsync = promisify(writeFile);

class LocalFileSystem {
  async upload(data: Buffer, filename: string) {
    const path = resolve(UPLOAD_DIR, filename);
    await writeFileAsync(resolve(UPLOAD_DIR, filename), data);

    return path;
  }
}

@Injectable()
export class FileSystemFactory {
  upload(data: Buffer, filename: string) {
    const service = new LocalFileSystem();

    return service.upload(data, filename);
  }
}

Container.provide([
  { provide: 'FileSystemFactory', useClass: FileSystemFactory }
]);
