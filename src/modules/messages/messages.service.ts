import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MessagesService {
    constructor(private prisma: PrismaService) { }

    async saveMessage(data: {
        senderId: string;
        receiverId: string;
        ciphertext: string;
        header: any;
    }) {
        return this.prisma.message.create({
            data: {
                senderId: data.senderId,
                receiverId: data.receiverId,
                ciphertext: data.ciphertext,
                header: data.header,
            },
            include: {
                sender: {
                    select: { username: true },
                },
            },
        });
    }

    async getMessagesForUser(userId: string) {
        return this.prisma.message.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    async saveGroupMessageBroadcast(data: {
        groupId: string;
        senderId: string;
        recipientIds: string[];
        ciphertext: string;
        header: unknown;
    }) {
        if (data.recipientIds.length === 0) return [];

        const rows = data.recipientIds.map((recipientId) => ({
            id: randomUUID(),
            groupId: data.groupId,
            senderId: data.senderId,
            recipientId,
            ciphertext: data.ciphertext,
            header: data.header as object,
        }));

        await this.prisma.groupMessage.createMany({
            data: rows,
        });

        await this.prisma.groupChat.update({
            where: { id: data.groupId },
            data: { updatedAt: new Date() },
        });

        return this.prisma.groupMessage.findMany({
            where: {
                id: {
                    in: rows.map(row => row.id),
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }
}
