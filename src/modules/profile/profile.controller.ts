import { Controller, Get, Param, Post, Body, Delete } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profiles')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.profileService.create(data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.profileService.delete(id);
  }
}
