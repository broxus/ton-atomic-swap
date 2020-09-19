require('dotenv').config();
const assert = require('assert');
const moment = require('moment');
const BigNumber = require('bignumber.js');

const {
  ton,
  htlcPackage,
} = require('./utils');
const inputReader = require('wait-console-input');


const readMethod = async (address, functionName, input={}) => {
  const {
    output,
  } = await ton.contracts.runLocal({
    address,
    functionName,
    abi: htlcPackage.abi,
    input,
  });
  
  return output;
};


(async () => {
  await ton.setup();

  const htlcContractAddress = process.env.TON_HTLC_ADDRESS;
  assert(htlcContractAddress !== undefined && htlcContractAddress !== '', 'HTLC contract address is invalid!');
  
  console.log(`Getting details for HTLC on ${htlcContractAddress}`);
  
  const { value0: balance } = await readMethod(htlcContractAddress, 'getBalance');
  console.log(`Contract balance: ${parseInt(balance) / 10**9}`);
  
  const { value0: amount } = await readMethod(htlcContractAddress, 'getAmount');
  console.log(`Swap amount: ${parseInt(amount) / 10**9}`);
  
  console.log(`\nContract balance ${parseInt(balance) >= parseInt(amount) ? 'sufficient' : 'insufficient'}\n`);
  
  const { value0: refunded } = await readMethod(htlcContractAddress, 'getRefunded');
  console.log(`HTLC refunded: ${refunded}`);
  
  const { value0: withdrawn } = await readMethod(htlcContractAddress, 'getWithdrawn');
  console.log(`HTLC withdrawn: ${withdrawn}`);
  
  const { value0: target } = await readMethod(htlcContractAddress, 'getTarget');
  console.log(`Target address: ${target}`);
  
  const { value0: backup } = await readMethod(htlcContractAddress, 'getBackup');
  console.log(`Backup address: ${backup}`);
  
  const { value0: platform } = await readMethod(htlcContractAddress, 'getPlatform');
  console.log(`Platform address: ${platform}`);
  
  const { value0: timelock } = await readMethod(htlcContractAddress, 'getTimeLock');
  console.log(`HTLC time lock: ${moment.unix(parseInt(timelock))}`);

  const { value0: feeAmount } = await readMethod(htlcContractAddress, 'getFeeAmount');
  console.log(`Fee amount: ${parseInt(feeAmount)}`);
  
  const { value0: hashedSecret } = await readMethod(htlcContractAddress, 'getHashedSecret');
  console.log(`Hashed secret as uint: ${BigInt(hashedSecret).toString(10)}`);

  const { value0: rawSecret } = await readMethod(htlcContractAddress, 'getRawSecret');
  console.log(`Raw secret: ${(new BigNumber(rawSecret[0])).toString(16)}${(new BigNumber(rawSecret[1])).toString(16)}`);
  
  process.exit(0);
})();
