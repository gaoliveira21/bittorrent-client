'use strict'

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./utils/messages');

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    peers.forEach(peer => download(peer, torrent));
  })
};

function download(peer, torrent) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.id, () => {
    // write a message here
    socket.write(message.buildHandshake(torrent))
  });
  onWholeMsg(socket, msg => msgHandler(msg, socket));
}

function msgHandler(msg, socket) {
  if(isHandshake(msg)) socket.write(message.buildInterested());
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
