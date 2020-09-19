const AtomicSwapETH = artifacts.require('AtomicSwapETH');
const AtomicSwapERC20 = artifacts.require('AtomicSwapERC20');
const Token = artifacts.require('Token');
const moment = require('moment');
const logger = require('mocha-logger');
const assert = require('assert');

const {
  catchRevert,
  Timer,
} = require('./utils');

const {
  utils: {
    SecretGenerator,
    secretToUints,
  },
} = require('@tonatomicswap/common');


// Atomic swap independent parameters
const feeAmount = web3.utils.toWei((2).toString(), 'ether');
const amount = web3.utils.toWei((10).toString(), 'ether');
const secretGenerator = new SecretGenerator();
const rawSecret = secretGenerator.raw;
const hashedSecret = secretGenerator.getSecretHash('ethereum');
const wrongRawSecret = (new SecretGenerator()).raw;

let target;
let backup;
let platform;
let payer;
let withdrawer;
let refunder;
let timeLock;

let atomicSwapETHContract;
let atomicSwapERC20Contract;
let tokenContract;

const logActorsEthereumBalances = async () => {
  const atomicSwapContractBalance = await web3.eth.getBalance(atomicSwapETHContract.address);
  const targetBalance = await web3.eth.getBalance(target);
  const backupBalance = await web3.eth.getBalance(backup);
  const platformBalance = await web3.eth.getBalance(platform);
  
  logger.log(`Atomic swap contract balance: ${web3.utils.fromWei(atomicSwapContractBalance)} ETH`);
  logger.log(`Target address balance: ${web3.utils.fromWei(targetBalance)} ETH`);
  logger.log(`Backup address balance: ${web3.utils.fromWei(backupBalance)} ETH`);
  logger.log(`Platform address balance: ${web3.utils.fromWei(platformBalance)} ETH`);
};


const logActorsTokenBalances = async () => {
  const atomicSwapContractBalance = await tokenContract.balanceOf.call(atomicSwapERC20Contract.address);
  const targetBalance = await tokenContract.balanceOf.call(target);
  const backupBalance = await tokenContract.balanceOf.call(backup);
  const platformBalance = await tokenContract.balanceOf.call(platform);
  
  logger.log(`Atomic swap contract balance: ${(atomicSwapContractBalance)} tokens`);
  logger.log(`Target address balance: ${(targetBalance)} tokens`);
  logger.log(`Backup address balance: ${(backupBalance)} tokens`);
  logger.log(`Platform address balance: ${(platformBalance)} tokens`);
};


const prepareAtomicSwapContracts = async () => {
  atomicSwapETHContract = await AtomicSwapETH.new(
    target,
    backup,
    platform,
    feeAmount,
    amount,
    timeLock.unix(),
    BigInt(`0x${hashedSecret}`).toString(10),
  );
  
  tokenContract = await Token.new('100000000000000000000');
  
  atomicSwapERC20Contract = await AtomicSwapERC20.new(
    target,
    backup,
    platform,
    tokenContract.address,
    feeAmount,
    amount,
    timeLock.unix(),
    BigInt(`0x${hashedSecret}`).toString(10),
  );
  
  logger.log(`ETH atomic swap contract address: ${atomicSwapERC20Contract.address}`);
  logger.log(`ERC20 atomic swap contract address: ${atomicSwapETHContract.address}`);
  logger.log(`Token contract address: ${tokenContract.address}`);
};


