// WebSocket tools semplificato usando solo moduli built-in Node.js
import { createServer } from 'http';
import crypto from 'crypto';

class WebSocketManager {
  constructor() {
    this.server = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.messageHistory = [];
    this.isRunning = false;
  }

  async startServer(port = 8080) {
    if (this.isRunning) {
      throw new Error('WebSocket server già in esecuzione');
    }

    try {
      this.server = createServer();

      this.server.on('upgrade', (request, socket, head) => {
        this.handleUpgrade(request, socket, head);
      });

      return new Promise((resolve, reject) => {
        this.server.listen(port, (error) => {
          if (error) {
            reject(error);
          } else {
            this.isRunning = true;
            resolve({
              success: true,
              port: port,
              message: `Server HTTP per WebSocket avviato sulla porta ${port}`
            });
          }
        });
      });
    } catch (error) {
      throw new Error(`Errore avvio server: ${error.message}`);
    }
  }

  handleUpgrade(request, socket, head) {
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    const acceptKey = this.generateAcceptKey(key);
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ].join('\r\n');

    socket.write(responseHeaders);

    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      socket: socket,
      ip: request.socket.remoteAddress,
      connectedAt: new Date(),
      rooms: new Set()
    };

    this.clients.set(clientId, clientInfo);

    socket.on('data', (buffer) => {
      try {
        const message = this.decodeFrame(buffer);
        if (message) {
          this.handleMessage(clientId, message);
        }
      } catch (error) {
        console.error(`WebSocket error for client ${clientId}:`, error);
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    this.sendToClient(clientId, {
      type: 'connection',
      clientId: clientId,
      message: 'Connesso al server WebSocket'
    });
  }

  generateAcceptKey(key) {
    const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return crypto.createHash('sha1').update(key + magic).digest('base64');
  }

  decodeFrame(buffer) {
    if (buffer.length < 2) return null;

    const firstByte = buffer[0];
    const secondByte = buffer[1];

    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;

    let offset = 2;

    if (payloadLength === 126) {
      if (buffer.length < offset + 2) return null;
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      if (buffer.length < offset + 8) return null;
      payloadLength = buffer.readBigUInt64BE(offset);
      offset += 8;
    }

    if (masked) {
      if (buffer.length < offset + 4) return null;
      const maskKey = buffer.slice(offset, offset + 4);
      offset += 4;

      if (buffer.length < offset + payloadLength) return null;
      const payload = buffer.slice(offset, offset + Number(payloadLength));

      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }

      if (opcode === 1) { // Text frame
        return JSON.parse(payload.toString('utf8'));
      }
    }

    return null;
  }

  encodeFrame(data) {
    const message = JSON.stringify(data);
    const payload = Buffer.from(message, 'utf8');
    const payloadLength = payload.length;

    let frame;
    if (payloadLength < 126) {
      frame = Buffer.allocUnsafe(2 + payloadLength);
      frame[0] = 0x81; // FIN + text frame
      frame[1] = payloadLength;
      payload.copy(frame, 2);
    } else if (payloadLength < 65536) {
      frame = Buffer.allocUnsafe(4 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(payloadLength, 2);
      payload.copy(frame, 4);
    } else {
      frame = Buffer.allocUnsafe(10 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(payloadLength), 2);
      payload.copy(frame, 10);
    }

    return frame;
  }

  stopServer() {
    if (!this.isRunning) {
      return { success: false, message: 'Server non in esecuzione' };
    }

    this.clients.forEach((client) => {
      client.socket.end();
    });

    this.server.close();
    
    this.clients.clear();
    this.rooms.clear();
    this.isRunning = false;

    return { success: true, message: 'Server fermato' };
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'join_room':
        this.joinRoom(clientId, message.room);
        break;
      case 'leave_room':
        this.leaveRoom(clientId, message.room);
        break;
      case 'broadcast':
        this.broadcast(message.data, message.room);
        break;
      case 'private_message':
        this.sendPrivateMessage(clientId, message.targetId, message.data);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
    }

    this.messageHistory.push({
      clientId,
      message,
      timestamp: new Date()
    });

    if (this.messageHistory.length > 100) {
      this.messageHistory = this.messageHistory.slice(-100);
    }
  }

  joinRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }

    this.rooms.get(roomName).add(clientId);
    client.rooms.add(roomName);

    this.sendToClient(clientId, {
      type: 'room_joined',
      room: roomName,
      message: `Unito alla room: ${roomName}`
    });

    this.broadcastToRoom(roomName, {
      type: 'user_joined',
      clientId: clientId,
      room: roomName
    }, clientId);
  }

  leaveRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(clientId);
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }

    client.rooms.delete(roomName);

    this.sendToClient(clientId, {
      type: 'room_left',
      room: roomName,
      message: `Uscito dalla room: ${roomName}`
    });
  }

  broadcast(data, room = null) {
    if (room) {
      this.broadcastToRoom(room, {
        type: 'broadcast',
        data: data,
        room: room
      });
    } else {
      this.clients.forEach((client, clientId) => {
        this.sendToClient(clientId, {
          type: 'broadcast',
          data: data
        });
      });
    }
  }

  broadcastToRoom(roomName, message, excludeClientId = null) {
    if (!this.rooms.has(roomName)) return;

    this.rooms.get(roomName).forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  sendPrivateMessage(senderId, targetId, data) {
    if (!this.clients.has(targetId)) {
      this.sendToClient(senderId, {
        type: 'error',
        message: 'Cliente destinazione non trovato'
      });
      return;
    }

    this.sendToClient(targetId, {
      type: 'private_message',
      from: senderId,
      data: data
    });

    this.sendToClient(senderId, {
      type: 'message_sent',
      to: targetId,
      data: data
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.socket && !client.socket.destroyed) {
      try {
        const frame = this.encodeFrame(message);
        client.socket.write(frame);
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      }
    }
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.forEach(roomName => {
      this.leaveRoom(clientId, roomName);
    });

    this.clients.delete(clientId);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      clientsCount: this.clients.size,
      roomsCount: this.rooms.size,
      messagesCount: this.messageHistory.length,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        connectedAt: client.connectedAt,
        rooms: Array.from(client.rooms)
      })),
      rooms: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientsCount: clients.size
      }))
    };
  }
}

export { WebSocketManager };