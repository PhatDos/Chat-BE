import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { CarsEntity } from 'src/entities/cars.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CarsEntity])],
  controllers: [CarsController],
  providers: [CarsService],
})
export class CarsModule {}
