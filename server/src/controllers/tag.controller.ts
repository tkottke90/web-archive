import {
  Body,
  Controller,
  Get,
  Next,
  Post,
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

  @Post('/', [ZodBodyValidator(TagCreateSchema)])
  async createTag(
    @Body() body: TagCreateDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const result = await this.tagDao.addTag(body);

      res.json(this.tagDao.toDTO(result));
    } catch (error) {
      next(error);
    }
  }
}
