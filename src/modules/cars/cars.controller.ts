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
import { CarsService } from './cars.service';
import { CarsEntity } from 'src/entities/cars.entity';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  // GET /cars
  @Get()
  async getAll(): Promise<ResponseData<CarsEntity[]>> {
    try {
      const result = await this.carsService.getAll();
      return new ResponseData<CarsEntity[]>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CarsEntity[]>(
        [],
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  // GET /cars/:id
  @Get(':id')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseData<CarsEntity>> {
    try {
      const result = await this.carsService.getDetail(id);
      return new ResponseData<CarsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CarsEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  // POST /cars
  @Post()
  async create(@Body() dto: CarsEntity): Promise<ResponseData<CarsEntity>> {
    try {
      const result = await this.carsService.create(dto);
      return new ResponseData<CarsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CarsEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  // PUT /cars/:id
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CarsEntity,
  ): Promise<ResponseData<CarsEntity>> {
    try {
      const result = await this.carsService.update(id, dto);
      return new ResponseData<CarsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<CarsEntity>(
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
      const result = await this.carsService.delete(id);
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
