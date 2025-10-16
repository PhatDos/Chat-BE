import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriesEntity } from 'src/entities/categories.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoriesEntity)
    private readonly categoriesRepo: Repository<CategoriesEntity>,
  ) {}

  async getAll(): Promise<CategoriesEntity[]> {
    return await this.categoriesRepo.find();
  }

  async getDetail(id: number): Promise<CategoriesEntity | null> {
    return await this.categoriesRepo.findOne({ where: { id } });
  }

  async create(dto: CategoriesEntity): Promise<CategoriesEntity> {
    const category = this.categoriesRepo.create(dto);
    return await this.categoriesRepo.save(category);
  }

  async update(
    id: number,
    dto: CategoriesEntity,
  ): Promise<CategoriesEntity | null> {
    await this.categoriesRepo.update(id, dto);
    return (await this.getDetail(id)) ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.categoriesRepo.delete(id);
    return !!result.affected;
  }
}
