const { Board, ShiftRegister } = require('johnny-five');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const connectFour = require('./connectFour');

const serverUrl = 'http://localhost:5000';

const socket = io(serverUrl);
const board = new Board();
/** @type {ShiftRegister} */
let register;

 /** @type {Set<string>} */
const ledCommandUsers = new Set();
/** @type {import('./types').ValueItem[]} */
const values = [];

// Get a value to send to the register every 2 seconds.
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

  connectFour.ready(board);
});

/**
 * @returns {Promise<import('./types').Stream[]>}
 */
async function getStreams() {
  const res = await fetch(`${serverUrl}/streams`);
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
  /** @type {import('./types').Command} */
  const command = { ...msg, commandName, parts };
  if (commandName === 'led') {
    ledCommand(command);
  } else if (commandName === 'c4') {
    connectFour.move(command);
  }
}

/**
 * Explicitly set the state of the LEDs.
 *
 * A user sends this message:
 * 
 *     !led 10101001
 * 
 * This command interprets the first, required part as an 8-bit number and
 * updates the shift register to light up LEDs in the same pattern.
 *
 * @param {import('./types').Command} command
 */
function ledCommand(command) {
  const { message, author, parts } = command;
  if (parts.length === 0) return false;
  // Validate that a user had not tried to use this command within 30 seconds of
  // their last use.
  if (ledCommandUsers.has(author.channelId)) return false;
  const firstPart = parts[0];
  // Validate a part as an 8-bit binary string.
  if (!validBinaryPart(firstPart)) return false;
  // Remember the user.
  ledCommandUsers.add(author.channelId);
  const value = Number.parseInt(firstPart, 2);
  values.push({
    name: author.displayName, part: firstPart, value
  });
  setTimeout(() => {
    // Remove the user from the list after 30 seconds.
    ledCommandUsers.delete(author.channelId);
  }, 30000);
}