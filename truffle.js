const Web3Utils = require('web3-utils');

// Totally Neccessary ASCII Art of LinkPool
const art = require('ascii-art');
art.font('LinkPool', 'Doom', function(rendered){
    console.log("\n");
    console.log(rendered);
});

module.exports = {
  web3Utils: Web3Utils,
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6712390,
      gasPrice: 0
    }
  }
};
