// Open torrent file
'use strisct';

const download = require('./download');
const torrentParser = require('./torrentParser');

const torrent = torrentParser.open(process.argv[2]);

download(torrent);