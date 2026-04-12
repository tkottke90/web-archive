import { Inject } from '@decorators/di';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers as HttpHeaders,
  Next,
  Params,
  Post,
  Put,
  Query,
  Request,
  Response
} from '@decorators/express';
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { UPLOAD_DIR } from '../config';
import { PostFileDao } from '../dao/post-file.dao';
import { PostTagDao } from '../dao/post-tag.dao';
import { PostDao } from '../dao/post.dao';
import { TagDao } from '../dao/tag.dao';
import { DownloadJobDao } from '../dao/download-job.dao';
import {
  PostCreateDTO,
  PostCreateSchema,
  PostQueryDTO,
  PostQuerySchema
} from '../dto/post.dto';
import { FuzzyBoolean } from '../dto/utilities';
import { MultipartJson } from '../middleware';
import {
  ZodBodyValidator,
  ZodIdValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { POSTS, TAGS } from '../routes';
import { BadRequestError, NotFoundError } from '../utilities/errors.util';
import { Prisma } from '@prisma/client';
import { FS_CONSTS } from '../constants';
import { createReadStream } from 'fs';
import { FileSystemFactory } from '../services';
import { parseRangeHeader } from '../utilities/streaming.utils';

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fieldSize: FS_CONSTS.MAX_UPLOAD_SIZE }
});

@Controller(POSTS.ROOT.path)
export class PostController {
  constructor(
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao,
    @Inject('TagDao') private readonly tagDao: TagDao,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory,
    @Inject('DownloadJobDao') private readonly downloadJobDao: DownloadJobDao
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

  @Get(POSTS.WITH_ID.path, [ZodIdValidator('postId')])
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

      const jobs = await this.downloadJobDao.findByPostId(postId);

      res.json(
        this.postDao.toDTO(post, {
          jobs: jobs.map((job) => this.downloadJobDao.toJobListItem(job))
        })
      );
    } catch (error) {
      next(error);
    }
  }

  @Get(POSTS.NAV.path, [
    ZodIdValidator('postId'),
    ZodQueryValidator(PostQuerySchema)
  ])
  async getPostNavigation(
    @Params('postId') postId: number,
    @Query() query: PostQueryDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const postCollection = await this.postDao.findByIdWithBeforeAndAfter(
        postId,
        query
      );

      const pagination = await this.postDao.paginationDetails(query);

      res.json({
        pagination,
        navigation: postCollection
      });
    } catch (error) {
      next(error);
    }
  }

  @Delete(POSTS.WITH_ID.path, [
    ZodIdValidator('postId'),
    ZodQueryValidator(z.object({ archive: FuzzyBoolean.optional() }))
  ])
  async deletePost(
    @Params('postId') postId: number,
    @Query('archive') softDelete = false,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      if (softDelete) {
        await this.postDao.archive(postId);
      } else {
        await this.postDao.remove(postId);
      }

      res.status(204).json({});
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        next(new NotFoundError('Post Not Found with ID'));
      }

      next(error);
    }
  }

  @Get(POSTS.FILES_WITH_ID.path, [ZodIdValidator('fileId')])
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

  @Get(POSTS.FILES_CONTENT.path, [ZodIdValidator('fileId')])
  async getPostContent(
    @Params('fileId') fileId: number,
    @HttpHeaders('range') range: string,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const content = await this.postFileDao.getById(fileId);

      // If there is no database record
      if (!content) {
        throw new NotFoundError('Unable to get file');
      }

      await this.fileSystem.exists(content.filename).catch(async (err: any) => {
        // If the file does not exist, we should remove the corresponding record
        // from the database
        await this.postFileDao.delete(content.id);

        throw new NotFoundError('File Missing from file system');
      });

      if (content.mime.startsWith('video') && range) {
        const rangeHeader = parseRangeHeader(range);

        const start = rangeHeader.start;
        const end =
          rangeHeader.end !== -1
            ? rangeHeader.end
            : Math.min(
                rangeHeader.start + FS_CONSTS.VIDEO_CHUNK_SIZE,
                content.size - 1
              );
        const contentLength = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${content.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': contentLength,
          'Content-Type': content.mime
        });

        const videoStream = createReadStream(content.filename, { start, end });
        videoStream.pipe(res);
      } else {
        // Not a video, so send back the file
        res.contentType(content.mime);
        res.sendFile(content.filename);
      }
    } catch (error) {
      next(error);
    }
  }

  @Get(POSTS.TAG_SEARCH.path, [
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

  @Post(POSTS.TAG.path, [ZodIdValidator('postId'), ZodIdValidator('tagId')])
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
          err.details.createTagUrl = TAGS.ROOT.fullPath;
          err.details.createTagSchema = { label: 'string' };

          throw err;
        }

        result = await this.postTagDao.create(postId, tagId);
        res.status(202).json(this.postTagDao.toDTO(result));
      }
    } catch (error) {
      next(error);
    }
  }

  @Delete(POSTS.TAG.path, [ZodIdValidator('postId'), ZodIdValidator('tagId')])
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

  @Post(POSTS.FILES.path, [
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

  @Delete(POSTS.FILES_WITH_ID.path, [
    ZodIdValidator('postId'),
    ZodIdValidator('fileId')
  ])
  async deleteFile(
    @Params('postId') postId: number,
    @Params('fileId') fileId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const file = await this.postFileDao.getById(fileId);

      if (!file || file.postId !== postId) {
        throw new NotFoundError(`File with id [${fileId}] not found`);
      }

      await this.postFileDao.delete(fileId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  @Put(POSTS.FILES_WITH_ID.path, [
    upload.fields([{ name: 'file' }]),
    ZodIdValidator('postId'),
    ZodIdValidator('fileId')
  ])
  async replaceFile(
    @Params('postId') postId: number,
    @Params('fileId') fileId: number,
    @Request('files') files: Record<string, Express.Multer.File[]>,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const existingFile = await this.postFileDao.getById(fileId);

      if (!existingFile || existingFile.postId !== postId) {
        throw new NotFoundError(`File with id [${fileId}] not found`);
      }

      const { file: fileList } = files;

      if (!fileList?.length) {
        throw new BadRequestError('No file provided');
      }

      const newFile = fileList[0];
      const oldFilename = existingFile.filename;

      try {
        // Use a transaction so that if the DB update succeeds but the old file
        // removal fails (or vice-versa), the whole operation is rolled back and
        // the DB remains consistent with the filesystem.
        await this.postFileDao.replace(
          fileId,
          {
            encoding: newFile.encoding,
            filename: newFile.path,
            mime: newFile.mimetype,
            original_filename: newFile.originalname,
            size: newFile.size
          },
          oldFilename
        );
      } catch (replaceError) {
        // The replace failed – attempt to remove the newly uploaded file so it
        // doesn't linger on disk without a corresponding DB record. Ignore
        // cleanup errors so the original error is always surfaced.
        try {
          await this.fileSystem.remove(newFile.path);
        } catch (_) {
          // best-effort cleanup; ignore
        }
        throw replaceError;
      }

      // Refresh post
      const updatedPost = await this.postDao.getById(postId);

      res.json(this.postDao.toDTO(updatedPost));
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
