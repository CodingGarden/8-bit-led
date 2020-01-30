const { Board, ShiftRegister } = require('johnny-five');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const board = new Board();

function validCommand(command) {
  if (command.length !== 8) return false;
  return [...command].every(d => d === '0' || d === '1');
}

const users = {};
const values = [];

board.on('ready', async () => {
  const serverUrl = 'http://localhost:5000';
  const socket = io(serverUrl);
  const liveChatId = await fetch(`${serverUrl}/streams`)
    .then(res => res.json())
    .then(([ event ]) => {
      if (event) {
        return event.snippet.liveChatId;
      }
      return new Date().toLocaleDateString();
    });
  const register = new ShiftRegister({
    pins: {
      data: 2,
      clock: 3,
      latch: 4
    }
  });
  socket.on(`messages/${liveChatId}`, (messages) => {
    messages.forEach(message => {
      if (message.message.startsWith('!led')) {
        if (users[message.author.channelId]) return false;
        const parts = message.message.split(' ');
        if (parts.length <= 1) return false;
        const command = parts[1];
        if (validCommand(command)) {
          users[message.author.channelId] = true;
          const value = Number.parseInt(command, 2);
          values.push({
            name: message.author.displayName, command, value
          });
          setTimeout(() => {
            users[message.author.channelId] = false;
          }, 30000);
        }
      }
    });
  });

  setInterval(() => {
    if (values.length) {
      const { name, command, value } = values.shift();
      console.log(name, command, value);
      register.send(value);
    }
  }, 2000);
});

