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

const users = new Set();
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
function validBinaryPart(command) {
  return command.match(/^[01]{8}$/) !== null;
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
 * @typedef CommandType
 * @prop {string[]} parts
 * @prop {string} commandName
 */

/**
 * @typedef {Message & CommandType} Command
 */

/**
 * @param {Message} msg
 */
function onMessage(msg) {
  const { message } = msg;
  if (!message.startsWith('!')) return false;
  const parts = message.slice(1).split(' ');
  const commandName = parts.shift().toLowerCase();
  /** @type {Command} */
  const command = { ...msg, commandName, parts };
  if (command === 'led') {
    ledCommand(command);
  }
}

/**
 * @param {Command} command
 */
function ledCommand(command) {
  const { message, author, parts } = command;
  if (users.has(author.channelId)) return false;
  const parts = message.split(' ');
  if (parts.length <= 1) return false;
  const command = parts[1];
  if (!validBinaryPart(command)) return false;
  users.add(author.channelId);
  const value = Number.parseInt(command, 2);
  values.push({
    name: author.displayName, command, value
  });
  setTimeout(() => {
    users.delete(author.channelId);
  }, 30000);
}