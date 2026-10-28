import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { EV } from '@auction/shared';
import { env } from '../config/env';
import { SESSION_COOKIE, SessionPayload } from '../auth/session';
import { PrismaService } from '../prisma/prisma.service';
import { loadSnapshot } from '../common/snapshot';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({ cors: { origin: env.WEB_ORIGIN, credentials: true }, pingInterval: 25000, pingTimeout: 20000 })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly log = new Logger('Realtime');

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly rt: RealtimeService) {}

  afterInit(server: Server) {
    this.rt.attach(server);
    setInterval(() => server.emit(EV.TIME_SYNC, { serverTime: new Date().toISOString() }), 15000).unref();
  }

  /** Per-socket budget for room joins (each join loads a snapshot): 30 per 10 s. */
  private allowJoin(socket: Socket): boolean {
    const now = Date.now();
    const b = (socket.data.joins ??= { n: 0, reset: now + 10_000 });
    if (now > b.reset) { b.n = 0; b.reset = now + 10_000; }
    return ++b.n <= 30;
  }

  handleConnection(socket: Socket) {
    const raw = socket.handshake.headers.cookie;
    const token = raw ? parseCookie(raw)[SESSION_COOKIE] : undefined;
    if (token) {
      try {
        const s = this.jwt.verify<SessionPayload>(token);
        socket.data.user = s;
        socket.join(`user:${s.sub}`);
      } catch { /* anonymous viewer */ }
    }
    socket.emit(EV.TIME_SYNC, { serverTime: new Date().toISOString() });
  }

  @SubscribeMessage(EV.JOIN_AUCTION)
  async joinAuction(@ConnectedSocket() socket: Socket, @MessageBody() body: { auctionId: number }) {
    const id = Number(body?.auctionId);
    if (!Number.isInteger(id) || id <= 0 || !this.allowJoin(socket)) return;
    socket.join(`auction:${id}`);
    const snap = await loadSnapshot(this.prisma, id);
    if (snap) socket.emit(EV.AUCTION_STATE, snap);
  }

  @SubscribeMessage(EV.LEAVE_AUCTION)
  leaveAuction(@ConnectedSocket() socket: Socket, @MessageBody() body: { auctionId: number }) {
    socket.leave(`auction:${Number(body?.auctionId)}`);
  }

  @SubscribeMessage(EV.JOIN_CAMPAIGN)
  joinCampaign(@ConnectedSocket() socket: Socket, @MessageBody() body: { campaignId: number }) {
    const id = Number(body?.campaignId);
    if (Number.isInteger(id) && id > 0 && this.allowJoin(socket)) socket.join(`campaign:${id}`);
  }

  @SubscribeMessage(EV.LEAVE_CAMPAIGN)
  leaveCampaign(@ConnectedSocket() socket: Socket, @MessageBody() body: { campaignId: number }) {
    socket.leave(`campaign:${Number(body?.campaignId)}`);
  }
}
