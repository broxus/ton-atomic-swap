const bitcoin = require('bitcoinjs-lib');
const TESTNET = bitcoin.networks.testnet;
const MAINNET = bitcoin.networks.bitcoin;
const minimist = require('minimist');
const fs = require('fs');

// key - WIF PRIVATE KEY
// tx_id - INPUT TX ID
// index - INPUT TX OUTPUT NUM
// in_value - INPUT TX OUTPUT VALUE
// receiver - RECEIVER ADDRESS
// out_value - OUTPUT VALUE
args = minimist(process.argv.slice(2));

const keyPair = bitcoin.ECPair.fromWIF(
    args.key,
      MAINNET
);

const { address, output } = bitcoin.payments.p2wpkh({
   pubkey: keyPair.publicKey,
   network: MAINNET,
});

const psbt = new bitcoin.Psbt({network: MAINNET});
psbt.setVersion(2); // These are defaults. This line is not needed.
psbt.setLocktime(0); // These are defaults. This line is not needed.

psbt.addInput({
   hash: args.tx_id,
   index: args.index,
   sequence: 0xffffffff,
   witnessUtxo: {
      script: Buffer.from(
          output.toString('hex'),
          'hex'
      ),
      value: parseInt(args.in_value, 10)
   }
});

psbt.addOutput({
   address: args.receiver,
   value: parseInt(args.out_value, 10)
});
psbt.signInput(0, keyPair);
psbt.validateSignaturesOfInput(0);
psbt.finalizeAllInputs();

tx_hex = psbt.extractTransaction().toHex();
console.log('Transaction hex:\n', tx_hex);
fs.writeFile('simple.tx', tx_hex, (err) => { console.log(err); });
