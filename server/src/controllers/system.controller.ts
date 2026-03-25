import { Controller, Next, Post, Query, Response } from '@decorators/express';
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
export class SystemController {
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
      location: 'SystemController'
    });
  }

  @Post(SYSTEM.POST_RECOVERY.path)
  async runPostRecovery(
    @Query() query: any,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      this.scannerLogger.log('info', 'Starting post recovery scan');

      const cursor = parseInt(query.cursor, 10) || undefined;

      const posts = await this.postDao.find({
        cursor,
        skip: parseInt(query.skip, 10) || undefined,
        limit: parseInt(query.limit, 10) || 100,
        archived: false
      });
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

        // If we have no missing files but the files are not empty,
        // it means the record should be good
        if (missingFiles.length === 0 && post.files.length > 0) {
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
            const permalink = post.metadata.find((m) => m.name === 'PERMALINK');
            if (permalink) {
              await this.downloadJobsDao.create([
                {
                  parser: REDDIT_JOB,
                  data: { url: permalink.value, postId: post.id }
                }
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

  @Post(SYSTEM.AUTO_ARCHIVE.path)
  async runAutoArchive(
    @Query() query: { cursor?: string; skip?: string; limit?: string },
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      this.scannerLogger.log('info', 'Starting auto-archive scan');

      const cursor = query.cursor
        ? parseInt(query.cursor, 10) || undefined
        : undefined;

      const posts = await this.postDao.find({
        cursor,
        skip: query.skip ? parseInt(query.skip, 10) || undefined : undefined,
        limit: query.limit ? parseInt(query.limit, 10) || 100 : 100,
        archived: false
      });

      let postsScanned = 0;
      let postsArchived = 0;

      for (const post of posts) {
        postsScanned++;

        if (post.files.length === 0) {
          await this.postDao.archive(post.id);
          postsArchived++;
          this.scannerLogger.log(
            'info',
            `Archived post ${post.id} with 0 files`,
            { postId: post.id }
          );
        }
      }

      this.scannerLogger.log('info', 'Auto-archive scan complete', {
        postsScanned,
        postsArchived
      });

      res.json({
        postsScanned,
        postsArchived
      });
    } catch (error) {
      next(error);
    }
  }

  private getParserType(source: string): string | null {
    try {
      const url = new URL(source);
      const hostname = url.hostname.toLowerCase();

      if (hostname === 'reddit.com' || hostname.endsWith('.reddit.com')) {
        return REDDIT_JOB;
      }

      if (
        hostname === 'youtube.com' ||
        hostname.endsWith('.youtube.com') ||
        hostname === 'youtu.be'
      ) {
        return YOUTUBE_JOB;
      }
    } catch {
      // Invalid URL, cannot determine parser type
    }

    return null;
  }
}