contract('Testing atomic swap contracts', async (accounts) => {
  before(async () => {
    [payer, target, backup, platform, withdrawer, refunder] = accounts;
    
    // - Why don't you declare timeLock as an independent parameter?
    // > Because it's possible that the blockchain simulator (for example ganache)
    // > have already manipulated time so the timeLock, based on the real world time
    // > Won't be in the future for the blockchain simulator
    // > So you can restart ganache after each test of create the timeLock
    // > based on the blockchain time
    const currentBlockchainTime = await (new Timer()).getTime(web3);
    timeLock = moment(currentBlockchainTime).add(1, "day");
  
    logger.log(`Raw secret: ${rawSecret}`);
    logger.log(`Hashed secret: ${hashedSecret}`);
    logger.log(`Target address: ${target}`);
    logger.log(`Backup address: ${backup}`);
    logger.log(`Platform address: ${platform}`);
    logger.log(`Swap amount: ${web3.utils.fromWei(amount)} ETH`);
    logger.log(`Fee amount: ${web3.utils.fromWei(feeAmount)} ETH`);
    logger.log(`Refund timelock: ${timeLock}`);
  });

  describe('Testing withdraw functionality', async () => {
    before(async () => prepareAtomicSwapContracts());
  
    it('Check the initial state', async () => {
      assert(
        ((await atomicSwapETHContract.target.call()) === target) &&
        ((await atomicSwapERC20Contract.target.call()) === target),
        'Wrong target address'
      );
      assert(
        ((await atomicSwapETHContract.backup.call()) === backup) &&
        ((await atomicSwapERC20Contract.backup.call()) === backup),
        'Wrong backup address'
      );
      assert(
        ((await atomicSwapETHContract.platform.call()) === platform) &&
        ((await atomicSwapERC20Contract.platform.call()) === platform),
        'Wrong platform address'
      );
      assert(
        ((await atomicSwapETHContract.feeAmount.call()).toString() === feeAmount) &&
        ((await atomicSwapERC20Contract.feeAmount.call()).toString() === feeAmount),
        'Wrong feeAmount'
      );
      assert(
        ((await atomicSwapETHContract.amount.call()).toString() === amount) &&
        ((await atomicSwapERC20Contract.amount.call()).toString() === amount),
        'Wrong amount'
      );
      assert(
        ((await atomicSwapETHContract.timeLock.call()).toNumber() === timeLock.unix()) &&
        ((await atomicSwapERC20Contract.timeLock.call()).toNumber() === timeLock.unix()),
        'Wrong timeLock'
      );
      assert(
        ((await atomicSwapETHContract.withdrawn.call()) === false) &&
        ((await atomicSwapERC20Contract.withdrawn.call()) === false),
        'Contract should not be withdrawn'
      );
      assert(
        ((await atomicSwapETHContract.refunded.call()) === false) &&
        ((await atomicSwapERC20Contract.refunded.call()) === false),
        'Contract should not be refunded'
      );
    });
  
    describe('Test the ETH atomic swap', async () => {
      it('Fill the atomic swap balance', async () => {
        await web3.eth.sendTransaction({
          from: payer,
          value: amount,
          to: atomicSwapETHContract.address,
        });
      
        // await logActorsEthereumBalances();
      
        assert(
          (await web3.eth.getBalance(atomicSwapETHContract.address)) >= amount,
          'Contract balance not sufficient',
        );
      });
    
      it('Try to withdraw with wrong secret', async () => {
        await catchRevert(
          atomicSwapETHContract.withdraw.sendTransaction(
            secretToUints(wrongRawSecret),
            {
              from: withdrawer, // Anyone can call the withdraw, let's say target will do it
            }
          )
        );
      
        assert.deepStrictEqual(
          (await atomicSwapETHContract.withdrawn.call()),
          false,
          'Contract should not be withdrawn with wrong secret'
        );
      });
    
      it('Withdraw with correct secret', async () => {
        const backupBalance = await web3.eth.getBalance(backup);
        const targetBalance = await web3.eth.getBalance(target);
        const platformBalance = await web3.eth.getBalance(platform);
      
        await atomicSwapETHContract.withdraw.sendTransaction(
          secretToUints(rawSecret),
          {
            from: withdrawer,
          }
        );
      
        // await logActorsEthereumBalances();
      
        assert.deepStrictEqual(
          BigInt((await web3.eth.getBalance(atomicSwapETHContract.address))),
          BigInt(0),
          'Atomic swap contract balance should be zero after withdraw performed',
        );
        assert.deepStrictEqual(
          BigInt(platformBalance) + BigInt(feeAmount),
          BigInt((await web3.eth.getBalance(platform))),
          'Wrong platform balance after withdraw performed',
        );
        assert.deepStrictEqual(
          BigInt(targetBalance) + BigInt(amount) - BigInt(feeAmount),
          BigInt((await web3.eth.getBalance(target))),
          'Wrong target balance after withdraw performed',
        );
        assert.deepStrictEqual(
          backupBalance,
          (await web3.eth.getBalance(backup)),
          'Backup balance should not change after withdraw'
        );
      });
    });
  
  
    describe('Test the ERC20 atomic swap', async () => {
      it('Fill the atomic swap balance', async () => {
        await tokenContract
          .transfer
          .sendTransaction(
            atomicSwapERC20Contract.address,
            amount,
            {
              from: payer,
            }
          );
      
        // await logActorsTokenBalances();
      
        assert(
          (await tokenContract.balanceOf.call(atomicSwapERC20Contract.address)) >= amount,
          'Contract balance not sufficient',
        );
      });
    
      it('Try to withdraw with wrong secret', async () => {
        await catchRevert(
          atomicSwapERC20Contract.withdraw.sendTransaction(
            secretToUints(wrongRawSecret),
            {
              from: withdrawer, // Anyone can call the withdraw, let's say target will do it
            }
          )
        );
      
        assert.deepStrictEqual(
          (await atomicSwapERC20Contract.withdrawn.call()),
          false,
          'Contract should not be withdrawn with wrong secret'
        );
      });
    
      it('Withdraw with correct secret', async () => {
        const backupBalance = await tokenContract.balanceOf.call(backup);
        const targetBalance = await tokenContract.balanceOf.call(target);
        const platformBalance = await tokenContract.balanceOf.call(platform);
      
        await atomicSwapERC20Contract.withdraw.sendTransaction(
          secretToUints(rawSecret),
          {
            from: withdrawer,
          }
        );
      
        // await logActorsTokenBalances();
      
        assert.deepStrictEqual(
          BigInt((await tokenContract.balanceOf.call(atomicSwapERC20Contract.address))),
          BigInt(0),
          'Atomic swap contract balance should be zero after withdraw performed',
        );
        assert.deepStrictEqual(
          BigInt(platformBalance) + BigInt(feeAmount),
          BigInt((await tokenContract.balanceOf.call(platform))),
          'Wrong platform balance after withdraw performed',
        );
        assert.deepStrictEqual(
          BigInt(targetBalance) + BigInt(amount) - BigInt(feeAmount),
          BigInt((await tokenContract.balanceOf.call(target))),
          'Wrong target balance after withdraw performed',
        );
        assert.deepStrictEqual(
          backupBalance,
          (await tokenContract.balanceOf.call(backup)),
          'Backup balance should not change after withdraw'
        );
      });
    });
  });
  
  // It's hard to test the refund functionality for ERC20 and ETH atomic swaps consistently
  // Because we need to manipulate the time only forward, not backward
  describe('Testing refund functionality for ETH and ERC20 contract simultaneously', async () => {
    before(async () => prepareAtomicSwapContracts());
    
    it('Fill the atomic swap balance', async () => {
      await web3.eth.sendTransaction({
        from: payer,
        value: amount,
        to: atomicSwapETHContract.address,
      });
    
      assert(
        (await web3.eth.getBalance(atomicSwapETHContract.address)) >= amount,
        'ETH contract balance not sufficient',
      );
    
      await tokenContract
        .transfer
        .sendTransaction(
          atomicSwapERC20Contract.address,
          amount,
          {
            from: payer,
          }
        );
    
      // await logActorsTokenBalances();
    
      assert(
        (await tokenContract.balanceOf.call(atomicSwapERC20Contract.address)) >= amount,
        'Token contract balance not sufficient',
      );
    });
  
    it('Try to refund before time lock ends', async () => {
      await catchRevert(
        atomicSwapETHContract.refund.sendTransaction({
          from: refunder, // Anyone can call the refund
        })
      );
    
      await catchRevert(
        atomicSwapERC20Contract.refund.sendTransaction({
          from: refunder, // Anyone can call the refund
        })
      );
    
      assert(
        ((await atomicSwapETHContract.refunded.call()) === false) &&
        ((await atomicSwapERC20Contract.refunded.call()) === false),
        'Contract should not be refunded before time lock ends'
      );
    });
  
    it('Refund after time lock ends', async () => {
      const backupBalanceETH = await web3.eth.getBalance(backup);
      const backupBalanceERC20 = await tokenContract.balanceOf.call(backup);
    
      const timer = new Timer();
    
      // Advance time for time lock + 1 minutes
      await timer.advanceTimeAndBlock(timeLock.unix() - moment().unix() + 60, web3);
    
      await atomicSwapETHContract.refund.sendTransaction({
        from: refunder,
      });
    
      assert.deepStrictEqual(
        BigInt((await web3.eth.getBalance(atomicSwapETHContract.address))),
        BigInt(0),
        'Atomic swap contract balance should be zero after refund',
      );
      assert.deepStrictEqual(
        BigInt((await web3.eth.getBalance(backup))),
        BigInt(backupBalanceETH) + BigInt(amount),
        'Wrong backup balance after refund',
      );
    
      await atomicSwapERC20Contract.refund.sendTransaction({
        from: refunder,
      });
    
      assert.deepStrictEqual(
        BigInt((await tokenContract.balanceOf.call(atomicSwapERC20Contract.address))),
        BigInt(0),
        'Atomic swap contract balance should be zero after refund',
      );
      assert.deepStrictEqual(
        BigInt((await tokenContract.balanceOf.call(backup))),
        BigInt(backupBalanceERC20) + BigInt(amount),
        'Wrong backup balance after refund',
      );
    });
  });
});
