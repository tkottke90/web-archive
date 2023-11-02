import {
  Controller,
  Get,
  Next,
  Post,
  Query,
  Response,
  Request,
  Body
} from '@decorators/express';
import express from 'express';
import {
  PostCreateDTO,
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
import multer from 'multer';
const upload = multer({
  dest: './uploads',
  limits: { fieldSize: 25 * 1024 * 1024 }
});

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

  @Post('/', [
    upload.fields([{ name: 'file' }]),
    (req, res, next) => {
      try {
        if (req.body.metadata) {
          req.body.metadata = req.body.metadata.map((item: string) =>
            JSON.parse(item)
          );
        }
        next();
      } catch (err) {
        next(err);
      }
    },
    ZodBodyValidator(PostCreateSchema)
  ])
  async createPost(
    @Request('files') files: Record<string, Express.Multer.File[]>,
    @Response() res: express.Response,
    @Body() body: PostCreateDTO,
    @Next() next: express.NextFunction
  ) {
    try {
      const { file } = files;

      const result = await this.postDao.create({
        ...body,
        files: file.map((f) => ({
          encoding: f.encoding,
          filename: f.path,
          original_filename: f.originalname,
          mime: f.mimetype,
          size: f.size
        }))
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
