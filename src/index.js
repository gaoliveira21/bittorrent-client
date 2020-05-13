// Open torrent file
'use strisct';

const tracker = require('./tracker');
const torrentParser = require('./torrentParser');

const torrent = torrentParser.open('puppy.torrent');

tracker.getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});