import {
  Controller,
  Get,
  Headers,
  Next,
  Query,
  Response
} from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { RedditScraper } from '../services';
import { YoutubeParser } from '../services/youtube.service';
import { PostTagDao } from '../dao/post-tag.dao';
import { PostDao } from '../dao/post.dao';
import { ZodQueryValidator } from '../middleware/zod.middleware';
import { z } from 'zod';
import { JobScheduler } from '../jobs';
import { PARSERS } from '../routes';

@Controller(PARSERS.ROOT.relativePath)
export class ParserController {
  constructor(
    @Inject('RedditScraper') private readonly reddit: RedditScraper,
    @Inject('YoutubeParser') private readonly youtube: YoutubeParser,
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao,
    @Inject('JobScheduler') private readonly jobs: JobScheduler
  ) {}

  @Get(PARSERS.REDDIT.relativePath, [
    ZodQueryValidator(z.object({ target: z.string().url() }))
  ])
  async getRedditPost(
    @Query('target') target: string,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.reddit.getPostByUrl(target);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  @Get(PARSERS.REDDIT_BULK.relativePath)
  async redditBulk(
    @Query('target') target: string,
    @Headers('redditauth') auth: string,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const data = await this.reddit.batchPosts(target, auth ?? '');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  @Get(PARSERS.YOUTUBE.relativePath, [
    ZodQueryValidator(
      z.object({
        target: z.string(),
        nfsw: z.boolean({ coerce: true }).optional()
      })
    )
  ])
  async getYoutubeVideo(
    @Query('target') target: string,
    @Query('nfsw') nfsw: boolean,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.youtube.getVideo(target);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  @Get('*')
  getControllerEndpoints(@Response() res: express.Response) {
    res.send({
      links: {
        reddit: {
          url: PARSERS.REDDIT.path,
          method: 'GET',
          params: null,
          query: {
            target: 'string'
          },
          body: null
        },
        youtube: {
          url: PARSERS.YOUTUBE.path,
          method: 'GET',
          params: null,
          query: {
            target: 'string',
            nsfw: 'boolean'
          },
          body: null
        }
      }
    });
  }
}
