import { Controller, Get, Next, Query, Response } from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { RedditScraper } from '../services';

@Controller('/parsers')
export class ParserController {
  constructor(
    @Inject('RedditScraper') private readonly reddit: RedditScraper
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
}
