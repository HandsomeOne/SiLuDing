'use strict';

const fs = require('fs');
const app = require('http').createServer(function (req, res) {
  fs.readFile(__dirname + '/client' + req.url.split('?')[0], (err, data) => {
    if (err) {
      fs.readFile(__dirname + '/client' + '/index.html', (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(err.message);
        } else {
          res.writeHead(200);
          res.end(data);
        }
      });
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
});
const io = require('socket.io')(app);
app.listen(80);

fs.readdir('./game', function (err, files) {
  if (err) {
    console.log(err.message);
  } else {
    files.forEach(file => {
      const game = require('./game/' + file);
      game.emitter = io.of('/' + file.split('.')[0]);
      game.emitter.on('connection', socket => {
        handleConnect(socket, game);
      });
    });
  }
});

function handleConnect(socket, Game) {
  const getColoredName = Game.getColoredName;

  socket.on('join', player => {
    socket.player = player;
    socket.player.name = socket.player.name.replace(/<[^>]+>/g, '');
    socket.player.color = socket.player.color.replace(/<[^>]+>/g, '');
    if (socket.player.room) {
      socket.room = socket.player.room;
    } else {
      socket.room = Game.rooms.findIndex(room => room && !room.isInGame && room.length < Game.seats);
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
      content: `${getColoredName(socket)}进入了房间，目前房间里有${Game.rooms[socket.room].map(getColoredName).join('，')}`,
    });
    if (socket.player.room && Game.rooms[socket.room].length < Game.seats) {
      Game.emitter.to(socket.id).emit('chat', {
        class: 'system hint',
        content: `将当前网页地址复制给好友，就可以邀请他们加入游戏了哦！`,
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
      content: `${getColoredName(socket)}已准备`,
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
      content: `${getColoredName(socket)}取消准备`,
    });
  });
  socket.on('chat', content => {
    if (!content) {
      return;
    }
    Game.emitter.to(socket.room).emit('chat', {
      class: 'user',
      content: `<span style="color:${socket.player.color}">${socket.player.name}：${HTMLEntities(content)}</span>`,
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
      content: `${getColoredName(socket)}离开了房间，目前房间里有${Game.rooms[socket.room].map(getColoredName).join('，')}`,
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

function HTMLEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
