const crypto = require('crypto');
const bip39 = require('bip39');
const sha256 = require('js-sha256');


class HashGenerators {
  constructor() {
    this.generatorByNetwork = {
      bitcoin: (secret) => this.getBitcoinSecretHash(secret),
      ethereum: (secret) => this.getEthereumSecretHash(secret),
      'ethereum-token': (secret) => this.getEthereumSecretHash(secret),
      ton: (secret) => this.getTonSecretHash(secret),
    };
  }
  
  // secret - hex encoded hex string
  getSHA256Hash(secret) {
    const secretBuffered = Buffer.from(secret, 'hex');
    return sha256(secretBuffered);
  }
  
  getEthereumSecretHash(secret) {
    return this.getSHA256Hash(secret);
  }
  
  getBitcoinSecretHash(secret) {
    return this.getSHA256Hash(secret);
  }
  
  getTonSecretHash(secret) {
    return this.getSHA256Hash(secret);
  }
}


// TODO: add TON support
class SecretGenerator extends HashGenerators {
  constructor(seed) {
    super();
    
    this.mnemonic = this.generateMnemonic();
    this.seed = this.generateSeed(this.mnemonic);
    this.raw = this.generateRawSecret(seed ? seed : this.seed);
  }
  
  generateMnemonic() {
    return bip39
      .generateMnemonic();
  }
  
  generateSeed(mnemonic) {
    return bip39
      .mnemonicToSeedSync(mnemonic)
      .toString('hex');
  }
  
  generateRawSecret(seed) {
    return crypto
      .createHash('sha512')
      .update(seed)
      .digest()
      .toString('hex');
  }
  
  getSecretHash(network) {
    if (network in this.generatorByNetwork) return this.generatorByNetwork[network](this.raw);
    
    throw new Error(`Network ${network} currently not supported`);
  }
}


class Timer {
  async getTime(web3) {
    const { timestamp } = await web3.eth.getBlock('latest');
    
    return new Date(timestamp * 1000);
  }
  
  async advanceTimeAndBlock(time, web3) {
    await this.advanceTime(time, web3);
    await this.advanceBlock(web3);
    
    return Promise.resolve(web3.eth.getBlock('latest'));
  }
  
  async advanceTime(time, web3) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err); }
        
        return resolve(result);
      });
    });
  }
  
  async advanceBlock(web3) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err); }
        const newBlockHash = web3.eth.getBlock('latest').hash;
        
        return resolve(newBlockHash)
      });
    });
  }
}

const PREFIX = "Returned error: VM Exception while processing transaction: ";

async function tryCatch(promise, message) {
  try {
    await promise;
    throw null;
  }
  catch (error) {
    assert(error, "Expected an error but did not get one");
    assert(error.message.startsWith(PREFIX + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
  }
}

const secretToUints = (secretRaw) => {
  return [
    `0x${secretRaw.slice(0, secretRaw.length / 2)}`,
    `0x${secretRaw.slice(secretRaw.length / 2)}`
  ];
};



module.exports = {
  Timer,
  SecretGenerator,
  secretToUints,
  catchRevert            : async function(promise) {await tryCatch(promise, "revert"             );},
  catchOutOfGas          : async function(promise) {await tryCatch(promise, "out of gas"         );},
  catchInvalidJump       : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
  catchInvalidOpcode     : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
  catchStackOverflow     : async function(promise) {await tryCatch(promise, "stack overflow"     );},
  catchStackUnderflow    : async function(promise) {await tryCatch(promise, "stack underflow"    );},
  catchStaticStateChange : async function(promise) {await tryCatch(promise, "static state change");},
};
