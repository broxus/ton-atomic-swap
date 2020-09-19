require('dotenv').config();
const { TONAddressStringVariant } = require('ton-client-js/dist/modules/TONContractsModule.js');
const {
  ton,
  htlcPackage,
  keyPair,
} = require('./utils');
const inputReader = require('wait-console-input');
const moment = require('moment');


(async () => {
  await ton.setup();

  const constructorParams = {
    _target: process.env.TON_HTLC_TARGET_ADDRESS,
    _backup: process.env.TON_HTLC_BACKUP_ADDRESS,
    _platform: process.env.TON_HTLC_PLATFORM_ADDRESS,
    _feeAmount: process.env.TON_HTLC_FEE_AMOUNT,
    _amount: process.env.TON_HTLC_SWAP_AMOUNT,
    _timeLock: process.env.TON_HTLC_TIME_LOCK,
    _hashedSecret: process.env.TON_HTLC_SECRET_HASH,
  };
  
  const initParams = {
    contractNonce: moment().unix(),
  };
  
  try {
    const contractAddress = (await ton.contracts.createDeployMessage({
      package: htlcPackage,
      constructorParams,
      initParams,
      keyPair,
    })).address;
  
    console.log(`Contract address would be: ${contractAddress}`);

    // Convert address format
    const { address: convertedAddress } = await ton.contracts.convertAddress({
      address: contractAddress,
      convertTo: TONAddressStringVariant.Base64,
      base64Params: {
        test: false,
        bounce: false,
        url: true,
      },
    });
  
    console.log(`Use this address with Broxus wallet: ${convertedAddress}`);
  
    inputReader.readLine('Press enter after you fill up the address balance...');
    
    console.log('Deploying contract...');
  
    const message = (await ton.contracts.deploy({
      package: htlcPackage,
      constructorParams,
      initParams,
      keyPair,
    }));
  
    console.log(`Contract deployed at ${message.address}`);
    process.exit(0);
  } catch (e) {
    console.log(e);
  }
})();
