import {
  Body,
  Controller,
  Delete,
  Get,
  Next,
  Params,
  Patch,
  Put,
  Query,
  Response
} from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import {
  TagCreateDTO,
  TagCreateSchema,
  TagQueryDTO,
  TagQuerySchema,
  TagUpdateDTO,
  TagUpdateSchema
} from '../dto/post-tag.dto';
import {
  ZodBodyValidator,
  ZodIdValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { TagDao } from '../dao/tag.dao';
import { TAGS } from '../routes';
import { BadRequestError, NotFoundError } from '../utilities/errors.util';

@Controller(TAGS.ROOT.path)
export class TagController {
  constructor(@Inject('TagDao') private readonly tagDao: TagDao) {}

  @Get('/', [ZodQueryValidator(TagQuerySchema)])
  async findTag(
    @Query() query: TagQueryDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.tagDao.find({
        ...query,
        limit: query.limit ?? 100
      });

      res.json(result.map((tag) => this.tagDao.toDTO(tag)));
    } catch (error) {
      next(error);
    }
  }

  @Put('/', [ZodBodyValidator(TagCreateSchema)])
  async createTag(
    @Body() body: TagCreateDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      let tag = await this.tagDao.getByLabel(body.label);

      if (tag) {
        tag = await this.tagDao.updateTag(tag.id, body);
      } else {
        tag = await this.tagDao.addTag(body);
      }

      res.json(this.tagDao.toDTO(tag));
    } catch (error) {
      next(error);
    }
  }

  @Patch(TAGS.WITH_ID.path, [
    ZodIdValidator('tagId'),
    ZodBodyValidator(TagUpdateSchema)
  ])
  async updateTag(
    @Params('tagId') tagId: number,
    @Body() body: TagUpdateDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      if (Object.keys(body).length === 0) {
        throw new BadRequestError(
          'At least one field must be provided for update'
        );
      }

      const existing = await this.tagDao.getById(tagId);

      if (!existing) {
        throw new NotFoundError(`Tag with id ${tagId} not found`);
      }

      const updated = await this.tagDao.updateTag(tagId, body);
      res.json(this.tagDao.toDTO(updated));
    } catch (error) {
      next(error);
    }
  }

  @Delete(TAGS.WITH_ID.path, [ZodIdValidator('tagId')])
  async deleteTag(
    @Params('tagId') tagId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      await this.tagDao.removeTag(tagId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
