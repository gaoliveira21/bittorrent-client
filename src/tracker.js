'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');

module.exports.getPeers = (torrent, callback) => {

  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  // 1. Send connect request
  udpSend(socket, buildConnReq(), url, () => { console.log('connect request...') });

  socket.on('message', response => {

    if(respType(response) === 'connect') {
      // 2. receive and parse connect response
      const connResponse = parseConnResp(response);
      // 3. send announce request. this is where we tell the tracker which files we’re interested in
      const announceReq = buildAnnounceReq(connResponse.connectionId);
      udpSend(socket, announceReq, url);
    } else if(respType(response) === 'announce') {
      // 4. parse announce response
      const announceResponse = parseAnnounceResp(response);
      // 5. pass peers to callback
      callback(announceResponse.peers);
    }

  })

}

function udpSend(socket, message, rawUrl, callback = () => {}) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.host, callback)
}

function respType(response) {

}

function buildConnReq() {

  const buf = Buffer.alloc(16);

  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);

  // action/connection request
  buf.writeUInt32BE(0, 8);

  //transaction id
  crypto.randomBytes(4).copy(buf, 12);

  console.log(`conn request ${buf}`);
  return buf;

}

function parseConnResp(response) {
  return {
    action: response.readUInt32BE(0),
    transactionId: response.readUInt32BE(4),
    connectionId: response.slice(8)
  }
}

function buildAnnounceReq(connId) {

}
