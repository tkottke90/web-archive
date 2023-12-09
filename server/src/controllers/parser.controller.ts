import { Controller, Get, Next, Query, Response } from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { RedditScraper } from '../services';
import { YoutubeParser } from '../services/youtube.service';
import { PostTagDao } from '../dao/post-tag.dao';
import { PostDao } from '../dao/post.dao';
import { ZodQueryValidator } from '../middleware/zod.middleware';
import { z } from 'zod';

@Controller('/parsers')
export class ParserController {
  constructor(
    @Inject('RedditScraper') private readonly reddit: RedditScraper,
    @Inject('YoutubeParser') private readonly youtube: YoutubeParser,
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao
  ) {}

  @Get('/reddit')
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

  @Get('/youtube', [
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
}
