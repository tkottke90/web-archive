import { Controller, Get, Next, Response } from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { PostDao } from '../dao/post.dao';
import { PostFileDao } from '../dao/post-file.dao';
import { DownloadJobDao } from '../dao/download-job.dao';
import { FileSystemFactory } from '../services/file.service';
import { LoggerService } from '../services/logger.service';
import { JobScheduler } from '../jobs';
import { SYSTEM } from '../routes';

const REDDIT_JOB = 'Reddit';
const YOUTUBE_JOB = 'Youtube';

@Controller(SYSTEM.ROOT.path)
export class PostRecoveryController {
  private readonly scannerLogger: LoggerService;

  constructor(
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('DownloadJobDao')
    private readonly downloadJobsDao: DownloadJobDao,
    @Inject('FileSystemFactory')
    private readonly fileSystem: FileSystemFactory,
    @Inject('LoggerService') private readonly logger: LoggerService,
    @Inject('JobScheduler') private readonly jobs: JobScheduler
  ) {
    this.scannerLogger = this.logger.createLogger({
      location: 'PostRecoveryScanner'
    });
  }

  @Get(SYSTEM.POST_RECOVERY.path)
  async runPostRecovery(
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      this.scannerLogger.log('info', 'Starting post recovery scan');

      const posts = await this.postDao.find({});
      let postsScanned = 0;
      let postsWithMissingFiles = 0;
      let filesDeleted = 0;
      let jobsCreated = 0;

      for (const post of posts) {
        postsScanned++;
        const missingFiles = [];

        for (const file of post.files) {
          try {
            await this.fileSystem.exists(file.filename);
          } catch {
            missingFiles.push(file);
          }
        }

        if (missingFiles.length === 0) {
          continue;
        }

        postsWithMissingFiles++;
        this.scannerLogger.log('info', `Post ${post.id} has missing files`, {
          postId: post.id,
          missingFileCount: missingFiles.length,
          missingFileIds: missingFiles.map((f) => f.id)
        });

        // Determine the post type and create a recovery job
        const parser = this.getParserType(post.source);

        if (parser) {
          if (parser === REDDIT_JOB) {
            const permalink = post.metadata.find(
              (m) => m.name === 'PERMALINK'
            );
            if (permalink) {
              await this.downloadJobsDao.create([
                { parser: REDDIT_JOB, data: { url: permalink.value } }
              ]);
              this.jobs.startJob(REDDIT_JOB);
              jobsCreated++;
              this.scannerLogger.log(
                'info',
                `Created Reddit recovery job for post ${post.id}`,
                { postId: post.id, permalink: permalink.value }
              );
            } else {
              this.scannerLogger.log(
                'warn',
                `Post ${post.id} is missing PERMALINK metadata, cannot create recovery job`,
                { postId: post.id }
              );
            }
          } else if (parser === YOUTUBE_JOB) {
            await this.downloadJobsDao.create([
              {
                parser: YOUTUBE_JOB,
                data: {
                  url: post.source,
                  path: '',
                  ogFilename: '',
                  postId: post.id
                }
              }
            ]);
            this.jobs.startJob(YOUTUBE_JOB);
            jobsCreated++;
            this.scannerLogger.log(
              'info',
              `Created Youtube recovery job for post ${post.id}`,
              { postId: post.id, url: post.source }
            );
          }
        } else {
          this.scannerLogger.log(
            'warn',
            `Post ${post.id} has unknown source type, cannot create recovery job`,
            { postId: post.id, source: post.source }
          );
        }

        // Delete missing PostFile records
        for (const file of missingFiles) {
          await this.postFileDao.deleteRecord(file.id);
          filesDeleted++;
          this.scannerLogger.log(
            'info',
            `Deleted missing PostFile ${file.id} for post ${post.id}`,
            { postId: post.id, fileId: file.id, filename: file.filename }
          );
        }
      }

      this.scannerLogger.log('info', 'Post recovery scan complete', {
        postsScanned,
        postsWithMissingFiles,
        filesDeleted,
        jobsCreated
      });

      res.json({
        postsScanned,
        postsWithMissingFiles,
        filesDeleted,
        jobsCreated
      });
    } catch (error) {
      next(error);
    }
  }

  private getParserType(source: string): string | null {
    if (source.includes('reddit.com')) {
      return REDDIT_JOB;
    }

    if (
      source.includes('youtube.com') ||
      source.includes('youtu.be')
    ) {
      return YOUTUBE_JOB;
    }

    return null;
  }
}
