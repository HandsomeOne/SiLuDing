'use strict';

const io = require('socket.io')(9527);

const SiLuDing = require('./SiLuDing');
SiLuDing.emitter = io.of('/SiLuDing');
SiLuDing.emitter.on('connection', socket => {
  handleConnect(socket, SiLuDing);
});

const LiuLuDing = require('./LiuLuDing');
LiuLuDing.emitter = io.of('/LiuLuDing');
LiuLuDing.emitter.on('connection', socket => {
  handleConnect(socket, LiuLuDing);
});

function handleConnect(socket, Game) {
  socket.on('join', player => {
    socket.player = player;
    let idleRoom = Game.rooms.findIndex(room => !room.isInGame && room.length < Game.seats);
    if (idleRoom === -1) {
      idleRoom = Game.rooms.push([socket]) - 1;
    } else {
      Game.rooms[idleRoom].push(socket);
    }
    socket.room = idleRoom;
    socket.join(idleRoom);
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system join',
      content: `${socket.player.name}进入了房间`,
      color: socket.player.color,
    });
    preStart(idleRoom);
  });

  socket.on('ready', () => {
    if (socket.game) {
      return;
    }
    socket.player.isReady = true;
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system ready',
      content: `${socket.player.name}已准备`,
      color: socket.player.color,
    });
    preStart(socket.room);
  });
  socket.on('unready', () => {
    if (socket.game) {
      return;
    }
    delete socket.player.isReady;
    clearTimeout(Game.rooms[socket.room].timeout);
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system unready',
      content: `${socket.player.name}取消准备`,
      color: socket.player.color,
    });
  });
  socket.on('chat', content => {
    if (!content) {
      return;
    }
    Game.emitter.to(socket.room).emit('chat', {
      class: 'user',
      content,
      sender: socket.player.name,
      color: socket.player.color,
    });
  });

  socket.on('disconnect', () => {
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system leave',
      content: `${socket.player.name}离开了房间`,
      color: socket.player.color,
    });
    clearTimeout(Game.rooms[socket.room].timeout);
    const i = Game.rooms[socket.room].indexOf(socket);
    Game.rooms[socket.room].splice(i, 1);
    socket.leave(socket.room);
    delete socket.room;
  });

  function preStart(roomId) {
    const room = Game.rooms[roomId];
    if (!room.isInGame && room.length === Game.seats) {
      const notReady = room.filter(socket => !socket.player.isReady).length;
      if (notReady === 0) {
        new Game(socket.room, Game.emitter);
      } else if (notReady === 1) {
        room.timeout = setTimeout(() => {
          new Game(socket.room, Game.emitter);
        }, 10000);
        Game.emitter.to(socket.room).emit('chat', {
          class: 'system prestart',
          content: `仅剩一位玩家未准备，游戏将在10秒后开始`,
        });
      }
    }
  }
}
