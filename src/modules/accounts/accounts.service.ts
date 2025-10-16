import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsEntity } from 'src/entities/accounts.entity';
import { AccountDto } from 'src/dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountsEntity)
    private readonly accountsRepo: Repository<AccountsEntity>,
  ) {}

  async getAll(): Promise<AccountsEntity[]> {
    return await this.accountsRepo.find();
  }

  async getDetail(id: number): Promise<AccountsEntity> {
    const account = await this.accountsRepo.findOneBy({ id });
    if (!account) throw new Error('Account not found');
    return account;
  }

  async create(dto: AccountDto): Promise<AccountsEntity> {
    const newAccount = this.accountsRepo.create(dto);
    return await this.accountsRepo.save(newAccount);
  }

  async update(id: number, dto: AccountDto): Promise<AccountsEntity> {
    const account = await this.accountsRepo.findOneBy({ id });
    if (!account) throw new Error('Account not found');

    const updated = Object.assign(account, dto);
    return await this.accountsRepo.save(updated);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.accountsRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
