import { Controller, Get } from '@nestjs/common';
import { MemberService } from './member.service';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  getAll() {
    return this.memberService.findAll();
  }
}
