import { Controller, Post, Body, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { KeysService } from './keys.service';
import type { Response } from 'express';
import { SearchUsersQueryDto } from './dto/search-users.query.dto';
import { issueAccessToken } from '../../auth/token.service';
import { AuthGuard } from '../../auth/auth.guard';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('keys')
export class KeysController {
    constructor(private readonly keysService: KeysService) { }

    @Post('register')
    async register(@Body() body: RegisterUserDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.keysService.registerUser(body);
        const accessToken = issueAccessToken(result.id);

        res.cookie('auth-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in production
            sameSite: 'lax',
            expires: new Date(Date.now() + 360000000000),
        });
        return {
            id: result.id,
            username: result.username,
            accessToken,
        };
    }

    @UseGuards(AuthGuard)
    @Get('search/users')
    async searchUsers(@Query() query: SearchUsersQueryDto) {
        return this.keysService.searchUsersByUsername(query);
    }

    @UseGuards(AuthGuard)
    @Get(':userId')
    async getUserKeys(@Param('userId') userId: string) {
        return this.keysService.getUserKeys(userId);
    }
}
