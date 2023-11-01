import {
  Controller,
  Get,
  Next,
  Post,
  Query,
  Response
} from '@decorators/express';
import express from 'express';
import {
  PostCreateSchema,
  PostQueryDTO,
  PostQuerySchema
} from '../dto/post.dto';
import {
  ZodBodyValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { Inject } from '@decorators/di';
import { PostDao } from '../dao/post.dao';

@Controller('/post')
export class PostController {
  constructor(@Inject('PostDao') private readonly postDao: PostDao) {}

  @Get('/', [ZodQueryValidator(PostQuerySchema)])
  async getPosts(
    @Response() res: express.Response,
    @Query() query: PostQueryDTO,
    @Next() next: express.NextFunction
  ) {
    try {
      const posts = await this.postDao.find(query);

      res.send(posts.map((p) => this.postDao.toDTO(p)));
    } catch (error) {
      next(error);
    }
  }

  @Post('/', [ZodBodyValidator(PostCreateSchema)])
  async createPost(
    @Response() res: express.Response,
    @Query() query: PostQueryDTO,
    @Next() next: express.NextFunction
  ) {
    try {
      const posts = await this.postDao.find(query);

      res.send(posts.map((p) => this.postDao.toDTO(p)));
    } catch (error) {
      next(error);
    }
  }
}
