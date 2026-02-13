import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KeysService {
    constructor(private prisma: PrismaService) { }

    async registerUser(data: {
        username: string;
        identityPublicKey: string;
        signedPreKeyPublic: string;
        signedPreKeySignature: string;
        oneTimePreKeys: string[];
    }) {
        const { username, identityPublicKey, signedPreKeyPublic, signedPreKeySignature, oneTimePreKeys } = data;

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
            include: {
                oneTimePreKeys: {
                    where: { used: false },
                    take: 1, // Get one unused prekey
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const oneTimePreKey = user.oneTimePreKeys[0];

        // Mark prekey as used if available
        let preKeyToReturn: { id: string; publicKey: string } | null = null;
        if (oneTimePreKey) {
            await this.prisma.oneTimePreKey.update({
                where: { id: oneTimePreKey.id },
                data: { used: true },
            });
            preKeyToReturn = {
                id: oneTimePreKey.id,
                publicKey: oneTimePreKey.publicKey,
            };
        }

        return {
            identityPublicKey: user.identityPublicKey,
            signedPreKey: {
                publicKey: user.signedPreKeyPublic,
                signature: user.signedPreKeySignature,
            },
            oneTimePreKey: preKeyToReturn,
        };
    }
}
