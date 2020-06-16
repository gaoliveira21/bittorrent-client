'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');

const torrentParser = require('./torrentParser');
const util = require('./utils');

module.exports.getPeers = (torrent, callback) => {

  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  // 1. Send connect request
  udpSend(socket, buildConnReq(), url, () => { console.log('connect request...') });

  socket.on('message', response => {

    if (respType(response) === 'connect') {
      // 2. receive and parse connect response
      const connResponse = parseConnResp(response);
      // 3. send announce request. this is where we tell the tracker which files we’re interested in
      const announceReq = buildAnnounceReq(connResponse.connectionId, torrent);
      udpSend(socket, announceReq, url);
    } else if (respType(response) === 'announce') {
      // 4. parse announce response
      const announceResponse = parseAnnounceResp(response);
      // 5. pass peers to callback
      callback(announceResponse.peers);
    }

  })

}

function udpSend(socket, message, rawUrl, callback = () => { }) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.host, callback)
}

function respType(response) {
  const action = response.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
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

function buildAnnounceReq(connId, torrent, port = 6881) {
  const buf = Buffer.allocUnsafe(98);

  //connection id
  connId.copy(buf, 0);

  //action
  buf.writeUInt32BE(1, 8); //announce

  //transaction id
  crypto.randomBytes(4).copy(buf, 12);

  //info hash
  torrentParser.infoHash(torrent).copy(buf, 16);

  //peerId
  util.genId().copy(buf, 36);

  //downloaded
  Buffer.alloc(8).copy(buf, 56);

  //left
  torrentParser.size(torrent).copy(buf, 64);

  //uploaded
  Buffer.alloc(8).copy(buf, 72);

  //event
  buf.writeUInt32BE(0, 80);

  //key
  crypto.randomBytes(4).copy(buf, 88);

  //num want
  buf.writeInt32BE(-1, 92);

  //port 
  buf.writeUInt16BE(port, 96);

  return buf;

}

/**
 * this function parse de announce response(Buffer) to an object(JSON) 
 */
function parseAnnounceResp(response) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let index = 0; index < iterable.length; index += groupSize) {
      groups.push(iterable.slice(index, index + groupSize));
    }
    return groups;
  }

  return {
    action: response.readUInt32BE(0),
    transactionId: response.readUInt32BE(4),
    leechers: response.readUInt32BE(8),
    seeders: response.readUInt32BE(12),
    peers: group(response.slice(20), 6).map(adresses => ({
      ip: adresses.slice(0, 4).join('.'),
      port: adresses.readUInt16BE(4)
    }))
  }

}
