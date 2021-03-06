'use strict';

class SiLuDing {
  constructor(room, emitter) {
    const Game = this.constructor;
    this.room = room;
    clearTimeout(Game.rooms[this.room].timeout);
    Game.rooms[this.room].isInGame = true;
    this.sockets = Game.rooms[this.room].slice(0, Game.seats);
    this.survivals = this.sockets.length;
    this.initGrid();
    this.active = Math.floor(Math.random() * this.survivals);
    this.sockets.forEach((socket, i) => {
      socket.index = i;
      socket.game = this;
      socket.player.pawns = Game.pawns;
      delete socket.player.isReady;
      delete socket.player.isKilled;

      socket.removeListener('go', this.go);
      socket.on('go', this.go);
      socket.removeListener('skip', this.skip);
      socket.on('skip', this.skip);
      socket.once('disconnect', this.disconnect);
      socket.once('surrender', this.surrender);
    });
    this.emitter = emitter;
    this.start();
  }
  initGrid() {
    this.grid = [
      [0, 0, 0, 0],
      [null, null, null, null],
      [null, null, null, null],
      [1, 1, 1, 1],
    ];
  }
  start() {
    this.emitter.to(this.room).emit('start', {
      grid: this.grid,
      active: this.active,
    });
    this.emitter.to(this.room).emit('chat', {
      className: 'system start',
      content: '游戏开始',
    });
    this.timeout = setTimeout(this.turn.bind(this), 30000);
  }
  skip() {
    const game = this.game;
    if (!game.isOver) {
      game.turn();
    }
  }
  surrender() {
    const game = this.game;
    game.emitter.to(game.room).emit('chat', {
      className: 'system surrender',
      content: `&{${this.player.id}}投降了`,
    });
    game.killPlayer(this.index);
  }
  disconnect() {
    const game = this.game;
    game.killPlayer(this.index);
  }
  go(data) {
    const game = this.game;
    game.grid[data.from.i][data.from.j] = null;
    game.grid[data.to.i][data.to.j] = game.active;
    game.check(data.to.i, data.to.j);
    if (!game.isOver) {
      game.turn();
    }
  }
  turn() {
    clearTimeout(this.timeout);
    delete this.from;
    do {
      this.active = (this.active + 1) % this.sockets.length;
    } while (this.sockets[this.active].player.isKilled);
    this.emitter.to(this.room).emit('update', {
      grid: this.grid,
      active: this.active,
    });
    this.timeout = setTimeout(this.turn.bind(this), 30000);
  }
  check(i, j) {
    this.checkByDirection(i, j, 'horizonal');
    this.checkByDirection(i, j, 'vertical');
  }
  checkByDirection(i, j, direction) {
    const line = this.getLineOfSeven(i, j, direction);
    let offset;
    if (line[0].value === null && line[4].value === null) {
      offset = 2;
    } else if (line[1].value === null && line[5].value === null) {
      offset = 3;
    } else if (line[2].value === null && line[6].value === null) {
      offset = 4;
    } else {
      return;
    }

    if (line[offset - 1].value === null ||
      line[offset].value !== this.active ||
      line[offset + 1].value === null) {
      return;
    }

    if (line[offset - 1].value !== this.active && line[offset + 1].value === this.active) {
      this.kill(line[offset - 1].i, line[offset - 1].j);
    } else if (line[offset - 1].value === this.active && line[offset + 1].value !== this.active) {
      this.kill(line[offset + 1].i, line[offset + 1].j);
    }
  }
  getLineOfSeven(i, j, direction) {
    const line = new Array(7);
    switch (direction) {
      case 'horizonal':
        for (let k = 0; k < 7; k++) {
          line[k] = { i, j: j + k - 3 };
        }
        break;
      case 'vertical':
        for (let k = 0; k < 7; k++) {
          line[k] = { i: i + k - 3, j };
        }
        break;
    }
    for (let k = 0; k < 7; k++) {
      try {
        line[k].value = this.grid[line[k].i][line[k].j];
        if (line[k].value === undefined) {
          line[k].value = null;
        }
      } catch (e) {
        line[k].value = null;
      }
    }
    return line;
  }
  kill(i, j) {
    const index = this.grid[i][j];
    this.grid[i][j] = null;
    this.sockets[index].player.pawns -= 1;
    if (this.sockets[index].player.pawns === 1) {
      this.killPlayer(index);
    }
  }
  killPlayer(index) {
    if (this.sockets[index].player.isKilled) {
      return;
    }
    this.emitter.to(this.room).emit('chat', {
      className: 'system kill',
      content: `&{${this.sockets[index].player.id}}被击败了`,
    });
    this.sockets[index].player.isKilled = true;
    this.survivals -= 1;
    if (this.survivals === 1) {
      this.gameOver();
      return;
    }
    if (this.active === index && !this.isOver) {
      this.turn();
    }
  }
  gameOver() {
    this.isOver = true;
    this.winner = this.sockets.find(socket => !socket.player.isKilled).player.id;
    clearTimeout(this.timeout);
    this.sockets.forEach(socket => {
      socket.removeListener('go', this.go);
      socket.removeListener('skip', this.skip);
      socket.removeListener('disconnect', this.disconnect);
      socket.removeListener('surrender', this.surrender);
      delete socket.game;
    });
    this.emitter.to(this.room).emit('update', {
      grid: this.grid,
    });
    this.emitter.to(this.room).emit('gameOver', this.winner);
    this.emitter.to(this.room).emit('chat', {
      className: 'system gameover',
      content: `游戏结束，&{${this.winner}}获胜`,
    });
    delete this.constructor.rooms[this.room].isInGame;
  }
}
SiLuDing.rooms = [];
SiLuDing.pawns = 4;
SiLuDing.seats = 2;

module.exports = SiLuDing;
