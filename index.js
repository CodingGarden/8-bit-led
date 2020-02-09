const { Board, ShiftRegister } = require('johnny-five');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const serverUrl = 'http://localhost:5000';

const socket = io(serverUrl);
const board = new Board();
/** @type {ShiftRegister} */
let register;

 /** @type {Set<string>} */
const users = new Set();
/** @type {import('./types').ValueItem[]} */
const values = [];

setInterval(() => {
  if (!values.length || !register) return false;
  const { name, part, value } = values.shift();
  console.log(name, part, value);
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
 * @returns {Promise<import('./types').Stream[]>}
 */
async function getStreams() {
  const res = fetch(`${serverUrl}/streams`);
  return res.json();
}

/**
 * @returns {Promise<string>}
 */
async function getLiveChatId() {
  const [ event ] = await getStreams();
  if (event) {
    return event.snippet.liveChatId;
  }
  return new Date().toLocaleDateString();
}

/**
 * @param {string} part
 * @return {boolean}
 */
function validBinaryPart(part) {
  return part.match(/^[01]{8}$/) !== null;
}

/**
 * @param {import('./types').Message} msg
 */
function onMessage(msg) {
  const { message } = msg;
  if (!message.startsWith('!')) return false;
  const parts = message.slice(1).split(' ');
  const commandName = parts.shift().toLowerCase();
  /** @type {Command} */
  const command = { ...msg, commandName, parts };
  if (commandName === 'led') {
    ledCommand(command);
  }
}

/**
 * @param {import('./types').Command} command
 */
function ledCommand(command) {
  const { message, author, parts } = command;
  if (users.has(author.channelId)) return false;
  if (parts.length <= 1) return false;
  const firstPart = parts[0];
  if (!validBinaryPart(firstPart)) return false;
  users.add(author.channelId);
  const value = Number.parseInt(firstPart, 2);
  values.push({
    name: author.displayName, part: firstPart, value
  });
  setTimeout(() => {
    users.delete(author.channelId);
  }, 30000);
}