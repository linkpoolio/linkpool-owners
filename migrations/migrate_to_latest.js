const PoolOwners = artifacts.require("PoolOwners");

const util = require('util');
const fs = require('fs');
const path = require('path');

const Web3 = require('web3');

const readFile = util.promisify(fs.readFile);

const ownersPath = path.resolve(__dirname, '../scripts/assets/owners.json');

const ethWallet = "0xe2d06414b011d6dfff2d7181feb37e68e8322d61";
const firstPoolOwner = "0xAB31AE46f4D4Dd01a475d41832dE9b863B712E13";
const secondPoolOwner = "0xde7d9d56d64895d9dc862476f7a98f8d921cd160";
const thirdPoolOwner = "0x12243A169c448d0bb039023039210D9A1084c9a9";

module.exports = async end => {
    let web3 = new Web3();
    var ownersObj = {
        owners: []
    }
    
    let ownersJSON = await readFile(ownersPath);
    ownersObj = JSON.parse(ownersJSON);

    console.log("Number of unique owners: " + ownersObj.owners.length);
    
    let newPoolOwners;
    if (!process.argv[6]) {
        console.log("Deploying the new contract...");
        newPoolOwners = await PoolOwners.new(ethWallet);
        console.log("New PoolOwners: " + newPoolOwners.address);
    
        console.log("Setting the initial owners...");
        await newPoolOwners.setOwnerShare(firstPoolOwner, web3.utils.toWei('1480', 'ether'));
        await newPoolOwners.setOwnerShare(secondPoolOwner, web3.utils.toWei('1480', 'ether'));
        await newPoolOwners.setOwnerShare(thirdPoolOwner, web3.utils.toWei('43.04', 'ether'));

        console.log("Whitelisting the LINK token...");
        await newPoolOwners.whitelistToken("0x20fe562d797a42dcb3399062ae9546cd06f63280", web3.utils.toWei('500', 'ether'));
    } else {
        newPoolOwners = await PoolOwners.at(process.argv[6]);
        console.log("Using PoolOwners at: " + process.argv[6]);
    }

    console.log("Setting all the owners...");
    seen = [];
    for (let i = 0; i < ownersObj.owners.length; i++) {
        if (!seen[ownersObj.owners[i].address]) {
            let owner = await newPoolOwners.getOwnerTokens(ownersObj.owners[i].address);
            if (!owner.toNumber()) {
                console.log("Setting " + ownersObj.owners[i].address + " at " + web3.utils.fromWei(ownersObj.owners[i].tokenAmount));
                try {
                    await newPoolOwners.setContribution(
                        ownersObj.owners[i].address, 
                        ownersObj.owners[i].tokenAmount
                    );
                } catch (e) {
                    console.log(e);
                    return end();
                }
            } else {
                console.log("Skipping " + ownersObj.owners[i].address + " due to either 0 contribution or already in the contract")
            }
            seen[ownersObj.owners[i].address] = true;
        }
    }
    console.log("New PoolOwners: " + newPoolOwners.address)

    let finalTotal = await newPoolOwners.totalContributed.call();
    let totalOwners = await newPoolOwners.getCurrentOwners();
    console.log("Total Contributed: " + web3.utils.fromWei(finalTotal.toString()));
    console.log("Total Owners: " + totalOwners.toString());

    return end();
}