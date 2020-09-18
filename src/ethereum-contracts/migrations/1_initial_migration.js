const Migrations = artifacts.require("Migrations");
const Token = artifacts.require("Token");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
