import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchUsersQueryDto } from './dto/search-users.query.dto';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  async searchUsersByUsername(query: SearchUsersQueryDto) {
    const q = query.q.trim();
    if (!q) return [];

    const limit = query.limit ?? 10;

    return this.prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: 'insensitive',
        },
        ...(query.excludeUserId ? { id: { not: query.excludeUserId } } : {}),
      },
      select: {
        id: true,
        username: true,
      },
      orderBy: [
        {
          username: 'asc',
        },
      ],
      take: limit,
    });
  }

  async registerUser(data: {
    username: string;
    identityPublicKey: string;
    signingPublicKey: string;
    signedPreKeyPublic: string;
    signedPreKeySignature: string;
    oneTimePreKeys: string[];
  }) {
    const {
      username,
      identityPublicKey,
      signingPublicKey,
      signedPreKeyPublic,
      signedPreKeySignature,
      oneTimePreKeys,
    } = data;

    // Check if user exists
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new Error('User already exists');
    }

    // Create user and keys
    return this.prisma.user.create({
      data: {
        username,
        identityPublicKey,
        signingPublicKey,
        signedPreKeyPublic,
        signedPreKeySignature,
        oneTimePreKeys: {
          create: oneTimePreKeys.map((key) => ({ publicKey: key })),
        },
      },
      include: {
        oneTimePreKeys: true,
      },
    });
  }

  async getUserKeys(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        identityPublicKey: true,
        signingPublicKey: true,
        signedPreKeyPublic: true,
        signedPreKeySignature: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Do NOT consume OPK on key fetch. It must be consumed atomically on first message claim.
    const oneTimePreKey = await this.prisma.oneTimePreKey.findFirst({
      where: {
        userId,
        used: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        publicKey: true,
      },
    });

    return {
      identityPublicKey: user.identityPublicKey,
      signingPublicKey: user.signingPublicKey,
      signedPreKey: {
        publicKey: user.signedPreKeyPublic,
        signature: user.signedPreKeySignature,
      },
      oneTimePreKey: oneTimePreKey ?? null,
    };
  }

  async claimOneTimePreKey(
    receiverUserId: string,
    preKeyId?: string,
    preKeyPublicKey?: string,
  ): Promise<void> {
    if (!preKeyId && !preKeyPublicKey) return;

    const where = preKeyId
      ? { id: preKeyId, userId: receiverUserId, used: false }
      : { publicKey: preKeyPublicKey!, userId: receiverUserId, used: false };

    await this.prisma.oneTimePreKey.updateMany({
      where,
      data: { used: true },
    });
  }
}
