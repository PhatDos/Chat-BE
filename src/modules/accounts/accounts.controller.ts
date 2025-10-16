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

import { AccountsService } from './accounts.service';
import { AccountsEntity } from 'src/entities/accounts.entity';
import { AccountDto } from 'src/dto/account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async getAll(): Promise<ResponseData<AccountsEntity[]>> {
    try {
      const result = await this.accountsService.getAll();
      return new ResponseData<AccountsEntity[]>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<AccountsEntity[]>(
        [],
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Get(':id')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseData<AccountsEntity>> {
    try {
      const result = await this.accountsService.getDetail(id);
      return new ResponseData<AccountsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<AccountsEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Post()
  async create(@Body() dto: AccountDto): Promise<ResponseData<AccountsEntity>> {
    try {
      const result = await this.accountsService.create(dto);
      return new ResponseData<AccountsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<AccountsEntity>(
        null,
        HttpStatus.ERORR,
        HttpMessage.ERORR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccountDto,
  ): Promise<ResponseData<AccountsEntity>> {
    try {
      const result = await this.accountsService.update(id, dto);
      return new ResponseData<AccountsEntity>(
        result,
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch {
      return new ResponseData<AccountsEntity>(
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
      const result = await this.accountsService.delete(id);
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
