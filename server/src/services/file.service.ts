import { Container, Injectable } from '@decorators/di';
import {
  readdir,
  rm,
  copyFile,
  writeFile,
  access,
  constants
} from 'fs/promises';
import { basename, dirname, resolve, extname } from 'path';
import { UPLOAD_DIR } from '../config';

@Injectable()
export class FileSystemFactory {
  readonly UPLOAD_DIR = UPLOAD_DIR;

  createUploadPath(filename: string, directory: string = this.UPLOAD_DIR) {
    return resolve(directory, filename);
  }

  exists(filename: string) {
    return access(filename, constants.F_OK);
  }

  getFileParts(path: string) {
    return {
      name: basename(path, extname(path)),
      directory: dirname(path),
      fileName: basename(path),
      extension: extname(path)
    };
  }

  async mv(source: string, destination: string) {
    await copyFile(source, destination);
    await this.remove(source);
  }

  async remove(filename: string) {
    await rm(filename, { force: true });

    return filename;
  }

  async removePattern(
    pattern: RegExp | string,
    directory: string = this.UPLOAD_DIR
  ) {
    const files = await readdir(directory);

    const tester =
      pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');

    return await Promise.all(
      files
        .filter((file) => tester.test(basename(file)))
        .map((file) => this.remove(file))
    );
  }

  async upload(data: Buffer, filename: string) {
    const path = resolve(UPLOAD_DIR, filename);
    await writeFile(resolve(UPLOAD_DIR, filename), data);

    return path;
  }
}

Container.provide([
  { provide: 'FileSystemFactory', useClass: FileSystemFactory }
]);
