require('dotenv').config({ path: './../.env' });

const Migrations = artifacts.require("Migrations");

module.exports = async (deployer, network, accounts) => {
  console.log(`Using ${accounts[0]} as deployer`);
  
  // Deploy Migrations contract only on deployment
  if (network === 'development') {
    await deployer.deploy(Migrations);
  }
};
