require('dotenv').config();
const {
  ton,
  htlcPackage,
  keyPair,
} = require('./utils');
const {
  utils: {
    secretToUints,
  },
} = require('@tonatomicswap/common');
const assert = require('assert');


(async () => {
  await ton.setup();
  
  const htlcContractAddress = process.env.TON_HTLC_ADDRESS;
  assert(htlcContractAddress !== undefined && htlcContractAddress !== '', 'HTLC contract address is invalid!');
  
  console.log(`Calling HTLC withdraw on ${htlcContractAddress}`);

  const rawSecret = secretToUints(process.env.TON_HTLC_SECRET_RAW);
  console.log(`Raw secret as uints: ${rawSecret}`);
  
  try {
    await ton.contracts.run({
      address: htlcContractAddress,
      functionName: 'withdraw',
      abi: htlcPackage.abi,
      input: {
        _rawSecret: rawSecret,
      },
      keyPair,
    });
    
    console.log('Send swap amount to target successfully');
  
    await ton.contracts.run({
      address: htlcContractAddress,
      functionName: 'withdrawFee',
      abi: htlcPackage.abi,
      input: {},
      keyPair,
    });
  
    console.log('Send fee to the platform successfully');
  } catch (e) {
    console.log(e);
  }
  
  process.exit(0);
})();
