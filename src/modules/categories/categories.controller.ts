import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ResponseData } from 'src/global/globalClass';
import { HttpStatus, HttpMessage } from 'src/global/globalEnum';
import { CategoriesService } from './categories.service';
import { CategoriesEntity } from 'src/entities/categories.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getAll(): Promise<ResponseData<CategoriesEntity[]>> {
    try {
      const result = await this.categoriesService.getAll();
      return new ResponseData<CategoriesEntity[]>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CategoriesEntity[]>(
        [],
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Get(':id')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseData<CategoriesEntity>> {
    try {
      const result = await this.categoriesService.getDetail(id);
      return new ResponseData<CategoriesEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CategoriesEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Post()
  async create(
    @Body() dto: CategoriesEntity,
  ): Promise<ResponseData<CategoriesEntity>> {
    try {
      const result = await this.categoriesService.create(dto);
      return new ResponseData<CategoriesEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CategoriesEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CategoriesEntity,
  ): Promise<ResponseData<CategoriesEntity | null>> {
    try {
      const result = await this.categoriesService.update(id, dto);
      return new ResponseData<CategoriesEntity | null>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CategoriesEntity | null>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseData<boolean>> {
    try {
      const result = await this.categoriesService.delete(id);
      return new ResponseData<boolean>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<boolean>(
        false,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }
}
