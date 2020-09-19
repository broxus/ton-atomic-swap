require('dotenv').config();

const fs = require('fs');
const { TONClient } = require('ton-client-node-js');

// Configure TON client
const ton = new TONClient();

ton.config.setData({
  servers: [process.env.TON_SERVER],
  waitForTimeout: 10000,
});


const keyPair = {
  secret: process.env.TON_SECRET_KEY,
  public: process.env.TON_PUBLIC_KEY,
};


const htlcPackage = {
  abi: JSON.parse(fs.readFileSync(process.env.TON_HTLC_ABI)),
  imageBase64: fs.readFileSync(process.env.TON_HTLC_TVC).toString('base64'),
};


module.exports = {
  ton,
  keyPair,
  htlcPackage,
};
