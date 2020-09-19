const bitcoin = require('bitcoinjs-lib');
const TESTNET = bitcoin.networks.testnet;
const fs = require('fs');


// generate new random TESTNET ADDRESS
const keyPair = bitcoin.ECPair.makeRandom({ network: TESTNET });
// dump key
console.log('WIF private key: ', keyPair.toWIF());

// generate address
const { address } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: TESTNET,
});

// dump address
console.log('Bitcoin Testnet address (native segwit): ', address);

dump_msg = `WIF key:\n\n${keyPair.toWIF()}\n\nAddress (native segwit):\n\n${address}`;
fs.writeFile('key_addr.dump', dump_msg, (err) => { console.log(err); });
