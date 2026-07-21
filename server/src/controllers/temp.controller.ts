import { Inject } from '@decorators/di';
import { Controller, Get, Next, Response } from '@decorators/express';
import express from 'express';
import { PostFileDao } from '../dao/post-file.dao';
import { TEMP } from '../routes';

/**
 * @deprecated Temporary controller supporting one-off data migrations.
 *
 * Currently exposes progress tracking for the placeholder backfill job
 * introduced alongside the PostFile width/height/placeholder columns.
 * Remove this controller (and the TEMP routes) in the next version, once
 * the backfill has completed in production (`pending` reaches 0).
 */
@Controller(TEMP.ROOT.path)
export class TempController {
  constructor(
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao
  ) {}

  /**
   * @deprecated Reports placeholder backfill progress. `pending` counts
   * image files the cron has not processed yet, `failed` counts files
   * where generation failed (empty-string sentinel, never retried), and
   * `complete` counts files with a generated placeholder.
   */
  @Get(TEMP.PLACEHOLDER_STATUS.path)
  async getPlaceholderStatus(
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const status = await this.postFileDao.getPlaceholderStatus();

      res.set('Deprecation', 'true');
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
}
