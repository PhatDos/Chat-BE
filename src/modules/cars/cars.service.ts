import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarsEntity } from 'src/entities/cars.entity';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(CarsEntity)
    private readonly carsRepo: Repository<CarsEntity>,
  ) {}

  async getAll(): Promise<CarsEntity[]> {
    return await this.carsRepo.find();
  }

  async getDetail(id: number): Promise<CarsEntity | null> {
    return await this.carsRepo.findOneBy({ id });
  }

  async create(dto: CarsEntity): Promise<CarsEntity> {
    return await this.carsRepo.save(dto);
  }

  async update(id: number, dto: CarsEntity): Promise<CarsEntity | null> {
    await this.carsRepo.update(id, dto);
    return await this.carsRepo.findOneBy({ id });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.carsRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
