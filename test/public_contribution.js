/**
 * LinkPool Unit Test Suite for Public Contribution
 *  - Tests to ensure that any contribution to be a share holder works as expected
 */

// Contract Artifacts from Truffle
const PoolOwners = artifacts.require("PoolOwners");
const LinkToken = artifacts.require("LinkToken");

// Contract instances
let poolOwners;
let linkToken;
let tokenReturned;
let initialBalance;

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
     * Claims all tokens when distribution has started
     */
    async function claimAllTokens() {
        let totalOwners = await poolOwners.totalOwners.call();
        let distributionId = await poolOwners.totalDistributions.call();
        for (let i = 0; i < totalOwners; i++) {
            let address = await poolOwners.getOwnerAddress(i);
            if (address != "0x0000000000000000000000000000000000000000") {
                let claimed = await poolOwners.hasClaimed(address, distributionId);
                if (!claimed) {
                    await poolOwners.claimTokens(address, { from: accounts[1] });
                }
            }
        }
    }

    /**
     * Claims all tokens when distribution has started using the batch claim function
     */
    async function batchClaimAll() {
        let totalOwners = await poolOwners.totalOwners.call();
        await poolOwners.batchClaim(0, totalOwners, { from: accounts[1] });
    }

    /**
     * Gets the contract instances for public contribution
     */
    before(async() => {
        poolOwners = await PoolOwners.deployed();
        linkToken = await LinkToken.deployed();

        initialBalance = await web3.eth.getBalance(accounts[46]);

        // Whitelist the token to begin with
        await poolOwners.whitelistToken(linkToken.address);
    });

    /**
     * Ensure the creators wallets make up for 80% of the share holding
     */
    it("creators should make up of 75% of the share holding", async() => {
        // Get the shares of the creators
        let firstCreator = await poolOwners.owners.call(accounts[1]);
        let secondCreator = await poolOwners.owners.call(accounts[2]);

        // Assert they total up to 75%
        assert.equal(37.5, firstCreator[1].toNumber() / 1000, "First creators share should equal 37.5%");
        assert.equal(37.5, secondCreator[1].toNumber() / 1000, "Second creators share should equal 37.5%");
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
                    value: web3.toWei(5, 'ether'),
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
                    value: web3.toWei(5, 'ether'),
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
                    value: web3.toWei(1.3, 'ether'),
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
        await poolOwners.setContribution(accounts[3], web3.toWei(0.2, 'ether'), { from: accounts[0] });

        // Get the share of the contributor
        let contributorShare = await poolOwners.owners.call(accounts[3]);

        // Assert it equals 0.005%
        assert.equal(0.005, contributorShare[1].toNumber() / 1000, "Contribution of 0.2 ETH should result in a 0.005% share");
    });
    
    /**
     * Ensure the contribution of 16 ETH results in 0.4% share
     */
    it("a contribution of 16 ETH should result in a 0.4% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[4],
            to: PoolOwners.address,
            value: web3.toWei(16, 'ether'),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.owners.call(accounts[4]);

        // Assert it equals 0.4%
        assert.equal(0.4, contributorShare[1].toNumber() / 1000, "Contribution of 20 ETH should result in a 0.4% share");
    });

    /**
     * Ensure the contribution of 20 ETH results in 0.5% share
     */
    it("a contribution of 20 ETH should result in a 0.5% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[5],
            to: PoolOwners.address,
            value: web3.toWei(20, 'ether'),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.owners.call(accounts[5]);

        // Assert it equals 0.5%
        assert.equal(0.5, contributorShare[1].toNumber() / 1000, "Contribution of 25 ETH should result in a 0.5% share");
    });

    /**
     * Ensure the contribution of 13.6 ETH results in 0.34% share
     */
    it("a contribution of 13.6 ETH should result in a 0.34% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[6],
            to: PoolOwners.address,
            value: web3.toWei(13.6, 'ether'),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.owners.call(accounts[6]);

        // Assert it equals 1.7%
        assert.equal(0.34, contributorShare[1].toNumber() / 1000, "Contribution of 17 ETH should result in a 0.34% share");
    });

    /**
     * Ensure a contributor can contribute again to increase their share
     */
    it("a contributor should be able to contribute multiple times", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[3],
            to: PoolOwners.address,
            value: web3.toWei(0.2, 'ether'),
            gas: 200000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.owners.call(accounts[3]);

        // Assert it equals 0.01%
        assert.equal(0.01, contributorShare[1].toNumber() / 1000, "Contribution of another 0.2 ETH should result in a 0.01% share in total");
    });

    /**
     * Ensure the total contributed so far matches what has been contributed
     */
    it("should increment total contributed when contributions are made", async() => {
        // Get the total contributed
        let totalContributed = await poolOwners.totalContributed.call();

        // Does it match?
        assert.equal(50, web3.fromWei(totalContributed.toNumber(), 'ether'), "Total contributed should equal 50");
    });

    /**
     * Ensure 1000 ETH can be sent through contribution to max the hard cap
     */
    it("should be able to contribute up until 1000 ETH", async() => {
        // Send the contribution to get the total to 100 ETH
        await web3.eth.sendTransaction({
            from: accounts[7],
            to: PoolOwners.address,
            value: web3.toWei(50, 'ether'),
            gas: 200000
        });
        // Loop through until we have 1000 ETH staked
        for (i = 8; i < 44; i++) {
            await web3.eth.sendTransaction({
                from: accounts[i],
                to: PoolOwners.address,
                value: web3.toWei(25, 'ether'),
                gas: 200000
            });
        }
        // Get the total contributed
        let totalContributed = await poolOwners.totalContributed.call();
        // Assert it's 1000
        assert.equal(1000, web3.fromWei(totalContributed.toNumber(), 'ether'), "Total contributed should equal 1000");

        // Assert the ETH was transferred to the wallet
        let newBalance = await web3.eth.getBalance(accounts[299]);
        assert.equal(999.8, web3.fromWei(newBalance.toNumber() - initialBalance.toNumber(), 'ether'), "999.8 ETH should be in the crowdsale wallet");
    });

    /**
     *  Should be able to distribute 100 tokens to all contributors
     */
    it("shouldn't be able to distribute a non-whitelisted token", async() => {
        // Create a malicious token
        let dodgyLink = await LinkToken.new();
        await dodgyLink.transfer(PoolOwners.address, web3.toWei(100, 'ether'), { from: accounts[0] });

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
        await linkToken.transfer(PoolOwners.address, web3.toWei(100, 'ether'), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Assert the total returned to all the contributors
        let tokenBalance = await poolOwners.totalReturned.call(LinkToken.address);
        assert.equal(web3.fromWei(tokenBalance.toNumber(), 'ether'), 100, "Token balance for the owners should be 100 tokens");

        // Claim all the tokens on behalf of the owners
        await batchClaimAll();

        // Assert the distribution of tokens is correct
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 37.5, "Total returned for the first creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[2] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 37.5, "Total returned for the second creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.01, "Total returned for the first contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[4] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.4, "Total returned for the second contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[5] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.5, "Total returned for the third contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[6] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.34, "Total returned for the fourth contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[7] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 1.25, "Total returned for the fifth contributor is incorrect");

        // Loop through the remaining who contributed 25 ETHs
        for (i = 8; i < 44; i++) {
            ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.625, "Total returned for the contributor is incorrect");
        }
    });

    /**
     *  Should be able to distribute 5000 tokens to all contributors
     */
    it("should proportionately distribute 5000 tokens to all 43 contributors", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(5000, 'ether'), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Assert the total returned to all the contributors
        let totalReturned = await poolOwners.totalReturned.call(LinkToken.address);
        assert.equal(web3.fromWei(totalReturned.toNumber(), 'ether'), 5100, "Token balance for the owners should be 5100 tokens");

        // Claim all the tokens on behalf of the owners
        await claimAllTokens();

        // Assert the distribution of tokens is correct
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 1912.5, "Total returned for the first creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[2] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 1912.5, "Total returned for the second creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0.51, "Total returned for the first contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[4] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 20.4, "Total returned for the second contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[5] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 25.5, "Total returned for the third contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[6] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 17.34, "Total returned for the fourth contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[7] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 63.75, "Total returned for the fifth contributor is incorrect");

        // Loop through the remaining who contributed 25 ETHs
        for (i = 8; i < 44; i++) {
            ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 31.875, "Total returned for the contributor is incorrect");
        }
    });

    /**
     * Test that token withdrawal functions correctly for contributors
     */
    it("should allow everyone to withdraw half of all their tokens", async() => {
        for (i = 1; i < 44; i++) {
            // Get the full balance to withdraw
            let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            let halfBalance = ownerBalance.toNumber() / 2;

            // Withdraw the token amount
            await poolOwners.withdrawTokens(LinkToken.address, halfBalance, { from: accounts[i] });

            // Get the total returned before withdrawal
            totalReturned = await poolOwners.tokenBalance.call(LinkToken.address);

            // Make sure the balance is now 0
            ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            assert.equal(
                web3.fromWei(ownerBalance.toNumber(), 'ether'), 
                web3.fromWei(halfBalance, 'ether'), "The owners balance should be halved after withdrawal"
            );

            // Assert the total returned has decreased
            newTotalReturned = await poolOwners.tokenBalance.call(LinkToken.address);
            assert.equal(
                web3.fromWei(totalReturned.toNumber() - web3.fromWei(halfBalance, 'ether'), 'ether'), 
                web3.fromWei(newTotalReturned.toNumber(), 'ether'), 
                "The total returned should have decreased after withdrawal"
            );
        }
    });

    /**
     * Ensure precision has to be adhered to, as the total percentage of ownership can decrease
     */
    it("shouldn't be able to transfer ownership not adhering to the minimum precision", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.sendOwnership(accounts[3], web3.toWei(0.06, 'ether'), { from: accounts[1] });
            },
            "revert"
        );
    });

    /**
     *  Should be able to transfer part of the ownership of LinkPool to another address
     */
    it("should be able to transfer 12.5% ownership to another address", async() => {
        // Transfer 12.5% of the share 
        await poolOwners.sendOwnership(accounts[3], web3.toWei(500, 'ether'), { from: accounts[1] });

        // Assert the owners share is now 25%
        let share = await poolOwners.owners.call(accounts[1]);
        assert.equal(25, share[1].toNumber() / 1000, "Owners share should be 25%");

        // Assert the receivers share has increased to 12.7%
        share = await poolOwners.owners.call(accounts[3]);
        assert.equal(12.51, share[1].toNumber() / 1000, "Receivers share should be 12.51%");

        // Assert the total owners has stayed at 43
        let totalOwners = await poolOwners.totalOwners.call();
        assert.equal(totalOwners, 43, "There should be a total of 43 owners");

        // Assert the current owner size is still 43
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 43, "There should be a total of 43 current owners");
    });

    /**
     *  Should be able to transfer all of a wallets ownership of LinkPool to another address
     */
    it("should be able to transfer 0.4% ownership to a new address", async() => {
        // Increase the allowance of the sender
        await poolOwners.increaseAllowance(accounts[0], web3.toWei(16, 'ether'), { from: accounts[4] });

        // Assert the allowance has increased
        let allowance = await poolOwners.getAllowance(accounts[4], accounts[0]);
        assert.equal(16, web3.fromWei(allowance.toNumber(), 'ether'), "Allowance should be 16 ether after increase");

        // Transfer 12.5% of the share on behalf of the owner
        await poolOwners.sendOwnershipFrom(accounts[4], accounts[44], web3.toWei(16, 'ether'), { from: accounts[0] });

        // Assert the allowance has decreased
        allowance = await poolOwners.getAllowance(accounts[4], accounts[0]);
        assert.equal(0, allowance.toNumber(), "Allowance should be 0 after transfer");

        // Assert the owners share is now 0.4%
        let share = await poolOwners.owners.call(accounts[44]);
        assert.equal(0.4, share[1].toNumber() / 1000, "Owners share should be 0.4%");

        // Assert the senders share has gone to 0%
        share = await poolOwners.owners.call(accounts[4]);
        assert.equal(0, share[1].toNumber(), "Senders share should be 0%");

        // Assert the total owners has increased to 44
        let totalOwners = await poolOwners.totalOwners.call();
        assert.equal(totalOwners, 44, "There should be a total of 44 owners");

        // Assert the current owner size is 43
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 43, "There should be a total of 43 current owners");

        // Assert the new owner is registered as one
        isOwner = await poolOwners.allOwners.call(accounts[44]);
        assert.equal(isOwner, true, "New address should be an owner");
    });

    /**
     *  Should be able to distribute 5000.1234567 tokens to all contributors
     */
    it("should proportionately distribute 5000.1234567 tokens to all 43 contributors", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(5000.1234567, 'ether'), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Assert the total returned to all the contributors
        let tokenBalance = await poolOwners.totalReturned.call(LinkToken.address);
        assert.equal(web3.fromWei(tokenBalance.toNumber(), 'ether'), 10100.1234567, "Token balance for the owners should be 7550.1234567 tokens");

        // Claim all the tokens on behalf of the owners
        await batchClaimAll();

        // Assert the distribution of tokens is correct (manually calculated expected from %)
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 2206.280864175, "Total returned for the first creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[2] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 2831.2962962625, "Total returned for the second creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 625.77044443317, "Total returned for the first contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[4] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 10.2, "Total returned for the second contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[5] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 37.7506172835, "Total returned for the third contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[6] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 25.67041975278, "Total returned for the fourth contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[7] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 94.37654320875, "Total returned for the fifth contributor is incorrect");

        // Assert the new owner has 0.4% of the transfered token amount
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[44] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 20.0004938268, "Total returned for the new owner is incorrect");

        // Loop through the remaining who contributed 25 ETHs
        for (i = 8; i < 44; i++) {
            ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 47.188271604375, "Total returned for the contributor is incorrect");
        }

        // Assert that distribution has completed
        let distributionActive = await poolOwners.distributionActive.call();
        assert.equal(distributionActive, false, "Distribution should be completed after claiming all tokens");
    });

    it("should allow tokens to be claimed when withdrawing and distribution is active", async() => {
        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(100, 'ether'), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Should be able to withdraw full token amount with the extra unclaimed
        await poolOwners.withdrawTokens(LinkToken.address, web3.toWei(2868.7962962625, 'ether'), { from: accounts[2] });

        // Claim all the rest
        await claimAllTokens();
    });

    it("should allow distribution when an owner transfers all his ownership away and then gets some back", async() => {
        // Assert the old owner is still registered as one
        isOwner = await poolOwners.allOwners.call(accounts[4]);
        assert.equal(isOwner, true, "Old address should still be an owner");

        // Send 0.2% of the ownership back the original owner
        await poolOwners.sendOwnership(accounts[4], web3.toWei(8, 'ether'), { from: accounts[44] });

        // Send LINK tokens to the owners address
        await linkToken.transfer(PoolOwners.address, web3.toWei(100, 'ether'), { from: accounts[0] });

        // Distribute the tokens to the contributors
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });

        // Assert the total owners has stayed to 44
        owners = await poolOwners.totalOwners.call();
        assert.equal(owners, 44, "There should be a total of 44 owners");

        // Assert the current owner size is 44
        let currentOwners = await poolOwners.getCurrentOwners();
        assert.equal(currentOwners, 44, "There should be a total of 44 current owners");

        // Assert the old owner is still registered as one
        isOwner = await poolOwners.allOwners.call(accounts[4]);
        assert.equal(isOwner, true, "Old address should still be an owner");

        // Claim all the rest
        await batchClaimAll();
        
        // Assert that distribution has complete
        let distributionActive = await poolOwners.distributionActive.call();
        assert.equal(distributionActive, false, "Distribution should be completed after claiming all tokens");
    });

    /**
     * Test that token withdrawal functions correctly for contributors
     */
    it("should allow everyone to withdraw all their tokens", async() => {
        for (i = 1; i < 45; i++) {
            // Get the full balance to withdraw
            let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });

            // Withdraw the token amount
            if (ownerBalance.toNumber() != 0) {
                await poolOwners.withdrawTokens(LinkToken.address, ownerBalance, { from: accounts[i] });

                // Get the total returned before withdrawal
                totalReturned = await poolOwners.tokenBalance.call(LinkToken.address);
    
                // Make sure the balance is now 0
                ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
                assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0, "The owners balance should be 0 after withdrawal");
    
                // Assert the total returned has decreased
                newTotalReturned = await poolOwners.tokenBalance.call(LinkToken.address);
                assert.equal(
                    web3.fromWei(totalReturned.toNumber() - ownerBalance.toNumber(), 'ether'), 
                    web3.fromWei(newTotalReturned.toNumber(), 'ether'), 
                    "The total returned should have decreased after withdrawal"
                );
            }
        }

        // Assert the total returned is now 0
        let tokenBalance = await poolOwners.tokenBalance.call(LinkToken.address);
        assert.equal(web3.fromWei(tokenBalance.toNumber(), 'ether'), 0, "Token balance for the owners should be 0 tokens after full withdrawal");
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
                    value: web3.toWei(5, 'ether'),
                    gas: 200000
                });
            },
            "revert"
        );
    });

    it("should be able to lock the shares inside the contract", async() => {
        // Lock the shares
        await poolOwners.lockShares({ from: accounts[0] });

        // Ensure shares can't be modified
        await assertThrowsAsync(
            async() => {
                await poolOwners.setOwnerShare(accounts[1], web3.toWei(1000, 'ether'), { from: accounts[0] });
            },
            "revert"
        );
    });

    it("shouldn't be able to send ownership on behalf with no allownace", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.sendOwnershipFrom(accounts[44], accounts[4], web3.toWei(16, 'ether'), { from: accounts[0] });
            },
            "revert"
        );
    });

    it("shouldn't be able to distribute tokens under the minimum", async() => {
        // Default is 20, so up it to 1000 to test setting it
        await poolOwners.setDistributionMinimum(web3.toWei(1000), { from: accounts[0] });

        // Send LINK tokens to the owners address, minimum is 20
        await linkToken.transfer(PoolOwners.address, web3.toWei(500, 'ether'), { from: accounts[0] });

        await assertThrowsAsync(
            async() => {
                await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] })
            },
            "revert"
        );
    });

    it("shouldn't allow a contributor to withdraw more tokens than their balance", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.withdrawTokens(LinkToken.address, web3.toWei(50, 'ether'), { from: accounts[4] });
            },
            "revert"
        );
    });

    it("shouldn't allow contributors to call set owner share", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.setOwnerShare(accounts[1], web3.toWei(5, 'ether'), { from: accounts[1] });
            },
            "revert"
        );
    });

    it("shouldn't allow an non-owner to withdraw", async() => {
        await assertThrowsAsync(
            async() => {
                await poolOwners.withdrawTokens(LinkToken.address, web3.toWei(20.5, 'ether'), { from: accounts[49] });
            },
            "revert"
        );
    });

    it("shouldn't be able to claim tokens twice", async() => {
        await poolOwners.setDistributionMinimum(web3.toWei(20), { from: accounts[0] });
        await linkToken.transfer(PoolOwners.address, web3.toWei(100, 'ether'), { from: accounts[0] });
        await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });
        await poolOwners.claimTokens(accounts[1], { from: accounts[1] });
        await assertThrowsAsync(
            async() => {
                await poolOwners.claimTokens(accounts[1]);
            },
            "revert"
        );
        await batchClaimAll();
    });
});