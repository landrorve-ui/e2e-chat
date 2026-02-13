import { Module } from '@nestjs/common';
import { GatewayGateway } from './gateway.gateway';
import { MessagesModule } from '../messages/messages.module';

@Module({
    imports: [MessagesModule],
    providers: [GatewayGateway],
})
export class GatewayModule { }
