'use strict';

var gameTypes = {
  SiLuDing: '四路顶',
  LiuLuDing: '六路顶',
};

Object.keys(gameTypes).forEach(function (type) {
  var a = document.createElement('a');
  a.innerHTML = gameTypes[type];
  a.href = '/' + type;
  $('#type-select').appendChild(a);
});

var query = location.pathname.split('/');
var type = query[1], room = query[2];
if (!(type in gameTypes)) {
  $('#type-select').style.display = 'block';
  document.title = '请选择游戏类型...';
} else {
  if (room) {
    $('#create-private-room').style.display = 'none';
  }

  document.title = gameTypes[type];
  initBackgroundColor();
  if (localStorage.name && localStorage.color) {
    $('#settings').style.display = 'none';
    init();
  }
  $('#nickname').value = localStorage.name || '又一位玩家';
  $('#color').value = localStorage.color || getRandomColor();
  $('#confirm-settings').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.name = $('#nickname').value;
    localStorage.color = $('#color').value;
    $('#settings').style.display = 'none';
    if (socket) {
      initStyle();
      socket.disconnect();
      socket.connect();
    } else {
      init();
    }
  });
}

function init() {
  initStyle();
  initSocket();
  initListeners();
  resize();
}
function initStyle() {
  $('#send').style.backgroundColor = localStorage.color;
  $('#ready').style.backgroundColor = localStorage.color;
  $('#content').style.borderTopColor = localStorage.color;
  $('#chat-panel').style.borderLeftColor = localStorage.color;
  $('#cancel-settings').style.display = 'block';
}
var socket, players, game, blink;
function initSocket() {
  /* global io:false */
  socket = io(location.origin + '/' + type);
  socket.on('connect', function () {
    socket.emit('join', {
      id: socket.id,
      name: localStorage.name,
      color: localStorage.color,
      room: room,
    });
  });
  socket.on('start', function (data) {
    data.players = players;
    game = new window[type](socket, data, $('canvas'));
    $('#out-game-controls').style.display = 'none';
    $('#in-game-controls').style.display = 'block';
    handleProgress(data.active);
  });
  socket.on('updatePlayers', function (data) {
    players = data;
  });
  socket.on('chat', function (data) {
    var li = document.createElement('li');
    if ('className' in data) {
      li.className = data.className;
    }
    li.innerHTML = data.content.replace(/&\{.*?\}/g, function (match) {
      var id = match.slice(2, -1);
      var player = players.find(function (player) {
        return player.id === id;
      });
      return '<span style="color:' + player.color + '">' + player.name + '</span>';
    });
    if (data.className.indexOf('system') !== -1) {
      li.innerHTML = '<i class="fa fa-info-circle fa-lg"></i> ' + li.innerHTML;
    }
    $('#message').appendChild(li);
    li.scrollIntoView();
  });
  socket.on('update', function (data) {
    if ('active' in data) {
      handleProgress(data.active);
      if (data.active === game.index) {
        var oldTitle = gameTypes[type];
        if (!document.hasFocus()) {
          blink = setInterval(function () {
            document.title = (document.title === oldTitle) ? '轮到你了！' : oldTitle;
            if (document.hasFocus()) {
              document.title = oldTitle;
              clearInterval(blink);
            }
          }, 1000);
        }
      } else {
        document.title = gameTypes[type];
        clearInterval(blink);
      }
    }
  });
  socket.on('gameOver', function () {
    $('#in-game-controls').style.display = 'none';
    $('#out-game-controls').style.display = 'block';
    $('#unready').style.display = 'none';
    $('#ready').style.display = 'block';
    document.title = gameTypes[type];
    clearInterval(blink);
    clearInterval(interval);
  });
}

function initListeners() {
  $('#chat').addEventListener('submit', function (e) {
    e.preventDefault();
    var content = $('#content');
    if (content.value.trim()) {
      socket.emit('chat', content.value.trim());
    }
    content.value = '';
  });
  $('#ready').addEventListener('click', function () {
    socket.emit('ready');
    $('#ready').style.display = 'none';
    $('#unready').style.display = 'block';
  });
  $('#unready').addEventListener('click', function () {
    socket.emit('unready');
    $('#unready').style.display = 'none';
    $('#ready').style.display = 'block';
  });
  $('#skip').addEventListener('click', function () {
    if (game.active === game.index) {
      socket.emit('skip');
      $('#skip').style.backgroundColor = 'rgba(0,0,0,0.25)';
      clearInterval(interval);
    }
  });
  $('#surrender').addEventListener('click', function () {
    socket.emit('surrender');
  });

  $('#change-settings').addEventListener('click', function () {
    $('#settings').style.display = 'block';
  });
  $('#change-type').addEventListener('click', function () {
    if (confirm('更改游戏类型将退出当前房间！')) {
      socket.disconnect();
      onbeforeunload = null;
      $('#type-select').style.display = 'block';
    }
  });
  $('#create-private-room').addEventListener('click', function () {
    if (confirm('创建私人房间将退出当前房间！')) {
      onbeforeunload = null;
      location.href += '/' + socket.id;
    }
  });
  $('#cancel-settings').addEventListener('click', function () {
    $('#settings').style.display = 'none';
  });
  $('#background-color').addEventListener('input', function () {
    localStorage.backgroundColor = this.value;
    initBackgroundColor();
  });
  addEventListener('resize', resize);
  onbeforeunload = function () {
    return '确认离开？';
  };
}
function initBackgroundColor() {
  localStorage.backgroundColor = localStorage.backgroundColor || '#ffffff';
  $('#background-color').value = localStorage.backgroundColor;
  document.body.style.backgroundColor = localStorage.backgroundColor;
  $('#settings').style.backgroundColor = localStorage.backgroundColor;
  $('#send').style.color = localStorage.backgroundColor;
  $('#controls').style.color = localStorage.backgroundColor;
}
var interval;
function handleProgress(active) {
  clearInterval(interval);
  $('#skip').style.backgroundColor = (active === game.index) ? localStorage.color : 'rgba(0,0,0,0.25)';
  $('#progress-inner').style.width = '100%';
  $('#progress-inner').style.backgroundColor = game.players[active].color;
  var start = new Date().getTime();
  interval = setInterval(function () {
    var time = new Date().getTime();
    $('#progress-inner').style.width = 100 - (time - start) / 300 + '%';
    if (time >= start + 30000) {
      clearInterval(interval);
    }
  }, 1000 / 60);
}
function resize() {
  var h = document.body.clientHeight - $('#controls').getBoundingClientRect().height;
  var w = document.body.clientWidth - $('#chat-panel').getBoundingClientRect().width;
  var size = Math.min(500, h - 10, w - 10);
  var canvas = $('canvas');
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.left = (w - size) / 2 + 'px';
  canvas.style.top = (h - size) / 2 + 'px';
  $('#controls').style.width = w + 'px';
}
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 256 * 256 * 256).toString(16);
}
function $(selector) {
  return document.querySelector(selector);
}
