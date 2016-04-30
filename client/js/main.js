'use strict';

try {
  screen.lockOrientation('landscape');
  screen.msLockOrientation('landscape');
} catch (e) {
  console.log(e);
}

window.gameTypes = {
  SiLuDing: '四路顶',
  LiuLuDing: '六路顶',
};

for (var type in window.gameTypes) {
  var a = document.createElement('a');
  a.innerHTML = window.gameTypes[type];
  a.href = '?gameType=' + type;
  $('#type-select').appendChild(a);
}

window.query = parseQuery(location.search);
window.gameType = window.query.gameType;
if (!(window.gameType in window.gameTypes)) {
  $('#type-select').style.display = 'block';
  document.title = '请选择游戏类型...';
} else {
  window.room = window.query.room;
  if (window.room) {
    $('#create-private-room').style.display = 'none';
  }

  document.title = window.gameTypes[window.gameType];
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
    if (window.socket) {
      initStyle();
      window.socket.disconnect();
      window.socket.connect();
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
function initSocket() {
  window.socket = window.io(location.origin + '/' + window.gameType);
  var socket = window.socket;
  socket.on('connect', function () {
    var player = {
      id: socket.id,
      name: localStorage.name,
      color: localStorage.color,
      room: window.room,
    };
    socket.emit('join', player);
  });
  socket.on('start', function (data) {
    window.game = new window[window.gameType + 'Client'](socket, data, $('canvas'));
    $('#out-game-controls').style.display = 'none';
    $('#in-game-controls').style.display = 'block';
    handleProgress(data.active);
  });
  socket.on('chat', function (data) {
    var li = document.createElement('li');
    data.class && (li.className = data.class);
    li.innerHTML = data.content;
    if (data.class.indexOf('system') !== -1) {
      li.innerHTML = '<i class="fa fa-info-circle fa-lg"></i> ' + li.innerHTML;
    }
    $('#message').appendChild(li);
    li.scrollIntoView();
  });
  socket.on('update', function (data) {
    if ('active' in data) {
      handleProgress(data.active);
      if (data.active === window.game.index) {
        var oldTitle = window.gameTypes[window.gameType];
        if (!document.hasFocus()) {
          window.blink = setInterval(function () {
            document.title = (document.title === oldTitle) ? '轮到你了！' : oldTitle;
            if (document.hasFocus()) {
              document.title = oldTitle;
              clearInterval(window.blink);
            }
          }, 1000);
        }
      } else {
        document.title = window.gameTypes[window.gameType];
        clearInterval(window.blink);
      }
    }
  });
  socket.on('gameOver', function (winner) {
    $('#in-game-controls').style.display = 'none';
    $('#out-game-controls').style.display = 'block';
    $('#unready').style.display = 'none';
    $('#ready').style.display = 'block';
  });
}

function initListeners() {
  $('#chat').addEventListener('submit', function (e) {
    e.preventDefault();
    var content = $('#content');
    if (content.value.trim()) {
      window.socket.emit('chat', content.value.trim());
    }
    content.value = '';
  });
  $('#ready').addEventListener('click', function () {
    window.socket.emit('ready');
    $('#ready').style.display = 'none';
    $('#unready').style.display = 'block';
  });
  $('#unready').addEventListener('click', function () {
    window.socket.emit('unready');
    $('#unready').style.display = 'none';
    $('#ready').style.display = 'block';
  });
  $('#skip').addEventListener('click', function () {
    if (window.game.active === window.game.index) {
      window.socket.emit('skip');
      $('#skip').style.backgroundColor = 'rgba(0,0,0,0.25)';
      clearInterval(window.interval);
    }
  });
  $('#surrender').addEventListener('click', function () {
    window.socket.emit('surrender');
  });

  $('#change-settings').addEventListener('click', function () {
    $('#settings').style.display = 'block';
  });
  $('#change-type').addEventListener('click', function () {
    if (confirm('更改游戏类型将退出当前房间！')) {
      window.socket.disconnect();
      window.onbeforeunload = null;
      $('#type-select').style.display = 'block';
    }
  });
  $('#create-private-room').addEventListener('click', function () {
    if (confirm('创建私人房间将退出当前房间！')) {
      window.onbeforeunload = null;
      location.href = location.search + '&room=' + window.socket.id;
    }
  });
  $('#cancel-settings').addEventListener('click', function () {
    $('#settings').style.display = 'none';
  });
  $('#background-color').addEventListener('input', function () {
    localStorage.backgroundColor = this.value;
    initBackgroundColor();
  });
  window.addEventListener('resize', resize);
  window.onbeforeunload = function () {
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
function handleProgress(active) {
  clearInterval(window.interval);
  $('#skip').style.backgroundColor = (active === window.game.index) ? localStorage.color : 'rgba(0,0,0,0.25)';
  $('#progress-inner').style.width = '100%';
  $('#progress-inner').style.backgroundColor = window.game.players[active].color;
  var start = new Date().getTime();
  window.interval = setInterval(function () {
    var time = new Date().getTime();
    $('#progress-inner').style.width = 100 - (time - start) / 300 + '%';
    if (time >= start + 30000) {
      clearInterval(window.interval);
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
function parseQuery(qstr) {
  var query = {};
  var a = qstr.substr(1).split('&');
  for (var i = 0; i < a.length; i++) {
    var b = a[i].split('=');
    query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
  }
  return query;
}
