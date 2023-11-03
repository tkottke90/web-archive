import {
  Controller,
  Get,
  Next,
  Post,
  Query,
  Response,
  Request,
  Body,
  Params
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
  ZodIdValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { Inject } from '@decorators/di';
import { PostDao } from '../dao/post.dao';
import multer from 'multer';
import { MultipartJson } from '../middleware';
import { PostFileDao } from '../dao/post-file.dao';
import { NotFoundError } from '../utilities/errors.util';
const upload = multer({
  dest: './uploads',
  limits: { fieldSize: 25 * 1024 * 1024 }
});

@Controller('/post')
export class PostController {
  constructor(
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao
  ) {}

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

  @Get('/:postId', [ZodIdValidator('postId')])
  async getPost(
    @Params('postId') postId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const post = await this.postDao.getById(postId);

      if (!post) {
        throw new NotFoundError('No Post with ID found ' + postId);
      }

      res.json(this.postDao.toDTO(post));
    } catch (error) {
      next(error);
    }
  }

  @Get('/:postId/files/:fileId', [ZodIdValidator('fileId')])
  async getFile(
    @Params('fileId') fileId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const content = await this.postFileDao.getById(fileId);

      if (!content) {
        throw new NotFoundError('Unable to get file');
      }

      res.json(this.postFileDao.toDTO(content));
    } catch (error) {
      next(error);
    }
  }

  @Get('/:postId/files/:fileId/content', [ZodIdValidator('fileId')])
  async getPostContent(
    @Params('fileId') fileId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const content = await this.postFileDao.getById(fileId);

      if (!content) {
        throw new NotFoundError('Unable to get file');
      }

      res.contentType(content.mime);
      res.sendFile(`${process.cwd()}/${content.filename}`);
    } catch (error) {
      next(error);
    }
  }

  @Post('/', [
    upload.fields([{ name: 'file' }]),
    MultipartJson('metadata'),
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
