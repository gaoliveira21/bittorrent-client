'use strict'

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./utils/messages');

module.exports = torrent => {
  const requested = [];
  tracker.getPeers(torrent, peers => {
    peers.forEach(peer => download(peer, torrent, requested));
  })
};

function download(peer, torrent, requested) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.id, () => {
    // write a message here
    socket.write(message.buildHandshake(torrent))
  });
  const queue = [];
  onWholeMsg(socket, msg => msgHandler(msg, socket, requested, queue));
}

function msgHandler(msg, socket, requested, queue) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    switch (m.id) {
      case 0:
        chokeHandler();
        break;
      case 1:
        unchokeHandler();
        break;
      case 4:
        haveHandler(m.payload, socket, requested, queue);
        break;
      case 5:
        bitfieldHandler(m.payload);
        break;
      case 7:
        pieceHandler(m.payload, socket, requested, queue);
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

function chokeHandler() {  }

function unchokeHandler() {  }

function haveHandler(payload, socket, requested, queue) { 
  const pieceIndex = payload.readInt32BE(0);
  queue.push(pieceIndex);
  if(queue.length === 1)
    requestPiece(socket, requested, queue);
}

function bitfieldHandler(payload) {  }

function pieceHandler(payload, socket, requested, queue) {  
  queue.shift();
  requestPiece(socket, requested, queue)
}

function requestPiece(socket, requested, queue) {
  if(requested[queue[0]]) {
    queue.shift();
  } {
    socket.write(message.buildRequest(pieceIndex));
  }
}
