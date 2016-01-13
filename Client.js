'use strict';

function assign(target, source) {
  if (!source) {
    return;
  }
  var keys = Object.keys(source);
  for (var i = 0, l = keys.length; i < l; i++) {
    target[keys[i]] = source[keys[i]];
  }
  return target;
}

function SiLuDingClient(socket, data, canvas) {
  this.socket = socket;
  this.socket.game = this;
  this.socket.removeListener('update', this.update);
  this.socket.on('update', this.update);
  this.socket.removeListener('timeout', this.timeout);
  this.socket.on('timeout', this.timeout);
  this.socket.once('gameOver', this.gameOver);

  this.players = data.players;
  for (var i = 0, l = this.players.length; i < l; i++) {
    if (this.players[i].id === this.socket.id) {
      this.index = i;
      break;
    }
  }
  this.grid = data.grid;
  this.active = data.active;

  this.canvas = canvas;
  this.canvas.game = this;
  this.canvas.addEventListener('click', this.click);
  this.canvas.width = this.canvas.clientWidth;
  this.canvas.height = this.canvas.width;
  this.print();
}
SiLuDingClient.prototype = {
  update: function (data) {
    var self = this.game;
    assign(self, data);
    delete self.from;
    self.print();
  },
  timeout: function (active) {
    var self = this.game;
    self.active = active;
    self.print();
  },
  gameOver: function (winner) {
    var self = this.game;
    self.canvas.removeEventListener('click', self.click);
  },
  print: function () {
    var h = this.canvas.height;
    var ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, h, h);
    this.printGrid();
  },
  printGrid: function () {
    this.printMesh();
    var d = this.canvas.height / 4;
    var ctx = this.canvas.getContext('2d');
    for (var i = 0; i < this.grid.length; i++) {
      for (var j = 0; j < this.grid.length; j++) {
        ctx.save();
        ctx.translate((j + 0.5) * d, (i + 0.5) * d);
        this.printPawn(i, j, d / 2);
        ctx.restore();
      }
    }
  },
  printMesh: function () {
    var d = this.canvas.height / 4;
    var ctx = this.canvas.getContext('2d');

    ctx.save();
    ctx.translate(d / 2, d / 2);
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      ctx.moveTo(0, i * d);
      ctx.lineTo(3 * d, i * d);
      ctx.moveTo(i * d, 0);
      ctx.lineTo(i * d, 3 * d);
    }
    ctx.lineWidth = d / 50;
    ctx.lineCap = 'square';
    ctx.strokeStyle = this.players[this.active].color;
    ctx.stroke();
    ctx.restore();
  },
  printPawn: function (i, j, r) {
    if (this.grid[i][j] === null || this.grid[i][j] === undefined) {
      return;
    }
    var ctx = this.canvas.getContext('2d');
    ctx.fillStyle = this.players[this.grid[i][j]].color;
    if (this.from && i === this.from.i && j === this.from.j) {
      ctx.globalAlpha = 0.5;
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
  },
  click: function (e) {
    var self = this.game;
    if (self.active !== self.index) {
      return;
    }
    var d = self.canvas.height / 4;
    var x = e.clientX - self.canvas.getBoundingClientRect().left;
    var y = e.clientY - self.canvas.getBoundingClientRect().top;
    var i = Math.floor(y / d);
    var j = Math.floor(x / d);
    if (!self.from && self.active === self.grid[i][j]) {
      self.from = { i: i, j: j };
      self.print();
    } else if (self.from) {
      var distance = self.distance(self.from.i, self.from.j, i, j);
      if (distance === 0) {
        delete self.from;
        self.print();
      } else if (distance === 1 && self.grid[i][j] === null) {
        self.socket.emit('go', { from: self.from, to: { i: i, j: j } });
        delete self.from;
      }
    }
  },
  giveUp: function () {
    this.socket.emit('giveup');
  },
  surrender: function () {
    this.socket.emit('surrender');
  },
  distance: function (i1, j1, i2, j2) {
    return Math.abs(i1 - i2) + Math.abs(j1 - j2);
  },
};

function LiuLuDingClient(socket, data, canvas) {
  SiLuDingClient.call(this, socket, data, canvas);
}
LiuLuDingClient.prototype = assign(Object.create(SiLuDingClient.prototype), {
  letructor: LiuLuDingClient,
  print: function () {
    var h = this.canvas.height;
    var ctx = this.canvas.getContext('2d');
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, h, h);
    this.printGrid();
  },
  printGrid: function () {
    this.printMesh();
    var sin60 = Math.sqrt(3) / 2;
    var d = this.canvas.height / this.grid.length;
    var ctx = this.canvas.getContext('2d');
    for (var i = 0; i < this.grid.length; i++) {
      for (var j = 0; j < this.grid.length; j++) {
        ctx.save();
        ctx.translate((j + 0.5 - (i - 3) / 2) * d, ((i - 3) * sin60 + 3.5) * d);
        this.printPawn(i, j, d / 2);
        ctx.restore();
      }
    }
  },
  printMesh: function () {
    var sin60 = Math.sqrt(3) / 2;
    var h = this.canvas.height;
    var d = h / 7;
    var ctx = this.canvas.getContext('2d');

    ctx.save();
    ctx.translate(h / 2, h / 2);
    ctx.beginPath();
    for (var a = 0; a < 3; a++) {
      ctx.rotate(Math.PI / 3);
      for (var i = -3; i < 4; i++) {
        ctx.moveTo((-3 + Math.abs(i) / 2) * d, i * d * sin60);
        ctx.lineTo((3 - Math.abs(i) / 2) * d, i * d * sin60);
      }
    }
    ctx.lineWidth = d / 30;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.players[this.active].color;
    ctx.stroke();
    ctx.restore();
  },
  click: function (e) {
    var self = this.game;
    if (self.active !== self.index) {
      return;
    }
    var sin60 = Math.sqrt(3) / 2;
    var d = self.canvas.height / 7;
    var x = e.clientX - self.canvas.getBoundingClientRect().left;
    var y = e.clientY - self.canvas.getBoundingClientRect().top;
    var i = Math.floor((y / d - 3.5) / sin60 + 3.5);
    var j = Math.floor(x / d + (i - 3) / 2);
    if (self.distance(i, j, 3, 3) > 3) {
      return;
    }
    if (!self.from && self.active === self.grid[i][j]) {
      self.from = { i: i, j: j };
      self.print();
    } else if (self.from) {
      var distance = self.distance(self.from.i, self.from.j, i, j);
      if (distance === 0) {
        delete self.from;
        self.print();
      } else if (distance === 1 && self.grid[i][j] === null) {
        self.socket.emit('go', { from: self.from, to: { i: i, j: j } });
        delete self.from;
      }
    }
  },
  distance(i1, j1, i2, j2) {
    var d_i = i2 - i1;
    var d_j = j2 - j1;
    return Math.max(Math.abs(d_i), Math.abs(d_j), Math.abs(d_i - d_j));
  },
});
