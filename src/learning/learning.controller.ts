import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { LearningService } from './learning.service';
import { AuthorizedRequest } from '../auth/types/auth.types';
import { CreateLearningDto } from './dto/create-learning.dto';
import { LearningDto } from './dto/learning.dto';
import { UpdateLearningDto } from './dto/update-learning.dto';
import { LearningPageDto } from './dto/learning-page.dto';

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('/page')
  async getLearningsPage(
    @Req() request: AuthorizedRequest,
    @Query('page', ParseIntPipe) page: number,
    @Query('pageSize', ParseIntPipe) pageSize: number,
    @Query('title') title: string = '',
  ): Promise<LearningPageDto> {
    try {
      return await this.learningService.findInPage(request.user.id, { page, pageSize, filter: { title } });
    } catch (e: unknown) {
      throw new BadRequestException();
    }
  }

  @Get(':id')
  async getLearningById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthorizedRequest,
  ): Promise<LearningDto> {
    try {
      return await this.learningService.findOne(request.user.id, id);
    } catch (e: unknown) {
      throw new NotFoundException();
    }
  }

  @Get()
  async getLearnings(
    @Query('from') from: Date,
    @Query('to') to: Date,
    @Req() request: AuthorizedRequest,
  ): Promise<LearningDto[]> {
    // TODO: define max daterange
    // TODO: Date parsing pipe.
    try {
      return await this.learningService.findInDateRange(request.user.id, from, to);
    } catch (e: unknown) {
      throw new BadRequestException();
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLearning(
    @Body() createLearningDto: CreateLearningDto,
    @Req() request: AuthorizedRequest,
  ): Promise<LearningDto> {
    try {
      return await this.learningService.create(request.user.id, createLearningDto.title, createLearningDto.description);
    } catch (e: unknown) {
      throw new BadRequestException();
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLearning(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLearningDto: UpdateLearningDto,
    @Req() request: AuthorizedRequest,
  ) {
    try {
      await this.learningService.updateOne(request.user.id, id, updateLearningDto);
    } catch (e: unknown) {
      throw new BadRequestException();
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLearning(@Param('id', ParseIntPipe) id: number, @Req() request: AuthorizedRequest) {
    try {
      await this.learningService.deleteOne(request.user.id, id);
    } catch (e: unknown) {
      throw new BadRequestException();
    }
  }
}
