import { Module } from '@nestjs/common';
import { GatewayGateway } from './gateway.gateway';
import { MessagesModule } from '../messages/messages.module';
import { KeysModule } from '../keys/keys.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
    imports: [MessagesModule, KeysModule, GroupsModule],
    providers: [GatewayGateway],
})
export class GatewayModule { }
