const PoolOwners = artifacts.require("PoolOwners");

const util = require('util');
const fs = require('fs');
const path = require('path');

const Web3 = require('web3');

const readFile = util.promisify(fs.readFile);

const contributorsPath = path.resolve(__dirname, '../scripts/assets/contributors.json');
const whitelistPath = path.resolve(__dirname, '../scripts/assets/whitelist_addresses');

const hardCap = 1000000000000000000000; // 1000 ETH hardcap
const precision = 40000000000000000; // 0.04 ETH in wei, equivalent to 0.01% in the contract

const ethWallet = "0xe2d06414b011d6dfff2d7181feb37e68e8322d61";
const firstPoolOwner = "0xAB31AE46f4D4Dd01a475d41832dE9b863B712E13";
const secondPoolOwner = "0xde7d9d56d64895d9dc862476f7a98f8d921cd160";
const thirdPoolOwner = "0x12243A169c448d0bb039023039210D9A1084c9a9";

module.exports = async end => {
    let web3 = new Web3();

    var contributors = {
        stakedAmounts: []
    }

    let content = await readFile(whitelistPath);
    let addresses = content.toString().split("\r\n");
    
    let contributorsJSON = await readFile(contributorsPath);
    contributors = JSON.parse(contributorsJSON);

    if (contributors.stakedAmounts.length == 0) {  
        let poolOwners = await PoolOwners.at("0x08ae17c53f3002985f67d952f92fa2f3d17581ee");
        console.log("Gathering all the contributed amounts by crowdsalers...");
        for (let i = 0; i < addresses.length; i++) {
            let stakedAmount = await poolOwners.ownerShareTokens(addresses[i]);
            console.log(addresses[i] + ": " + web3.utils.fromWei(stakedAmount.toString()));
            contributors.stakedAmounts.push({
                address: addresses[i], 
                amount: stakedAmount.toString(), 
                amountEther: web3.utils.fromWei(stakedAmount.toString())
            });
        }

        console.log("Writing to file...");
        let json = JSON.stringify(contributors);
        await fs.writeFile(contributorsPath, json, 'utf8');
    }

    console.log("Total whielisted: " + contributors.stakedAmounts.length);

    let totalAmount = 0;
    let totalContributors = 0;
    let seen = [];
    for (let i = 0; i < contributors.stakedAmounts.length; i++) {
        if (!seen[contributors.stakedAmounts[i].address]) {
            totalAmount += Number(contributors.stakedAmounts[i].amount);
            totalContributors++;
            seen[contributors.stakedAmounts[i].address] = true;
        }
    }
    console.log("Total contributors: " + totalContributors);
    console.log("Total ETH contributed: " + web3.utils.fromWei(totalAmount.toString()));

    let unsold = hardCap - totalAmount;
    seen = [];
    let totalAfterDistribution = 0;
    for (let i = 0; i < contributors.stakedAmounts.length; i++) {
        if (!seen[contributors.stakedAmounts[i].address]) {
            let contribution = Number(contributors.stakedAmounts[i].amount);
            let extraShare = contribution / totalAmount * unsold;
            let totalContribution = contribution + extraShare; 
            let quotent = (totalContribution / precision >> 0);
            totalContribution = quotent * precision;
            
            contributors.stakedAmounts[i].newAmount = totalContribution;
            totalAfterDistribution += totalContribution;

            seen[contributors.stakedAmounts[i].address] = true;
        }
    }

    console.log("Total sold after distribution: " + web3.utils.fromWei(totalAfterDistribution.toString()));
    
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
        await newPoolOwners.whitelistToken("0x514910771af9ca656af840dff83e8264ecf986ca");
    } else {
        newPoolOwners = await PoolOwners.at(process.argv[6]);
        console.log("Using PoolOwners at: " + process.argv[6]);
    }

    console.log("Setting all the contributors...");
    seen = [];
    for (let i = 0; i < contributors.stakedAmounts.length; i++) {
        if (!seen[contributors.stakedAmounts[i].address]) {
            let owner = await newPoolOwners.owners.call(contributors.stakedAmounts[i].address);
            if (contributors.stakedAmounts[i].newAmount > 0 && owner[1] == 0) {
                console.log("Setting " + contributors.stakedAmounts[i].address + " at " + web3.utils.fromWei(contributors.stakedAmounts[i].newAmount.toString()));

                // Do loop to alievate the intermittent error of the nonce being too low
                let confirmed = false;
                do {
                    try {
                        await newPoolOwners.setContribution(
                            contributors.stakedAmounts[i].address, 
                            contributors.stakedAmounts[i].newAmount
                        );
                        confirmed = true;
                    } catch (e) {}
                }
                while (!confirmed);
            } else {
                console.log("Skipping " + contributors.stakedAmounts[i].address + " due to either 0 contribution or already in the contract")
            }
            seen[contributors.stakedAmounts[i].address] = true;
        }
    }
    console.log("New PoolOwners: " + newPoolOwners.address)

    let finalTotal = await newPoolOwners.totalContributed.call();
    let totalOwners = await newPoolOwners.totalOwners.call();
    console.log("Total Contributed: " + web3.utils.fromWei(finalTotal.toString()));
    console.log("Total Owners: " + totalOwners.toString());

    return end();
}