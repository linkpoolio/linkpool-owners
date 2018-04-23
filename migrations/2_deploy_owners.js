const LinkToken = artifacts.require("./LinkToken.sol");
const PoolOwners = artifacts.require("./PoolOwners.sol");

// Accounts
const accounts = web3.eth.accounts;

let creator;
let firstOwner;
let secondOwner;

module.exports = async (deployer, network) => {
    switch(network) {
    default:
        ethWallet = accounts[45];
        contractOwner = accounts[0];
        firstPoolOwner = accounts[1];
        secondPoolOwner = accounts[2];
        break;
    }

    return deployer.deploy(LinkToken).then(() => {
        return deployer.deploy(PoolOwners, ethWallet).then(async() => {
            let ownersContract = await PoolOwners.deployed();
    
            // Set the ownership of 75% between the two creators
            await ownersContract.setOwnerShare(firstPoolOwner, web3.toWei(1500, 'ether'), { from: contractOwner });
            await ownersContract.setOwnerShare(secondPoolOwner, web3.toWei(1500, 'ether'), { from: contractOwner });
        });
    });
};