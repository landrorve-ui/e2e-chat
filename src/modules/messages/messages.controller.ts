import { Controller, Get, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../../auth/auth.guard';
import type { RequestWithUser } from '../../auth/auth.types';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @UseGuards(AuthGuard)
    @Get(':userId')
    async getMessages(@Param('userId') userId: string, @Req() req: RequestWithUser) {
        if (req.userId !== userId) {
            throw new UnauthorizedException('Cannot access another user messages');
        }
        return this.messagesService.getMessagesForUser(userId);
    }
}
