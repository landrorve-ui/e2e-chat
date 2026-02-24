import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { verifyAccessToken } from '../../auth/token.service';
import { KeysService } from '../keys/keys.service';
import { GroupsService } from '../groups/groups.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GatewayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly keysService: KeysService,
    private readonly groupsService: GroupsService,
  ) { }

  private extractCookieToken(client: Socket): string | undefined {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return undefined;

    const tokenPair = cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith('auth-token='));

    return tokenPair?.slice('auth-token='.length);
  }

  async handleConnection(client: Socket) {
    const authToken =
      (client.handshake.auth?.token as string | undefined) ??
      this.extractCookieToken(client);

    const userId = authToken ? verifyAccessToken(authToken) : null;
    if (!userId) {
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    await client.join(userId);
    console.log(`Client ${client.id} authenticated as ${userId}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      receiverId: string;
      ciphertext: string;
      header: {
        usedOneTimePreKeyId?: string;
        usedOneTimePreKeyPublicKey?: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId as string | undefined;
    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    await this.keysService.claimOneTimePreKey(
      data.receiverId,
      data.header?.usedOneTimePreKeyId,
      data.header?.usedOneTimePreKeyPublicKey,
    );

    // 1. Store ciphertext in DB
    const savedMessage = await this.messagesService.saveMessage({
      senderId,
      receiverId: data.receiverId,
      ciphertext: data.ciphertext,
      header: data.header,
    });

    // 2. Emit to receiver if online (they are joined to room userId)
    this.server.to(data.receiverId).emit('receive_message', savedMessage);

    // 3. Confirm receipt to sender
    return { status: 'ok', messageId: savedMessage.id };
  }

  @SubscribeMessage('send_group_message')
  async handleGroupMessage(
    @MessageBody()
    data: {
      groupId: string;
      ciphertext: string;
      header: {
        senderKeyId: string;
        chainIteration: number;
        iv: string;
        timestamp: number;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId as string | undefined;
    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    await this.groupsService.assertMembership(data.groupId, senderId);
    const allowedRecipients = await this.groupsService.listRecipientIds(data.groupId, senderId);
    if (allowedRecipients.length === 0) throw new WsException('No recipients in group');

    const saved = await this.messagesService.saveGroupMessageBroadcast({
      groupId: data.groupId,
      senderId,
      recipientIds: allowedRecipients,
      ciphertext: data.ciphertext,
      header: data.header,
    });

    for (const message of saved) {
      this.server.to(message.recipientId).emit('receive_group_message', {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.recipientId,
        groupId: message.groupId,
        header: message.header,
        ciphertext: message.ciphertext,
      });
    }

    return { status: 'ok', delivered: saved.length };
  }

  @SubscribeMessage('send_group_sender_key')
  async handleGroupSenderKey(
    @MessageBody()
    data: {
      groupId: string;
      envelopes: Array<{
        id: string;
        recipientId: string;
        ciphertext: string;
        header: {
          usedOneTimePreKeyId?: string;
          usedOneTimePreKeyPublicKey?: string;
        };
      }>;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId as string | undefined;
    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    await this.groupsService.assertMembership(data.groupId, senderId);
    const allowedRecipients = await this.groupsService.listRecipientIds(data.groupId, senderId);
    const allowedRecipientSet = new Set(allowedRecipients);

    const deduplicated = new Map<string, typeof data.envelopes[number]>();
    for (const envelope of data.envelopes ?? []) {
      if (!envelope?.recipientId || !allowedRecipientSet.has(envelope.recipientId)) continue;
      deduplicated.set(envelope.recipientId, envelope);
    }

    for (const envelope of deduplicated.values()) {
      await this.keysService.claimOneTimePreKey(
        envelope.recipientId,
        envelope.header?.usedOneTimePreKeyId,
        envelope.header?.usedOneTimePreKeyPublicKey,
      );

      this.server.to(envelope.recipientId).emit('receive_group_sender_key', {
        groupId: data.groupId,
        senderId,
        distributionMessage: {
          id: envelope.id,
          senderId,
          receiverId: envelope.recipientId,
          header: envelope.header,
          ciphertext: envelope.ciphertext,
        },
      });
    }

    return { status: 'ok', distributed: deduplicated.size };
  }
}
