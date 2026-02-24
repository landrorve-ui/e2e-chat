import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import type { RequestWithUser } from '../../auth/auth.types';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';

@UseGuards(AuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(@Req() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.userId, dto);
  }

  @Get('mine')
  async listMyGroups(@Req() req: RequestWithUser) {
    return this.groupsService.listMyGroups(req.userId);
  }

  @Get(':groupId')
  async getGroup(@Req() req: RequestWithUser, @Param('groupId') groupId: string) {
    return this.groupsService.getGroupForMember(groupId, req.userId);
  }
}
