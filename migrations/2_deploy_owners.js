const LinkToken = artifacts.require("./LinkToken.sol");
const PoolOwners = artifacts.require("./PoolOwners.sol");

// Accounts
const accounts = web3.eth.accounts;

module.exports = async (deployer) => {
    return deployer.deploy(LinkToken).then(() => {
        return deployer.deploy(PoolOwners, accounts[45]).then(async() => {
            let ownersContract = await PoolOwners.deployed();
    
            // Set the ownership of 75% between the two creators
            await ownersContract.setOwnerShare(accounts[1], web3.toWei(1500, 'ether'), { from: accounts[0] });
            await ownersContract.setOwnerShare(accounts[2], web3.toWei(1500, 'ether'), { from: accounts[0] });
        });
    });
};