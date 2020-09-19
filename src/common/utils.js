const crypto = require('crypto');
const bip39 = require('bip39');
const sha256 = require('js-sha256');
const BigNumber = require('bignumber.js');



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


const secretToUints = (secretRaw) => {
  return [
    `0x${secretRaw.slice(0, secretRaw.length / 2)}`,
    `0x${secretRaw.slice(secretRaw.length / 2)}`
  ];
};

const secretHashToUint = (secretHash) => new BigNumber(secretHash, 16).toFixed();


module.exports = {
  SecretGenerator,
  secretToUints,
  secretHashToUint,
};
