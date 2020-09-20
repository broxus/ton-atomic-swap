const bitcoin = require('bitcoinjs-lib');
const TESTNET = bitcoin.networks.testnet;
const MAINNET = bitcoin.networks.bitcoin;

const minimist = require('minimist');
const fs = require('fs');
const htlc = require('./htlc');

// key - WIF PRIVATE KEY
// tx_id - INPUT TX ID
// index - INPUT TX OUTPUT NUM
// receiver - RECEIVER ADDRESS
// out_value - OUTPUT VALUE
// prev_tx - PREVIOUS TRANSACTION HEX
// redeem - REDEEM SCRIPT
args = minimist(process.argv.slice(2));


const keyPair = bitcoin.ECPair.fromWIF(
    args.key,
    MAINNET
);

const psbt = new bitcoin.Psbt({network: MAINNET});
psbt.setVersion(2); // These are defaults. This line is not needed.
psbt.setLocktime(Math.floor(Date.now() / 1000)); // set nLockTime to current unix timestamp

psbt.addInput({
    hash: args.tx_id,
    index: args.index,
    sequence: 0xfffffffe, // sequence number should be < 0xffffffff if we are using nLockTime (otherwise CHECKLOCKTIMEVERIFY will fail)
    nonWitnessUtxo: Buffer.from(args.prev_tx, 'hex'),
    redeemScript: Buffer.from(args.redeem, 'hex')
});

psbt.addOutput({
    address: args.receiver,
    value: parseInt(args.out_value, 10)
});
psbt.signInput(0, keyPair);
psbt.validateSignaturesOfInput(0);

const scriptSig = psbt.data.inputs[0].partialSig[0];

const signature = scriptSig.signature.toString('hex');
const pubKey = scriptSig.pubkey.toString('hex');
const secret = args.secret;
const redeemScript = args.redeem;

// any random hex string here, we just need wrong secret to get to 'incorrect' flow in htlc
const wrong_secret = 'ff'
const finalScriptSig = Buffer.from(htlc.serializeScript([signature, pubKey, wrong_secret, redeemScript]), 'hex');

psbt.data.updateInput(0, { finalScriptSig });
psbt.data.clearFinalizedInput(0);

const tx = psbt.extractTransaction();

console.log('Redeem tx hex:\n', tx.toHex())
fs.writeFile('redeem.tx', tx.toHex(), (err) => { console.log(err); });
