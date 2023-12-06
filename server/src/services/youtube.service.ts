import { Container, Inject } from '@decorators/di';
import { promisify } from 'util';
import childProcess from 'child_process';
import { FileSystemFactory } from './file.service';
import {
  YoutubeDetails,
  YoutubePostMetadataKeys
} from '../interfaces/youtube.interface';
import { randomUUID } from 'crypto';
import { LoggerService } from './logger.service';
import { PostDao } from '../dao/post.dao';
import { resolve } from 'path';
import { PostFileDao } from '../dao/post-file.dao';
import { stat } from 'fs/promises';
import mime from 'mime-types';

const exec = promisify(childProcess.exec);

export class YoutubeParser {
  private parserLogger: LoggerService;

  constructor(
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory,
    @Inject('LoggerService') readonly logger: LoggerService,
    @Inject('PostDao') private readonly postDao: PostDao
  ) {
    this.parserLogger = logger.createLogger({ location: 'YoutubeParser' });
  }

  async getVideoMetadata(url: string) {
    const result = await exec(`youtube-dl --dump-json '${url}'`);

    return JSON.parse(result.stdout) as YoutubeDetails;
  }

  async queueVideoDownload(
    url: string,
    ogFilename: string,
    postId: number,
    logger: LoggerService
  ) {
    const path = resolve(this.fileSystem.UPLOAD_DIR, `${randomUUID()}.mp4`);

    logger.log('info', 'Starting download');
    await exec(
      `youtube-dl -o '${path}' -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4' '${url}'`
    );

    logger.log('info', 'Download Complete');

    const fileDetails = await stat(path);
    const mimeType = mime.contentType(path);

    await this.postFileDao.create(postId, {
      encoding: '',
      filename: path,
      original_filename: ogFilename,
      mime: mimeType ? mimeType : 'octet/stream',
      size: fileDetails.size
    });

    logger.log('info', 'Youtube Video Registered in Database');
  }

  async getVideo(url: string) {
    this.parserLogger.log('info', 'Video Download Request', { url });

    this.parserLogger.log('debug', 'Fetching Video Metadata');
    const metadata = await this.getVideoMetadata(url);

    // Create a logger related to the specific metadata
    const logger = this.parserLogger.createLogger({
      url,
      source_id: metadata.id
    });

    logger.log('debug', 'Checking for post with matching ID');
    const existingPost = await this.postDao.getByMetadataValue(
      YoutubePostMetadataKeys.SOURCE_ID,
      metadata.id
    );

    if (existingPost) {
      logger.log('debug', 'Existing Youtube Video Found', {
        internal_id: existingPost.id
      });

      return existingPost;
    } else {
      logger.log('debug', 'No Video found in Database');
    }

    logger.log('info', 'Creating new post');
    const post = await this.postDao.create({
      author: metadata.channel ?? metadata.uploader,
      label: metadata.title,
      source: url,
      metadata: [
        { name: YoutubePostMetadataKeys.SOURCE_ID, value: metadata.id }
      ],
      files: []
    });

    this.queueVideoDownload(url, metadata._filename, post.id, logger);

    logger.log('info', 'Added video to queue');

    return post;
  }
}

Container.provide([{ provide: 'YoutubeParser', useClass: YoutubeParser }]);
