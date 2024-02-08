import {
  Controller,
  Get,
  Next,
  Post,
  Query,
  Response,
  Request,
  Body,
  Params,
  Delete
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
import { BadRequestError, NotFoundError } from '../utilities/errors.util';
import { PostTagDao } from '../dao/post-tag.dao';
import { TagDao } from '../dao/tag.dao';
import { ROUTES, UPLOAD_DIR } from '../config';
import { z } from 'zod';
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fieldSize: 25 * 1024 * 1024 }
});
import { POSTS } from '../routes';

@Controller(POSTS.ROOT.relativePath)
export class PostController {
  constructor(
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao,
    @Inject('TagDao') private readonly tagDao: TagDao
  ) {}

  @Get('/', [ZodQueryValidator(PostQuerySchema)])
  async getPosts(
    @Response() res: express.Response,
    @Query() query: PostQueryDTO,
    @Next() next: express.NextFunction
  ) {
    try {
      const posts = await this.postDao.find(query);

      res.json({
        pagination: await this.postDao.paginationDetails(query),
        data: posts.map((p) => this.postDao.toDTO(p))
      });
    } catch (error) {
      next(error);
    }
  }

  @Get(POSTS.WITH_ID.relativePath, [ZodIdValidator('postId')])
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

  @Delete(POSTS.WITH_ID.relativePath, [ZodIdValidator('postId')])
  async deletePost(
    @Params('postId') postId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      await this.postDao.remove(postId);

      res.status(204).json({});
    } catch (error) {
      next(error);
    }
  }

  @Get(POSTS.FILES_WITH_ID.relativePath, [ZodIdValidator('fileId')])
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

  @Get(POSTS.FILES_CONTENT.relativePath, [ZodIdValidator('fileId')])
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
      res.sendFile(content.filename);
    } catch (error) {
      next(error);
    }
  }

  @Get(POSTS.TAG_SEARCH.relativePath, [
    ZodIdValidator('postId'),
    ZodQueryValidator(
      z.object({
        limit: z.number({ coerce: true }).optional(),
        filter: z.string().optional()
      })
    )
  ])
  async postTagSearch(
    @Params('postId') postId: number,
    @Query('limit') limit: number,
    @Query('filter') filter: string,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      // Load the post from the DB
      const post = await this.postDao.getById(postId);

      // Get a list of Ids associated with the post
      const tagIds = post.postTags.map((tag) => tag.tagId);

      const searchResults = await this.tagDao.find({
        limit: limit ?? 5,
        label: filter,
        NOT: { id: { in: tagIds } }
      });

      res.json(searchResults.map(this.tagDao.toDTO));
    } catch (error) {
      next(error);
    }
  }

  @Post(POSTS.TAG.relativePath, [
    ZodIdValidator('postId'),
    ZodIdValidator('tagId')
  ])
  async addTag(
    @Params('postId') postId: number,
    @Params('tagId') tagId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      let result = await this.postTagDao.find(postId, tagId);

      if (result) {
        res.status(204);
      } else {
        const post = await this.postDao.getById(postId);
        const tag = await this.tagDao.getById(tagId);

        if (!post || !tag) {
          const err = new NotFoundError(
            'Unable to link Post and Tag, something is missing.  Please make sure you have created the Tag before trying to link it'
          );

          err.details.createTagMethod = 'POST';
          err.details.createTagUrl = `${ROUTES.TAGS}/`;
          err.details.createTagSchema = { label: 'string' };

          throw err;
        }

        result = await this.postTagDao.create(postId, tagId);
        res.status(202).json(this.postTagDao.toDTO(result));
      }

      res.send(this.postTagDao.toDTO(result));
    } catch (error) {
      next(error);
    }
  }

  @Delete(POSTS.TAG.relativePath, [
    ZodIdValidator('postId'),
    ZodIdValidator('tagId')
  ])
  async removeTag(
    @Params('postId') postId: number,
    @Params('tagId') tagId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.postTagDao.find(postId, tagId);

      if (!result) {
        throw new NotFoundError('Post/Tag Link not found');
      }

      await this.postTagDao.delete(postId, tagId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  @Post(POSTS.FILES.relativePath, [
    upload.fields([{ name: 'file' }]),
    ZodIdValidator('postId')
  ])
  async addFileToPost(
    @Params('postId') postId: number,
    @Request('files') files: Record<string, Express.Multer.File[]>,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const post = await this.postDao.getById(postId);

      if (!post) {
        throw new NotFoundError(`Post with id [${postId}] not found`);
      }

      const { file: fileList } = files;

      // Create new files
      await Promise.all(
        fileList.map((file) =>
          this.postFileDao.create(postId, {
            encoding: file.encoding,
            filename: file.path,
            mime: file.mimetype,
            original_filename: file.originalname,
            size: file.size
          })
        )
      );

      // Refresh post
      const updatedPost = await this.postDao.getById(postId);

      res.json(this.postDao.toDTO(updatedPost));
    } catch (error) {
      next(error);
    }
  }

  @Post(POSTS.ROOT.relativePath, [
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

      if (!file) {
        throw new BadRequestError('No Files Provided');
      }

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
