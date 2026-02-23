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
}
