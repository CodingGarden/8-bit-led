const { Board, ShiftRegister } = require('johnny-five');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const serverUrl = 'http://localhost:5000';

const socket = io(serverUrl);
const board = new Board();
/** @type {ShiftRegister} */
let register;

/**
 * @typedef ValueItem
 * @prop {string} name
 * @prop {string} command
 * @prop {number} value
 */

const users = {};
/** @type {ValueItem[]} */
const values = [];

setInterval(() => {
  if (!values.length || !register) return false;
  const { name, command, value } = values.shift();
  console.log(name, command, value);
  register.send(value);
}, 2000);

board.on('ready', async () => {
  register = new ShiftRegister({
    pins: {
      data: 2,
      clock: 3,
      latch: 4
    }
  });
  const liveChatId = await getLiveChatId();
  socket.on(`messages/${liveChatId}`, (messages) => {
    messages.forEach(onMessage);
  });
});

/**
 * @returns {Promise<string>}
 */
function getLiveChatId() {
  return fetch(`${serverUrl}/streams`)
    .then(res => res.json())
    .then(([ event ]) => {
      if (event) {
        return event.snippet.liveChatId;
      }
      return new Date().toLocaleDateString();
    });
}

/**
 * @param {string} command
 * @return {boolean}
 */
function validCommand(command) {
  if (command.length !== 8) return false;
  return [...command].every(d => d === '0' || d === '1');
}

/**
 * @typedef Author
 * @prop {string} channelId
 * @prop {string} channelUrl
 * @prop {string} displayName
 * @prop {boolean} isChatModerator
 * @prop {boolean} isChatOwner
 * @prop {boolean} isChatSponsor
 * @prop {boolean} isVerified
 * @prop {string} profileImageUrl
 */

/**
 * @typedef Message
 * @prop {Author} author
 * @prop {string} id
 * @prop {string} message
 * @prop {'twitch' | 'youtube'} platform
 * @prop {string} publishedAt
 */

/**
 * @param {Message} msg
 */
function onMessage(msg) {
  const { message, author } = msg;
  if (message.startsWith('!led')) {
    if (users[author.channelId]) return false;
    const parts = message.split(' ');
    if (parts.length <= 1) return false;
    const command = parts[1];
    if (validCommand(command)) {
      users[author.channelId] = true;
      const value = Number.parseInt(command, 2);
      values.push({
        name: author.displayName, command, value
      });
      setTimeout(() => {
        users[author.channelId] = false;
      }, 30000);
    }
  }
}