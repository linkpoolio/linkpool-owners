const LinkToken = artifacts.require("./LinkToken.sol");
const PoolOwners = artifacts.require("./PoolOwners.sol");

var contractOwner;
var ethWallet;
var firstPoolOwner;
var secondPoolOwner;

module.exports = async(deployer, network, accounts) => {
    switch(network) {
        case "ropsten":
            contractOwner = accounts[0];
            ethWallet = "0xE2D06414b011D6DFff2D7181FEB37e68e8322D61";
            firstPoolOwner = "0xAB31AE46f4D4Dd01a475d41832dE9b863B712E13";
            secondPoolOwner = "0x8c79708f8F6651d38779975F83c33588e7767AD0";
            break;
        default:
            contractOwner = accounts[0];
            ethWallet = accounts[299];
            firstPoolOwner = accounts[1];
            secondPoolOwner = accounts[2];
            break;
    }

    var ownersContract;

    return deployer.deploy(LinkToken).then(() => {
        return deployer.deploy(PoolOwners, ethWallet).then(async() => {
            let ownersContract = await PoolOwners.deployed();
    
            // Set the ownership of 75% between the two creators
            await ownersContract.setOwnerShare(firstPoolOwner, web3.toWei(1500, 'ether'), { from: contractOwner });
            await ownersContract.setOwnerShare(secondPoolOwner, web3.toWei(1500, 'ether'), { from: contractOwner });
        });
    });
};