/**
 * LinkPool Unit Test Suite for Public Contribution
 *  - Tests to ensure that any contribution to be a share holder works as expected
 */

// Contract Artifacts from Truffle
const PoolOwners = artifacts.require("PoolOwners");
const LinkToken = artifacts.require("LinkToken");
const StakeReceiver = artifacts.require("StakeReceiver");

// Contract instances
let poolOwners;
let linkToken;
let stakeReceiver;

// Async version of `assert.throws()` for negative testing
async function assertThrowsAsync(fn, regExp) {
    let f = () => {};
    try {
        await fn();
    } catch(e) {
        f = () => {throw e};
    } finally {
        assert.throws(f, regExp);
    }
}

contract('PoolOwners', accounts => {

    /**
     * Claims all tokens when distribution has started using the batch claim function
     */
    async function batchClaimAll() {
        let totalOwners = await poolOwners.getCurrentOwners();
        await poolOwners.batchClaim(totalOwners, { from: accounts[1] });
    }

    /**
     * Get all LinkToken balances for a set of accounts
     */
    async function getTokenBalances(start, end) {
        let balances = [];
        for (let i = 0; i <= end - start; i++) {
            balances[i + start] = await linkToken.balanceOf(accounts[i + start]); 
        }
        return balances;
    }

    /**
     * Gets the contract instances for public contribution
     */
    before(async() => {
        poolOwners = await PoolOwners.deployed();
        linkToken = await LinkToken.deployed();
        stakeReceiver = await StakeReceiver.new(poolOwners.address);

        // Whitelist the token to begin with
        await poolOwners.whitelistToken(linkToken.address, web3.toWei(1));
    });

    /**
     * Ensure the creators wallets make up for 80% of the share holding
     */
    it("creators should make up of 75% of the share holding", async() => {
        // Get the shares of the creators
        let firstCreator = await poolOwners.getOwnerPercentage(accounts[1]);
        let secondCreator = await poolOwners.getOwnerPercentage(accounts[2]);

        // Assert they total up to 75%
        assert.equal(37.5, firstCreator.toNumber() / 1000, "First creators share should equal 37.5%");
        assert.equal(37.5, secondCreator.toNumber() / 1000, "Second creators share should equal 37.5%");
    });

    /**
     * Add all the test accounts to the whitelist for the rest of the test
     */
    it("should be able to whitelist all accounts contributing", async() => {
        for (i = 3; i < 44; i++) {
            await poolOwners.whitelistWallet(accounts[i], { from: accounts[0] });
            let whitelisted = await poolOwners.whitelist.call(accounts[i]);
            assert.equal(true, whitelisted, "Wallet should be whitelisted after contract call");
        }
    });

    /**
     * Ensure only whitelisted addresses can contribute
     */
    it("shouldn't be allowed to contribute if not whitelisted", async() => {
        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[45],
                    to: PoolOwners.address,
                    value: web3.toWei(5),
                    gas: 200000
                });
            },
            "revert"
        );
    });

    /**
     * Ensure contributions are only allowed once the phase has been marked as active
     */
    it("shouldn't be allowed to contribute if the phase isn't active", async() => {
        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[3],
                    to: PoolOwners.address,
                    value: web3.toWei(5),
                    gas: 200000
                });
            },
            "revert"
        );
    });

    /**
     * Ensure contribution amount is divisble by the minimum contribution amount
     */
    it("shouldn't be able to contribute an amount which isn't divisible by 0.2 ETH", async() => {
        // First contribution, so enable the contribution phase
        await poolOwners.startContribution({ from: accounts[0] });

        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[3],
                    to: PoolOwners.address,
                    value: web3.toWei(1.3),
                    gas: 200000
                });
            },
            "revert"
        );
    });
    
    /**
     * Ensure the minimum contribution of 0.2 ETH results in 0.005% share
     */
    it("a minimum contribution of 0.2 ETH should result in a 0.005% share", async() => {
        // Set the contribution
        await poolOwners.addContribution(accounts[3], web3.toWei(0.2), { from: accounts[0] });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerPercentage(accounts[3]);

        // Assert it equals 0.005%
        assert.equal(0.005, contributorShare.toNumber() / 1000, "Contribution of 0.2 ETH should result in a 0.005% share");
    });
    
    /**
     * Ensure the contribution of 16 ETH results in 0.4% share
     */
    it("a contribution of 16 ETH should result in a 0.4% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[4],
            to: PoolOwners.address,
            value: web3.toWei(16),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerPercentage(accounts[4]);

        // Assert it equals 0.4%
        assert.equal(0.4, contributorShare.toNumber() / 1000, "Contribution of 20 ETH should result in a 0.4% share");
    });

    /**
     * Ensure the contribution of 20 ETH results in 0.5% share
     */
    it("a contribution of 20 ETH should result in a 0.5% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[5],
            to: PoolOwners.address,
            value: web3.toWei(20),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerPercentage(accounts[5]);

        // Assert it equals 0.5%
        assert.equal(0.5, contributorShare.toNumber() / 1000, "Contribution of 25 ETH should result in a 0.5% share");
    });

    /**
     * Ensure the contribution of 13.6 ETH results in 0.34% share
     */
    it("a contribution of 13.6 ETH should result in a 0.34% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[6],
            to: PoolOwners.address,
            value: web3.toWei(13.6),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerPercentage(accounts[6]);

        // Assert it equals 0.34%
        assert.equal(0.34, contributorShare.toNumber() / 1000, "Contribution of 17 ETH should result in a 0.34% share");

        // Get the token balance via the ERC20 implementation
        let contributorTokens = await poolOwners.balanceOf(accounts[6]);
        assert.equal(web3.toWei(13.6), contributorTokens, "Token amount should be 13.6");
    });

    /**
     * Ensure a contributor can contribute again to increase their share
     */
    it("a contributor should be able to contribute multiple times", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[3],
            to: PoolOwners.address,
            value: web3.toWei(0.2),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerPercentage(accounts[3]);

        // Assert it equals 0.01%
        assert.equal(0.01, contributorShare.toNumber() / 1000, "Contribution of another 0.2 ETH should result in a 0.01% share in total");
    });

    /**
     * Ensure the total contributed so far matches what has been contributed
     */
    it("should increment total contributed when contributions are made", async() => {
        // Get the total contributed
        let totalContributed = await poolOwners.totalContributed.call();

        // Does it match?
        assert.equal(50, web3.fromWei(totalContributed.toNumber()), "Total contributed should equal 50");
    });

    /**
     * Ensure 1000 ETH can be sent through contribution to max the hard cap
     */
    it("should be able to contribute up until 1000 ETH", async() => {
        // Send the contribution to get the total to 100 ETH
        await web3.eth.sendTransaction({
            from: accounts[7],
            to: PoolOwners.address,
            value: web3.toWei(50),
            gas: 200000
        });
        // Loop through until we have 1000 ETH staked
        for (i = 8; i < 44; i++) {
            await web3.eth.sendTransaction({
                from: accounts[i],
                to: PoolOwners.address,
                value: web3.toWei(25),
                gas: 200000
            });
        }
        // Get the total contributed
        let totalContributed = await poolOwners.totalContributed.call();
        // Assert it's 1000
        assert.equal(1000, web3.fromWei(totalContributed.toNumber()), "Total contributed should equal 1000");

        // Assert the ETH was transferred to the wallet
        let initialBalance = await web3.eth.getBalance(accounts[46]);
        let newBalance = await web3.eth.getBalance(accounts[299]);
        assert.equal(999.8, web3.fromWei(newBalance.toNumber() - initialBalance.toNumber()), "999.8 ETH should be in the crowdsale wallet");
    });

    /**
     *  Should be able to distribute 100 tokens to all contributors
     */
    it("shouldn't be able to distribute a non-whitelisted token", async() => {
        // Create a malicious token
        let dodgyLink = await LinkToken.new();
        await dodgyLink.transfer(PoolOwners.address, web3.toWei(100), { from: accounts[0] });

        await assertThrowsAsync(
            async() => {
                await poolOwners.distributeTokens(dodgyLink.address, { from: accounts[1] });
            },
            "revert"
        );
    });

    /**
     *  Should be able to distribute 100 tokens to all contributors
     */
    it("should proportionately distribute 100 tokens to all 43 contributors", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(100), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Get all token balances prior to claiming
        let tokenBalances = await getTokenBalances(1, 44);

        // Claim all the tokens on behalf of the owners
        await batchClaimAll();

        // Assert the distribution of tokens is correct
        tokenBalance = await linkToken.balanceOf(accounts[1]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[1].plus(web3.toWei(37.5)).toNumber(), "Total returned for the first creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[2]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[2].plus(web3.toWei(37.5)).toNumber(), "Total returned for the second creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[3]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[3].plus(web3.toWei(0.01)).toNumber(), "Total returned for the first contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[4]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[4].plus(web3.toWei(0.4)).toNumber(), "Total returned for the second contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[5]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[5].plus(web3.toWei(0.5)).toNumber(), "Total returned for the third contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[6]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[6].plus(web3.toWei(0.34)).toNumber(), "Total returned for the fourth contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[7]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[7].plus(web3.toWei(1.25)).toNumber(), "Total returned for the fifth contributor is incorrect");

        for (i = 8; i < 44; i++) {
            tokenBalance = await linkToken.balanceOf(accounts[i]);
            assert.equal(tokenBalance.toNumber(), tokenBalances[i].plus(web3.toWei(0.625)).toNumber(), "Total returned for the contributor is incorrect");
        }
    });

    /**
     *  Should be able to distribute 5000 tokens to all contributors
     */
    it("should proportionately distribute 5000 tokens to all 43 contributors", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(5000), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Get all token balances prior to claiming
        let tokenBalances = await getTokenBalances(1, 44);

        // Claim all the tokens on behalf of the owners
        await batchClaimAll();

        // Assert the distribution of tokens is correct
        tokenBalance = await linkToken.balanceOf(accounts[1]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[1].plus(web3.toWei(1875)).toNumber(), "Total returned for the first creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[2]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[2].plus(web3.toWei(1875)).toNumber(), "Total returned for the second creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[3]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[3].plus(web3.toWei(0.50)).toNumber(), "Total returned for the first contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[4]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[4].plus(web3.toWei(20)).toNumber(), "Total returned for the second contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[5]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[5].plus(web3.toWei(25)).toNumber(), "Total returned for the third contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[6]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[6].plus(web3.toWei(17)).toNumber(), "Total returned for the fourth contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[7]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[7].plus(web3.toWei(62.5)).toNumber(), "Total returned for the fifth contributor is incorrect");

        for (i = 8; i < 44; i++) {
            tokenBalance = await linkToken.balanceOf(accounts[i]);
            assert.equal(tokenBalance.toNumber(), tokenBalances[i].plus(web3.toWei(31.25)).toNumber(), "Total returned for the contributor is incorrect");
        }
    });

    /**
     * Ensure precision has to be adhered to, as the total percentage of ownership can decrease
     */
    it("shouldn't be able to transfer ownership not adhering to the minimum precision", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.sendOwnership(accounts[3], web3.toWei(0.06), { from: accounts[1] });
            },
            "revert"
        );
    });

    /**
     *  Should be able to transfer part of the ownership of LinkPool to another address
     */
    it("should be able to transfer 12.5% ownership to another address", async() => {
        // Transfer 12.5% of the share 
        await poolOwners.sendOwnership(accounts[3], web3.toWei(500), { from: accounts[1] });

        // Assert the owners share is now 25%
        let share = await poolOwners.getOwnerPercentage(accounts[1]);
        assert.equal(share.toNumber() / 1000, 25, "Owners share should be 25%");

        // Assert the receivers share has increased to 12.51%
        share = await poolOwners.getOwnerPercentage(accounts[3]);
        assert.equal(share.toNumber() / 1000, 12.51, "Receivers share should be 12.51%");

        // Assert the current owner size is still 43
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 43, "There should be a total of 43 current owners");
    });

    /**
     *  Should be able to transfer all of a wallets ownership of LinkPool to another address
     */
    it("should be able to transfer 0.4% ownership to a new address", async() => {
        // Increase the allowance of the sender
        await poolOwners.increaseAllowance(accounts[0], web3.toWei(16), { from: accounts[4] });

        // Assert the allowance has increased
        let allowance = await poolOwners.getAllowance(accounts[4], accounts[0]);
        assert.equal(16, web3.fromWei(allowance.toNumber()), "Allowance should be 16 ether after increase");

        // Transfer 0.4% of the share on behalf of the owner
        await poolOwners.sendOwnershipFrom(accounts[4], accounts[44], web3.toWei(16), { from: accounts[0] });

        // Assert the allowance has decreased
        allowance = await poolOwners.getAllowance(accounts[4], accounts[0]);
        assert.equal(0, allowance.toNumber(), "Allowance should be 0 after transfer");

        // Assert the owners share is now 0.4%
        let share = await poolOwners.getOwnerPercentage(accounts[44]);
        assert.equal(0.4, share.toNumber() / 1000, "Owners share should be 0.4%");

        // Assert the senders share has gone to 0%
        share = await poolOwners.getOwnerPercentage(accounts[4]);
        assert.equal(0, share.toNumber(), "Senders share should be 0%");

        // Assert the current owner size is 43
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 43, "There should be a total of 43 current owners");
    });

    /**
     *  Should be able to distribute 5000.1234567 tokens to all contributors
     */
    it("should proportionately distribute 5000.1234567 tokens to all 43 contributors", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(5000.1234567), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Get all token balances prior to claiming
        let tokenBalances = await getTokenBalances(1, 44);

        // Claim all the tokens on behalf of the owners
        await batchClaimAll();

        // Assert the distribution of tokens is correct (manually calculated expected from %)
        tokenBalance = await linkToken.balanceOf(accounts[1]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[1].plus(web3.toWei(1250.030864175)).toNumber(), "Total returned for the first creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[2]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[2].plus(web3.toWei(1875.0462962625)).toNumber(), "Total returned for the second creator is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[3]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[3].plus(web3.toWei(625.51544443317)).toNumber(), "Total returned for the first contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[4]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[4].plus(web3.toWei(0)).toNumber(), "Total returned for the second contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[5]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[5].plus(web3.toWei(25.0006172835)).toNumber(), "Total returned for the third contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[6]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[6].plus(web3.toWei(17.00041975278)).toNumber(), "Total returned for the fourth contributor is incorrect");
        tokenBalance = await linkToken.balanceOf(accounts[7]);
        assert.equal(tokenBalance.toNumber(), tokenBalances[7].plus(web3.toWei(62.50154320875)).toNumber(), "Total returned for the fifth contributor is incorrect");

        for (i = 8; i < 44; i++) {
            tokenBalance = await linkToken.balanceOf(accounts[i]);
            assert.equal(tokenBalance.toNumber(), tokenBalances[i].plus(web3.toWei(31.250771604375)).toNumber(), "Total returned for the contributor is incorrect");
        }

        // Assert that distribution has completed
        let distributionActive = await poolOwners.distributionActive.call();
        assert.equal(distributionActive, false, "Distribution should be completed after claiming all tokens");
    });

    it("should allow distribution when an owner transfers all his ownership away and then gets some back", async() => {
        // Send 0.2% of the ownership back the original owner
        await poolOwners.sendOwnership(accounts[4], web3.toWei(8), { from: accounts[44] });

        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(100), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Assert the current owner size is 44
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 44, "There should be a total of 44 current owners");

        // Claim all the rest
        await batchClaimAll();
        
        // Assert that distribution has complete
        let distributionActive = await poolOwners.distributionActive.call();
        assert.equal(distributionActive, false, "Distribution should be completed after claiming all tokens");
    });

    /**
     * Tests for ownership staking to external contracts, allowing ownership to be locked within
     * another contract, disabling transferring while retaining any rewards to be sent to the owners address
     */

    it("ensure an owner can stake ownership into an external contract", async() => {
        await poolOwners.stakeOwnership(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        let stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(web3.toWei(1), stakedAmount.toNumber(), "The amount of ownership staked does not match");

        let stakedContractAmount = await poolOwners.stakes.call(accounts[1], stakeReceiver.address);
        assert.equal(web3.toWei(1), stakedContractAmount.toNumber(), "The amount of recorded ownership staked to that address does not match");

        let stakedTotalAmount = await poolOwners.stakeTotals.call(accounts[1]);
        assert.equal(web3.toWei(1), stakedTotalAmount.toNumber(), "The total recorded ownership stake does not match");
    });

    it("ensure an owner can remove an ownership stake from an external contract", async() => {
        await poolOwners.removeOwnershipStake(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        let stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(0, stakedAmount.toNumber(), "The amount of ownership staked does not match");

        let stakedContractAmount = await poolOwners.stakes.call(accounts[1], stakeReceiver.address);
        assert.equal(web3.toWei(0), stakedContractAmount.toNumber(), "The amount of recorded ownership staked to that address does not match");

        let stakedTotalAmount = await poolOwners.stakeTotals.call(accounts[1]);
        assert.equal(web3.toWei(0), stakedTotalAmount.toNumber(), "The total recorded ownership stake does not match");
    });

    it("ensure an owner can stake ownership into an external contract multiple times", async() => {
        await poolOwners.stakeOwnership(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        let stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(web3.toWei(1), stakedAmount.toNumber(), "The amount of ownership staked does not match");

        await poolOwners.stakeOwnership(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(web3.toWei(2), stakedAmount.toNumber(), "The amount of ownership staked does not match");

        let stakedContractAmount = await poolOwners.stakes.call(accounts[1], stakeReceiver.address);
        assert.equal(web3.toWei(2), stakedContractAmount.toNumber(), "The amount of recorded ownership staked to that address does not match");

        let stakedTotalAmount = await poolOwners.stakeTotals.call(accounts[1]);
        assert.equal(web3.toWei(2), stakedTotalAmount.toNumber(), "The total recorded ownership stake does not match");
    });

    it("ensure an owner can remove stake ownership from an external contract in increments", async() => {
        await poolOwners.removeOwnershipStake(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        let stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(web3.toWei(1), stakedAmount.toNumber(), "The amount of ownership staked does not match");

        let stakedContractAmount = await poolOwners.stakes.call(accounts[1], stakeReceiver.address);
        assert.equal(web3.toWei(1), stakedContractAmount.toNumber(), "The amount of recorded ownership staked to that address does not match");

        let stakedTotalAmount = await poolOwners.stakeTotals.call(accounts[1]);
        assert.equal(web3.toWei(1), stakedTotalAmount.toNumber(), "The total recorded ownership stake does not match");

        await poolOwners.removeOwnershipStake(stakeReceiver.address, web3.toWei(1), 0, { from: accounts[1] });
        stakedAmount = await stakeReceiver.stakes.call(accounts[1]);
        assert.equal(0, stakedAmount.toNumber(), "The amount of ownership staked does not match");

        stakedContractAmount = await poolOwners.stakes.call(accounts[1], stakeReceiver.address);
        assert.equal(web3.toWei(0), stakedContractAmount.toNumber(), "The amount of recorded ownership staked to that address does not match");

        stakedTotalAmount = await poolOwners.stakeTotals.call(accounts[1]);
        assert.equal(web3.toWei(0), stakedTotalAmount.toNumber(), "The total recorded ownership stake does not match");
    });

    /**
     * Negative tests
     */

    it("shouldn't be able to contribute after the hard cap has been reached", async() => {
        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[3],
                    to: PoolOwners.address,
                    value: web3.toWei(5),
                    gas: 200000
                });
            },
            "Your contribution would cause the total to exceed the hardcap"
        );
    });

    it("should be able to lock the shares inside the contract", async() => {
        // Lock the shares
        await poolOwners.finishContribution({ from: accounts[0] });

        // Ensure shares can't be modified
        await assertThrowsAsync(
            async() => {
                await poolOwners.setOwnerShare(accounts[1], web3.toWei(1000), { from: accounts[0] });
            },
            "Can't manually set shares, it's locked"
        );
    });

    it("shouldn't be able to send ownership on behalf with no allownace", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.sendOwnershipFrom(accounts[44], accounts[4], web3.toWei(16), { from: accounts[0] });
            },
            "Sender is not approved to send ownership of that amount"
        );
    });

    it("shouldn't be able to distribute tokens under the minimum", async() => {
        // Default is 20, so up it to 1000 to test setting it
        await poolOwners.setDistributionMinimum(linkToken.address, web3.toWei(1000), { from: accounts[0] });

        // Send LINK tokens to the owners address, minimum is 20
        await linkToken.transfer(PoolOwners.address, web3.toWei(500), { from: accounts[0] });

        await assertThrowsAsync(
            async() => {
                await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] })
            },
            "Amount in the contract isn't above the minimum distribution limit"
        );
    });

    it("shouldn't allow contributors to call set owner share", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.setOwnerShare(accounts[1], web3.toWei(5), { from: accounts[1] });
            },
            "Sender not authorised"
        );
    });

    it("ensure an owner cannot transfer staked ownership", async() => {
        let ownerBalance = await poolOwners.getOwnerTokens(accounts[5]);
        await poolOwners.stakeOwnership(stakeReceiver.address, web3.toWei(5), 0, { from: accounts[5] });
        let stakedAmount = await stakeReceiver.stakes.call(accounts[5]);
        assert.equal(web3.toWei(5), stakedAmount.toNumber(), "The amount of ownership staked does not match");
        
        await assertThrowsAsync(
            async() => {
                await poolOwners.sendOwnership(accounts[6], ownerBalance, { from: accounts[5] });
            },
            "The amount to send exceeds the addresses balance"
        );
        await poolOwners.sendOwnership(accounts[6], ownerBalance - web3.toWei(5), { from: accounts[5] });
    })
});