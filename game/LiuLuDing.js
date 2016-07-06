'use strict';

const SiLuDing = require('./SiLuDing');
class LiuLuDing extends SiLuDing {
  constructor(room, emitter) {
    super(room, emitter);
  }
  initGrid() {
    this.grid = [
      [0, 0, 0, 0],
      [null, null, null, null, null],
      [null, null, null, null, null, null],
      [1, null, null, null, null, null, 2],
      [null, 1, null, null, null, null, 2],
      [null, null, 1, null, null, null, 2],
      [null, null, null, 1, null, null, 2],
    ];
  }
  check(i, j) {
    this.checkByDirection(i, j, 'horizonal');
    this.checkByDirection(i, j, 'slash');
    this.checkByDirection(i, j, 'backslash');
  }
  getLineOfSeven(i, j, direction) {
    const line = new Array(7);
    switch (direction) {
      case 'horizonal':
        for (let k = 0; k < 7; k++) {
          line[k] = { i, j: j + k - 3 };
        }
        break;
      case 'slash':
        for (let k = 0; k < 7; k++) {
          line[k] = { i: i + k - 3, j };
        }
        break;
      case 'backslash':
        for (let k = 0; k < 7; k++) {
          line[k] = { i: i + k - 3, j: j + k - 3 };
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
}
LiuLuDing.rooms = [];
LiuLuDing.pawns = 4;
LiuLuDing.seats = 3;

module.exports = LiuLuDing;
