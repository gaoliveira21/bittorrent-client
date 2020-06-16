'use strict'

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./utils/messages');

const Pieces = require('./utils/Pieces');

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    const pieces = new Pieces(torrent.info.pieces.length / 20);
    peers.forEach(peer => download(peer, torrent, pieces));
  })
};

function download(peer, torrent, pieces) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.id, () => {
    // write a message here
    socket.write(message.buildHandshake(torrent))
  });

  const queue = { chocked: true, queue: [] };
  onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue));
}

function msgHandler(msg, socket, pieces, queue) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    switch (m.id) {
      case 0:
        chokeHandler(socket);
        break;
      case 1:
        unchokeHandler(socket, pieces, queue);
        break;
      case 4:
        haveHandler(m.payload);
        break;
      case 5:
        bitfieldHandler(m.payload);
        break;
      case 7:
        pieceHandler(m.payload);
        break;
    }

  }
}

function isHandshake(msg) {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', recvBuf => {
    // msgLen calculates the length of a whole msg
    const msgLen = () => handshake ?
      savedBuf.readUInt8(0) + 49 :
      savedBuf.readInt32BE(0) + 4;

    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {

      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
}

function chokeHandler(socket) { 
  socket.end();
}

function unchokeHandler(socket, pieces, queue) { 
  queue.chocked = false;

  requestPiece(socket, pieces, queue);
}

function haveHandler(payload, socket, requested, queue) {
  const pieceIndex = payload.readInt32BE(0);
  queue.push(pieceIndex);
  if (queue.length === 1)
    requestPiece(socket, requested, queue);
}

function bitfieldHandler(payload) { }

function pieceHandler(payload, socket, requested, queue) {
  queue.shift();
  requestPiece(socket, requested, queue)
}

function requestPiece(socket, pieces, queue) {
  if(queue.chocked) return null;

  while (queue.queue.length) {
    const pieceIndex = queue.shift();

    if(pieces.needed(pieceIndex)) {
      socket.write(message.buildRequest(pieceIndex));
      pieces.addRequested(pieceIndex);
      break;
    }
  }
}
