import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
