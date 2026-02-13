import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GatewayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagesService: MessagesService) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(userId);
      console.log(`Client ${client.id} joined room ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      senderId: string;
      receiverId: string;
      ciphertext: string;
      header: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // 1. Store ciphertext in DB
    const savedMessage = await this.messagesService.saveMessage(data);

    // 2. Emit to receiver if online (they are joined to room userId)
    this.server.to(data.receiverId).emit('receive_message', savedMessage);

    // 3. Confirm receipt to sender
    return { status: 'ok', messageId: savedMessage.id };
  }
}
