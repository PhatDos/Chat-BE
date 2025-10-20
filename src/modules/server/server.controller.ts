import { Controller, Get } from '@nestjs/common';
import { ServerService } from './server.service';

@Controller('servers')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Get()
  async getAll() {
    return this.serverService.findAll();
  }
}
