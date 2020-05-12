'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

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

}

function parseConnResp(response) {

}

function buildAnnounceReq(connId) {

}
