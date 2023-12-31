import {
  Body,
  Controller,
  Delete,
  Get,
  Next,
  Params,
  Put,
  Query,
  Response
} from '@decorators/express';
import express from 'express';
import { ROUTES } from '../config';
import { Inject } from '@decorators/di';
import {
  TagCreateDTO,
  TagCreateSchema,
  TagQueryDTO,
  TagQuerySchema
} from '../dto/post-tag.dto';
import {
  ZodBodyValidator,
  ZodIdValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { TagDao } from '../dao/tag.dao';

@Controller(ROUTES.TAGS)
export class TagController {
  constructor(@Inject('TagDao') private readonly tagDao: TagDao) {}

  @Get('/', [ZodQueryValidator(TagQuerySchema)])
  async findTag(
    @Query() query: TagQueryDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.tagDao.find(query);

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

      const result = await this.tagDao.addTag(body);

      res.json(this.tagDao.toDTO(result));
    } catch (error) {
      next(error);
    }
  }

  @Delete('/:tag', [ZodIdValidator('tag')])
  async deleteTag(
    @Params('tag') tagId: number,
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
