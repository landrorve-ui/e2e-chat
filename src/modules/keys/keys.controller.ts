import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { KeysService } from './keys.service';

@Controller('keys')
export class KeysController {
    constructor(private readonly keysService: KeysService) { }

    @Post('register')
    async register(@Body() body: any) {
        return this.keysService.registerUser(body);
    }

    @Get(':userId')
    async getUserKeys(@Param('userId') userId: string) {
        return this.keysService.getUserKeys(userId);
    }
}
