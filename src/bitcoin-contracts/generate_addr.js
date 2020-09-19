const bitcoin = require('bitcoinjs-lib');
const TESTNET = bitcoin.networks.testnet;
const MAINNET = bitcoin.networks.bitcoin;
const fs = require('fs');


// generate new random ADDRESS
const keyPair = bitcoin.ECPair.makeRandom({ network: MAINNET });
// dump key
console.log('WIF private key: ', keyPair.toWIF());

// generate address
const { address } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: MAINNET,
});

// dump address
console.log('Bitcoin address (native segwit): ', address);

dump_msg = `WIF key:\n\n${keyPair.toWIF()}\n\nAddress (native segwit):\n\n${address}`;
fs.writeFile('key_addr.dump', dump_msg, (err) => { console.log(err); });
