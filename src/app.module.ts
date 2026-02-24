import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './modules/keys/keys.module';
import { MessagesModule } from './modules/messages/messages.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { AuthGuard } from './auth/auth.guard';
import { GroupsModule } from './modules/groups/groups.module';

@Module({
  imports: [PrismaModule, KeysModule, MessagesModule, GroupsModule, GatewayModule],
  controllers: [AppController],
  providers: [AppService, AuthGuard],
})
export class AppModule { }
