import { Container, Inject } from '@decorators/di';
import { promisify } from 'util';
import childProcess from 'child_process';
import { FileSystemFactory } from './file.service';
import {
  YoutubeDetails,
  YoutubeJob,
  YoutubePostMetadataKeys
} from '../interfaces/youtube.interface';
import { randomUUID } from 'crypto';
import { LoggerService } from './logger.service';
import { PostDao } from '../dao/post.dao';
import { resolve } from 'path';
import { PostFileDao } from '../dao/post-file.dao';
import { stat } from 'fs/promises';
import mime from 'mime-types';
import { DownloadJobDao } from '../dao/download-job.dao';
import { JobScheduler } from '../jobs';
import { CmdOutput, spawnCommand } from '../utilities/shell.utils';
import { BaseError } from '../utilities/errors.util';

const exec = promisify(childProcess.exec);

const YOUTUBE_JOB = 'Youtube';
const FFMPEG_VIDEO_CODEC = process.env.YOUTUBE_DL_VCODEC ?? 'libx264';
const YOU_DL_CMD = process.env.YOUTUBE_DL_CMD ?? 'yt-dlp';

export class YoutubeParser {
  private parserLogger: LoggerService;

  constructor(
    @Inject('DownloadJobDao') private readonly downloadJobsDao: DownloadJobDao,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory,
    @Inject('JobScheduler') private readonly jobs: JobScheduler,
    @Inject('LoggerService') readonly logger: LoggerService,
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao
  ) {
    this.parserLogger = logger.createLogger({ location: 'YoutubeParser' });

    this.registerDownloadCronJob();
  }

  async getVideoMetadata(url: string) {
    const result = await exec(`${YOU_DL_CMD} --dump-json '${url}'`);

    return JSON.parse(result.stdout) as YoutubeDetails;
  }

