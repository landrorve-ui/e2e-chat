import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { KeysModule } from './modules/keys/keys.module';
import { MessagesModule } from './modules/messages/messages.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [PrismaModule, KeysModule, MessagesModule, GatewayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
