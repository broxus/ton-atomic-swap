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



module.exports = {
  Timer,
  catchRevert            : async function(promise) {await tryCatch(promise, "revert"             );},
  catchOutOfGas          : async function(promise) {await tryCatch(promise, "out of gas"         );},
  catchInvalidJump       : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
  catchInvalidOpcode     : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
  catchStackOverflow     : async function(promise) {await tryCatch(promise, "stack overflow"     );},
  catchStackUnderflow    : async function(promise) {await tryCatch(promise, "stack underflow"    );},
  catchStaticStateChange : async function(promise) {await tryCatch(promise, "static state change");},
};
