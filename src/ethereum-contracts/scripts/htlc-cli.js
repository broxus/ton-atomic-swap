const AtomicSwapERC20 = artifacts.require("AtomicSwapERC20");
const AtomicSwapETH = artifacts.require("AtomicSwapETH");
const Token = artifacts.require('Token');

const {
  utils: {
    secretToUints,
  },
} = require('@tonatomicswap/common');

const moment = require('moment');
const argv = require('minimist')(process.argv.slice(2));
const cmd = argv.command;


module.exports = async (callback) => {
  let htlcType;
  let htlcContractAddress;
  let htlcContract;
  let balance;
  let amount;

  switch (cmd) {
    case 'deploy-htlc':
      htlcType = argv['htlc-type'];
      
      if (htlcType !== 'eth' && htlcType !== 'erc20') {
        console.error('Specify --htlcType eth or --htlcType erc20!');
        break;
      }
      
      const htlcParams = [
        process.env.ETHEREUM_HTLC_TARGET_ADDRESS,
        process.env.ETHEREUM_HTLC_BACKUP_ADDRESS,
        process.env.ETHEREUM_HTLC_PLATFORM_ADDRESS,
        htlcType === 'eth' ? null : process.env.ETHEREUM_HTLC_TOKEN_ADDRESS, // Token address, need only for htlcType = erc20
        process.env.ETHEREUM_HTLC_FEE_AMOUNT,
        process.env.ETHEREUM_HTLC_SWAP_AMOUNT,
        process.env.ETHEREUM_HTLC_TIME_LOCK,
        process.env.ETHEREUM_HTLC_SECRET_HASH,
      ].filter(e => e !== null);
      
      try {
        console.log(`Deploying HTLC ${htlcType} contract`);

        const htlcContract = (
          htlcType === 'eth' ?
            await AtomicSwapETH.new(...htlcParams) :
            await AtomicSwapERC20.new(...htlcParams)
        );

        console.log(`HTLC contract address: ${htlcContract.address}`);
      } catch (e) {
        console.log(e);
      }
      
      break;
    case 'deploy-token':
      console.log('Deploying token');

      const tokenContract = await Token.new('100000000000000000000');
      console.log(`Token address: ${tokenContract.address}`);

      break;
    case 'get-details':
      htlcContractAddress = process.env.ETHEREUM_HTLC_ADDRESS;
      htlcType = argv['htlc-type'];
  
      if (web3.utils.isAddress(htlcContractAddress) !== true) {
        console.error('Wrong address at ETHEREUM_HTLC_ADDRESS');
        break;
      }
      
      if (htlcType !== 'eth' && htlcType !== 'erc20') {
        console.error('Specify --htlcType eth or --htlcType erc20!');
        break;
      }
  
      console.log(`Getting details for HTLC on ${htlcContractAddress}`);
      console.log(`HTLC type: ${htlcType}`);
      
      htlcContract = htlcContractAddress === 'eth' ?
        await AtomicSwapETH.at(htlcContractAddress) :
        await AtomicSwapERC20.at(htlcContractAddress);
  
      let balance;
      
      try {
        if (htlcType === 'eth') {
          balance = await web3.eth.getBalance(htlcContractAddress);
        } else {
          const tokenContract = await Token.at(process.env.ETHEREUM_HTLC_TOKEN_ADDRESS);
          balance = await tokenContract.balanceOf.call(htlcContractAddress);
        }
      } catch (e) {
        console.log(e);
      }
      const amount = await htlcContract.amount.call();
  
      console.log(`Contract balance: ${balance}`);
      console.log(`Swap amount: ${amount}`);
  
      console.log(`\nContract balance ${balance >= amount ? 'sufficient' : 'insufficient'}\n`);
  
      const refunded = await htlcContract.refunded.call();
      console.log(`HTLC refunded: ${refunded}`);
  
      const withdrawn = await htlcContract.withdrawn.call();
      console.log(`HTLC withdrawn: ${withdrawn}`);
  
      const target = await htlcContract.target.call();
      console.log(`Target address: ${target}`);
  
      const backup = await htlcContract.backup.call();
      console.log(`Backup address: ${backup}`);
  
      const platform = await htlcContract.platform.call();
      console.log(`Platform address: ${platform}`);
  
      const timelock = await htlcContract.timeLock.call();
      console.log(`HTLC time lock: ${moment.unix(parseInt(timelock))}`);
  
      const feeAmount = await htlcContract.feeAmount.call();
      console.log(`Fee amount: ${parseInt(feeAmount)}`);
  
      const hashedSecret = await htlcContract.hashedSecret.call();
      console.log(`Hashed secret as uint: ${BigInt(hashedSecret).toString(10)}`);

      try {
        const secretRaw = [
          (await htlcContract.rawSecret.call(0)),
          (await htlcContract.rawSecret.call(1)),
        ];
        
        console.log(`Raw secret: ${secretRaw[0].toString(16)}${secretRaw[1].toString(16)}`);
      } catch (e) {
        console.log(e);
      }
      
      break;
    case 'withdraw':
      htlcContractAddress = process.env.ETHEREUM_HTLC_ADDRESS;
      htlcType = argv['htlc-type'];
  
      if (web3.utils.isAddress(htlcContractAddress) !== true) {
        console.error('Wrong address at ETHEREUM_HTLC_ADDRESS');
        break;
      }
  
      if (htlcType !== 'eth' && htlcType !== 'erc20') {
        console.error('Specify --htlcType eth or --htlcType erc20!');
        break;
      }
  
      console.log(`Withdrawing HTLC on ${htlcContractAddress}`);
      console.log(`HTLC type: ${htlcType}`);
  
      htlcContract = htlcContractAddress === 'eth' ?
        await AtomicSwapETH.at(htlcContractAddress) :
        await AtomicSwapERC20.at(htlcContractAddress);
      
      try {
        const rawSecret = secretToUints(process.env.ETHEREUM_HTLC_SECRET_RAW);
        const withdrawTransaction = await htlcContract.withdraw.sendTransaction(rawSecret);
      
        console.log(`Withdraw transaction: ${withdrawTransaction.tx}`);
      } catch (e) {
        console.log(e);
      }
      
      break;
    default:
      console.error(`"${cmd}" is not a valid command!`);
      break;
  }

  callback();
};
