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
    socket.player.name = socket.player.name.replace(/<[^>]+>/g, '');
    if (socket.player.room) {
      socket.room = socket.player.room;
    } else {
      socket.room = Game.rooms.findIndex(room => !room.isInGame && room.length < Game.seats);
      if (socket.room === -1) {
        socket.room = Game.rooms.length;
      }
    }
    Game.rooms[socket.room] = Game.rooms[socket.room] || [];
    if (Game.rooms[socket.room].length >= Game.seats) {
      Game.emitter.to(socket.id).emit('chat', {
        class: 'system error',
        content: `房间已满，加入失败`,
      });
      delete socket.room;
      return;
    }
    Game.rooms[socket.room].push(socket);
    socket.join(socket.room);
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system join',
      content: `${socket.player.name}进入了房间，目前房间里有${Game.rooms[socket.room].map(socket => socket.player.name).join('，') }`,
      color: socket.player.color,
    });
    if (socket.player.room && Game.rooms[socket.room].length < Game.seats) {
      Game.emitter.to(socket.id).emit('chat', {
        class: 'system hint',
        content: `将当前网页地址复制给好友，就可以邀请他们进行游戏了哦！`,
      });
    }
    preStart(socket.room);
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
      content: content.replace(/<[^>]+>/g, ''),
      sender: socket.player.name,
      color: socket.player.color,
    });
  });

  socket.on('disconnect', () => {
    if (socket.room === undefined) {
      return;
    }
    clearTimeout(Game.rooms[socket.room].timeout);
    const i = Game.rooms[socket.room].indexOf(socket);
    Game.rooms[socket.room].splice(i, 1);
    Game.emitter.to(socket.room).emit('chat', {
      class: 'system leave',
      content: `${socket.player.name}离开了房间，目前房间里有${Game.rooms[socket.room].map(socket => socket.player.name).join('，') }`,
      color: socket.player.color,
    });
    if (Game.rooms[socket.room].length === 0) {
      delete Game.rooms[socket.room];
    }
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
