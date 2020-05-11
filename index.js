// Open torrent file
'use strisct';
const fs = require('fs');
const bencode = require('bencode');

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
console.log(torrent.announce.toString('utf8'));