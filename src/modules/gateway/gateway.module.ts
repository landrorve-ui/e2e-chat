import { Module } from '@nestjs/common';
import { GatewayGateway } from './gateway.gateway';
import { MessagesModule } from '../messages/messages.module';
import { KeysModule } from '../keys/keys.module';

@Module({
    imports: [MessagesModule, KeysModule],
    providers: [GatewayGateway],
})
export class GatewayModule { }
