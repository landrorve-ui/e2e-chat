import { Controller, Get, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Get(':userId')
    async getMessages(@Param('userId') userId: string) {
        return this.messagesService.getMessagesForUser(userId);
    }
}
