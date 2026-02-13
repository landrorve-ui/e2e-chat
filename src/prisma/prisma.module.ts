import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make it global so we don't have to import it everywhere
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
