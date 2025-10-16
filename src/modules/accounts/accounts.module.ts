import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsEntity } from 'src/entities/accounts.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsEntity])],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