  async getVideo(url: string) {
    this.parserLogger.log('info', 'Video Download Request', { url });

    this.parserLogger.log('debug', 'Fetching Video Metadata');
    const metadata = await this.getVideoMetadata(url);

    // Create a logger related to the specific metadata
    const logger = this.parserLogger.createLogger({
      url,
      source_id: metadata.id,
      location: 'YoutubeParser'
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
      this.logger.log('debug', 'No Video found in Database');
    }

    this.logger.log('info', 'Creating new post');

    const path = resolve(this.fileSystem.UPLOAD_DIR, `${randomUUID()}.mp4`);
    const post = await this.postDao.create({
      author: metadata.channel ?? metadata.uploader,
      label: metadata.title,
      source: url,
      metadata: [
        { name: YoutubePostMetadataKeys.SOURCE_ID, value: metadata.id }
      ],
      files: [
        {
          encoding: '',
          filename: 'placeholder.png',
          mime: 'image/png',
          original_filename: '',
          size: 0
        }
      ]
    });

    this.queueDownloadJob(url, path, metadata._filename, post.id);

    this.logger.log('info', 'Added video to queue');

    return post;
  }

  private async handleDownloadFailure(
    jobId: number,
    path: string,
    cmdResponse: CmdOutput,
    jobLogger: LoggerService
  ) {
    const errors = cmdResponse.stdErr.filter((line) =>
      line.startsWith('ERROR:')
    );

    jobLogger.log('info', 'Removing files downloaded');
    const fileDetails = this.fileSystem.getFileParts(path);

    const removedFiles = await this.fileSystem.removePattern(
      new RegExp(`${fileDetails.name}.*`, 'g')
    );

    jobLogger.log('info', 'Removed job files', { removedFiles });

    throw new BaseError(
      `Command Returned a Non-Zero Exit Code [Code: ${cmdResponse.code}]`,
      {
        cmd: cmdResponse.command,
        jobId,
        errors
      }
    );
  }

  private async queueDownloadJob(
    url: string,
    path: string,
    ogFilename: string,
    postId: number
  ) {
    this.logger.log('info', 'Creating upload jobs', { postId, url });

    await this.downloadJobsDao.create([
      { parser: YOUTUBE_JOB, data: { url, path, ogFilename, postId } }
    ]);

    this.jobs.startJob(YOUTUBE_JOB);
  }

  private registerDownloadCronJob() {
    this.jobs.register(
      YOUTUBE_JOB,
      async () => {
        const jobs = await this.downloadJobsDao.getNextJobs(YOUTUBE_JOB);

        if (jobs.length === 0) {
          this.logger.log('debug', 'No Youtube Jobs Found, Stopping Job');
          return this.jobs.stopJob(YOUTUBE_JOB);
        }

        await this.downloadJobsDao.startJobs(jobs.map((job) => job.id));

        for (const job of jobs) {
          const { postId, url } = job.data as YoutubeJob;
          let { path, ogFilename } = job.data as YoutubeJob;

          const jobLogger = this.logger.createLogger({
            job: job.id,
            location: 'YoutubeParser | Job: ' + job.id
          });

          try {
            // Load the metadata about the video
            const videoDetails = await this.getVideoMetadata(url);

            // For recovery jobs, path and ogFilename may be empty — derive from metadata
            if (!path) {
              path = resolve(this.fileSystem.UPLOAD_DIR, `${randomUUID()}.mp4`);
            }
            if (!ogFilename) {
              ogFilename = videoDetails._filename;
            }

            // Generate the filename where the file will be downloaded
            const downloadedFilePath = resolve(
              this.fileSystem.UPLOAD_DIR,
              this.fileSystem.getFileParts(videoDetails._filename).name + '.mp4'
            );
            // Generate pre-transcode filename
            const preTranscodeFilePath = `${this.fileSystem.UPLOAD_DIR}/${
              this.fileSystem.getFileParts(path).name
            }.raw.mp4`;

            jobLogger.log('info', `Downloading video: ${url}`, {
              targetPath: downloadedFilePath
            });

            // Trigger the download
            const downloadFileCmd = await spawnCommand(
              'Video Download',
              YOU_DL_CMD,
              [
                '--verbose',
                '--rm-cache-dir',
                '-f',
                'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
                url
              ],
              { cwd: this.fileSystem.UPLOAD_DIR }
            );

            // Process the result of the download
            if (!downloadFileCmd.success) {
              this.handleDownloadFailure(
                job.id,
                path,
                downloadFileCmd,
                jobLogger
              );
            }

            await this.fileSystem.mv(downloadedFilePath, preTranscodeFilePath);

            jobLogger.log(
              'info',
              `Transcoding video to: ${FFMPEG_VIDEO_CODEC}`,
              {
                file: preTranscodeFilePath,
                targetPath: path
              }
            );

            // Transcode to the configured video codec
            const transcodeCmd = await spawnCommand(
              'Video Transcode',
              'ffmpeg',
              [
                '-v',
                'debug',
                '-i',
                preTranscodeFilePath,
                '-vcodec',
                FFMPEG_VIDEO_CODEC,
                path
              ]
            );

            // Process transcode results
            if (!transcodeCmd.success) {
              this.handleDownloadFailure(job.id, path, transcodeCmd, jobLogger);
            }

            jobLogger.log(
              'info',
              'Transcoding Complete. Cleaning up download files'
            );

            jobLogger.log('debug', 'Removing original file', {
              targetPath: path
            });
            await this.fileSystem.remove(preTranscodeFilePath);

            jobLogger.log('debug', 'Cleanup complete', {
              targetPath: path
            });
          } catch (error: any) {
            const details = error?.toString() ?? error.message;

            jobLogger.log('error', details);
            await this.downloadJobsDao.jobError(job.id, details);
            continue;
          }

          const fileDetails = await stat(path);
          const mimeType = mime.lookup(path);

          // TODO: Get Codec/Encoding for video

          // Delete Existing Files
          const post = await this.postDao.getById(postId);
          const placeholder = post.files.find(
            (file) => (file.filename = 'placeholder.png')
          );

          if (placeholder) {
            await this.postFileDao.delete(placeholder.id);
          }

          // Upload newly created files
          await this.postFileDao.create(postId, {
            encoding: FFMPEG_VIDEO_CODEC,
            filename: path,
            original_filename: ogFilename,
            mime: mimeType ? mimeType : 'octet/stream',
            size: fileDetails.size
          });

          // Update job as complete
          await this.downloadJobsDao.completeJobs([job.id]);

          jobLogger.log('info', 'Job Completed Successfully');
        }

        this.logger.log('debug', 'Youtube Job Executed', {
          jobCount: jobs.length
        });
      },
      {
        timing: '* * * * *',
        start: true
      }
    );
  }
}

Container.provide([{ provide: 'YoutubeParser', useClass: YoutubeParser }]);
