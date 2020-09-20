const argv = require('minimist')(process.argv.slice(2));
const cmd = argv._[0];


const {
  SecretGenerator,
  secretToUints,
  secretHashToUint,
} = require('./utils');


switch (cmd) {
  case 'generate-secret':
    console.log('Generating secret');
    
    const secretGenerator = new SecretGenerator();

    console.log(`Raw secret: ${secretGenerator.raw}`);
    console.log(`Raw secret as two uints: ${secretToUints(secretGenerator.raw)}`);
    console.log(`Secret hash for Ethereum-ETH HTLC: ${secretGenerator.getSecretHash('ethereum')}`);
    console.log(`Secret hash for Ethereum-ERC20 HTLC: ${secretGenerator.getSecretHash('ethereum-token')}`);
    console.log(`Secret hash for Bitcoin HTLC: ${secretGenerator.getSecretHash('bitcoin')}`);
    console.log(`Secret hash as uint: ${secretHashToUint(secretGenerator.getSecretHash('ethereum'))}`);
    break;
  default:
    console.error(`"${cmd}" is not a valid command!`);
    break;
}
