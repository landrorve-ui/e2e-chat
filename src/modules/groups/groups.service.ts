import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

const MAX_GROUP_MEMBERS = 100;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(ownerId: string, dto: CreateGroupDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Group name is required');
    }

    const uniqueMemberIds = Array.from(
      new Set(dto.memberIds.map(id => id.trim()).filter(Boolean).filter(id => id !== ownerId)),
    );

    const totalMembers = uniqueMemberIds.length + 1;
    if (totalMembers > MAX_GROUP_MEMBERS) {
      throw new BadRequestException(`Group cannot exceed ${MAX_GROUP_MEMBERS} members`);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [ownerId, ...uniqueMemberIds] } },
      select: { id: true },
    });

    if (users.length !== totalMembers) {
      throw new BadRequestException('Some invited users do not exist');
    }

    const group = await this.prisma.groupChat.create({
      data: {
        name,
        createdById: ownerId,
        members: {
          create: [
            { userId: ownerId, role: 'OWNER' },
            ...uniqueMemberIds.map(userId => ({ userId, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        role: member.role,
      })),
      memberCount: group.members.length,
    };
  }

  async listMyGroups(userId: string) {
    const groups = await this.prisma.groupChat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group._count.members,
    }));
  }

  async getGroupForMember(groupId: string, userId: string) {
    const group = await this.prisma.groupChat.findFirst({
      where: {
        id: groupId,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: { select: { username: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map(member => ({
        userId: member.userId,
        username: member.user.username,
        role: member.role,
      })),
      memberCount: group.members.length,
    };
  }

  async assertMembership(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this group');
    }
  }

  async listRecipientIds(groupId: string, senderId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    if (members.length === 0) {
      throw new NotFoundException('Group not found');
    }

    const isSenderMember = members.some(member => member.userId === senderId);
    if (!isSenderMember) {
      throw new ForbiddenException('Not a member of this group');
    }

    if (members.length > MAX_GROUP_MEMBERS) {
      throw new BadRequestException(`Group exceeds max supported size of ${MAX_GROUP_MEMBERS}`);
    }

    return members.map(member => member.userId).filter(id => id !== senderId);
  }
}
