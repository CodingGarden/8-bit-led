const pixel = require('node-pixel');

function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r;
  let g;
  let
    b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

let strip;
let stripReady = false;
const colors = {
  twitch: hslToHex(180, 100, 50),
  youtube: hslToHex(0, 100, 50),
};
const teams = {
  [colors.twitch]: 'twitch',
  [colors.youtube]: 'youtube',
};

function newBoard() {
  return [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];
}

function newGame() {
  return {
    currentTeam: ['twitch', 'youtube'][Math.floor(Math.random() * 2)],
    waitingForPlay: true,
    board: newBoard(),
  };
}

// const gameBoard = [
//   0, 0, 0, 0, 0, 0, 0, 0,
//   0, 0, 0, 0, 0, 0, 0, 0,
//   0, 0, 0, 0, 0, 0, 0, 0,
//   0, 0, 0, 0, 0, 0, 0, 0,
//   0, 0, colors.twitch, colors.twitch, colors.twitch, colors.twitch, 0, 0,
// ];
let gameState = newGame();

function ready(board) {
  strip = new pixel.Strip({
    board,
    controller: 'FIRMATA',
    strips: [{
      pin: 13,
      length: 40
    }],
    gamma: 2.8,
  });

  strip.on('ready', () => {
    stripReady = true;
    showBoard();
    console.log('Waiting for play from', gameState.currentTeam);
  });
}

function getIndex(row, column) {
  return 8 * row + column;
}

function animateMatrix() {
  const {
    board
  } = gameState;
  let moves = 0;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 8; column++) {
      const index = getIndex(row, column);
      const nextIndex = getIndex(row + 1, column);
      if (board[index] !== 0 && board[nextIndex] === 0) {
        board[nextIndex] = board[index];
        board[index] = 0;
        moves++;
        break;
      }
    }
    if (moves > 0) break;
  }
  showBoard();
  if (moves > 0) {
    setTimeout(animateMatrix, 1000);
  } else {
    const winningIndices = checkForWin();
    if (winningIndices) {
      const winningColor = board[winningIndices[0]];
      console.log(winningColor);
      console.log('WINNER!!!', teams[winningColor]);
      flashWinningPixels(winningColor, winningIndices);
    } else {
      gameState.waitingForPlay = true;
      if (gameState.currentTeam === 'twitch') {
        gameState.currentTeam = 'youtube';
      } else {
        gameState.currentTeam = 'twitch';
      }
      console.log('Waiting for play from', gameState.currentTeam);
    }
  }
}

function isWinningColumn(index, column) {
  const {
    board
  } = gameState;
  if (board[index] !== 0) {
    let indices = [index];
    const winningColor = board[index];
    for (let row = 1; row < 4; row++) {
      index = getIndex(row, column);
      if (board[index] !== winningColor) {
        return false;
      }
      indices.push(index);
    }
    return indices;
  }
  return false;
}

function isVerticalWin() {
  const {
    board
  } = gameState;
  for (let column = 0; column < 8; column++) {
    let index = getIndex(0, column);
    let indices = isWinningColumn(index, column);
    if (indices) {
      return indices;
    }

    index = getIndex(4, column);
    indices = isWinningColumn(index, column)
    if (indices) {
      return indices;
    }
  }
  return false;
}

function isWinningRow(row, startColumn) {
  const {
    board
  } = gameState;
  let index = getIndex(row, startColumn);
  if (board[index] !== 0) {
    const indices = [index];
    const winningColor = board[index];
    for (let column = startColumn + 1; column < startColumn + 4; column++) {
      index = getIndex(row, column);
      if (board[index] !== winningColor) {
        return false;
      }
      indices.push(index);
    }
    return indices;
  }
  return false;
}

function isHorizontalWin() {
  const {
    board
  } = gameState;
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 5; column++) {
      const indices = isWinningRow(row, column);
      if (indices) {
        return indices;
      }
    }
  }
  return false;
}

function isForwardDiagonalWin() {
  const { board } = gameState;
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 5; column++) {
      const index = getIndex(row, column + 3);
      const winningColor = board[index];
      if (winningColor !== 0) {
        if (board[getIndex(row + 1, column + 2)] === winningColor
          && board[getIndex(row + 2, column + 1)] === winningColor
          && board[getIndex(row + 3, column)] === winningColor
        ) {
          return [
            index,
            getIndex(row + 1, column + 2),
            getIndex(row + 2, column + 1),
            getIndex(row + 3, column)
          ];
        }
      }
    }
  }
  return false;
}

function isBackwardDiagonalWin() {
  const { board } = gameState;
  for (row = 0; row < 2; row++) {
    for (column = 0; column < 5; column++) {
      const index = getIndex(row, column);
      const winningColor = board[index];
      if (winningColor !== 0) {
        if (board[getIndex(row + 1, column + 1)] === winningColor
          && board[getIndex(row + 2, column + 2)] === winningColor
          && board[getIndex(row + 3, column + 3)] === winningColor
        ) {
          return [
            index,
            getIndex(row + 1, column + 1),
            getIndex(row + 2, column + 2),
            getIndex(row + 3, column + 3)
          ];
        }
      }
    }
  }
  return false;
}

function checkForWin() {
  return isVerticalWin()
  || isHorizontalWin()
  || isForwardDiagonalWin()
  || isBackwardDiagonalWin();
}

/* 
TODO:
 cheasy winner animation
 indicator of which team's turn it is
*/

function showBoard() {
  gameState.board.forEach((color, index) => {
    if (color === 0) {
      strip.pixel(index).off();
    } else {
      strip.pixel(index).color(color);
    }
  });
  strip.show();
}

function flashWinningPixels(winningColor, winningIndices, showPixels = false, count = 0) {
  const { board } = gameState;
  winningIndices.forEach(index => board[index] = showPixels ? winningColor : 0);
  showBoard();
  if (count < 30) {
    setTimeout(() => {
      flashWinningPixels(winningColor, winningIndices, !showPixels, count + 1);
    }, 300);
  } else {
    gameState = newGame();
    showBoard();
  }
}

/**
 * @param {import('./types').Command} command
 */
function move(command) {
  if (!stripReady || !command.parts.length || !gameState.waitingForPlay) return;
  const column = parseInt(command.parts[0].match(/^[0-7]$/));
  if (!isNaN(column) && command.platform === gameState.currentTeam && gameState.board[column] === 0) {
    console.log('connect four move', command.author.displayName, command.platform, column);
    let color = colors[command.platform];
    gameState.board[column] = color;
    gameState.waitingForPlay = false;
    showBoard();
    setTimeout(animateMatrix, 1000);
  }
}

module.exports = {
  ready,
  move,
};