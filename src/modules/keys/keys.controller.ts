import { Controller, Post, Body, Get, Param, Query, Res } from '@nestjs/common';
import { KeysService } from './keys.service';
import type { Response } from 'express';
import { SearchUsersQueryDto } from './dto/search-users.query.dto';

@Controller('keys')
export class KeysController {
    constructor(private readonly keysService: KeysService) { }

    @Post('register')
    async register(@Body() body: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.keysService.registerUser(body);

        res.cookie('auth-token', result.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in production
            sameSite: 'lax',
            expires: new Date(Date.now() + 360000000000),
        });
        return result;
    }

    @Get('search/users')
    async searchUsers(@Query() query: SearchUsersQueryDto) {
        return this.keysService.searchUsersByUsername(query);
    }

    @Get(':userId')
    async getUserKeys(@Param('userId') userId: string) {
        return this.keysService.getUserKeys(userId);
    }
}
