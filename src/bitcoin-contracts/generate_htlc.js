const minimist = require('minimist');
const htlc = require('./htlc');
const bitcoin = require('bitcoinjs-lib');


// secret - secret
// receiver - RECEIVER ADDRESS
// payer - PAYER ADDRESS
// timelock - TIMELOCK INT
args = minimist(process.argv.slice(2));

secret_hash = bitcoin.crypto.sha256(Buffer.from(args.secret, 'hex')).toString('hex');

console.log('secret hash', secret_hash);

const htlc_script = htlc.htlc(parseInt(args.timelock, 10), args.payer, args.receiver, secret_hash);

const p2sh_addr = htlc.script_to_p2sh_addr(htlc_script);

console.log('Redeem script - ', htlc_script);
console.log('P2SH addr - ', p2sh_addr);
