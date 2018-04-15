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
     * Gets the contract instances for public contribution
     */
    before(async() => {
        poolOwners = await PoolOwners.deployed();
        linkToken = await LinkToken.deployed();

        initialBalance = await web3.eth.getBalance(accounts[45]);
    });

    /**
     * Ensure the creators wallets make up for 80% of the share holding
     */
    it("creators should make up of 75% of the share holding", async() => {
        // Get the shares of the creators
        let firstCreator = await poolOwners.getOwnerShare({ from: accounts[1] });
        let secondCreator = await poolOwners.getOwnerShare({ from: accounts[2] });

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
        }
    });

    /**
     * Ensure contribution amount is divisble by the minimum contribution amount
     */
    it("shouldn't be able to contribute an amount which isn't divisible by 0.2 ETH", async() => {
        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[3],
                    to: PoolOwners.address,
                    value: web3.toWei(1.3, 'ether'),
                    gas: 140000
                });
            },
            "revert"
        );
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
                    gas: 140000
                });
            },
            "revert"
        );
    });

    /**
     * Ensure the minimum contribution of 0.2 ETH results in 0.005% share
     */
    it("a minimum contribution of 0.2 ETH should result in a 0.005% share", async() => {
        // Send the contribution
        await web3.eth.sendTransaction({
            from: accounts[3],
            to: PoolOwners.address,
            value: web3.toWei(0.2, 'ether'),
            gas: 140000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerShare({ from: accounts[3] });

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
            value: web3.toWei(16, 'ether'),
            gas: 140000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerShare({ from: accounts[4] });

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
            value: web3.toWei(20, 'ether'),
            gas: 140000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerShare({ from: accounts[5] });

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
            value: web3.toWei(13.6, 'ether'),
            gas: 140000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerShare({ from: accounts[6] });

        // Assert it equals 1.7%
        assert.equal(0.34, contributorShare.toNumber() / 1000, "Contribution of 17 ETH should result in a 0.34% share");
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
            gas: 140000
        });

        // Get the share of the contributor
        let contributorShare = await poolOwners.getOwnerShare({ from: accounts[3] });

        // Assert it equals 0.01%
        assert.equal(0.01, contributorShare.toNumber() / 1000, "Contribution of another 0.2 ETH should result in a 0.01% share in total");
    });

    /**
     * Ensure the total contributed so far matches what has been contributed
     */
    it("should increment total contributed when contributions are made", async() => {
        // Get the total contributed
        let totalContributed = await poolOwners.getTotalContributed();

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
            gas: 140000
        });
        // Loop through until we have 1000 ETH staked
        for (i = 8; i < 44; i++) {
            await web3.eth.sendTransaction({
                from: accounts[i],
                to: PoolOwners.address,
                value: web3.toWei(25, 'ether'),
                gas: 140000
            });
        }
        // Get the total contributed
        let totalContributed = await poolOwners.getTotalContributed();
        // Assert it's 1000
        assert.equal(1000, web3.fromWei(totalContributed.toNumber(), 'ether'), "Total contributed should equal 1000");

        // Assert the ETH was transferred to the wallet
        let newBalance = await web3.eth.getBalance(accounts[45]);
        assert.equal(1000, web3.fromWei(newBalance.toNumber() - initialBalance.toNumber(), 'ether'), "1000 ETH should be in the crowdsale wallet")
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
        let totalReturned = await poolOwners.getTotalReturned(LinkToken.address);
        assert.equal(web3.fromWei(totalReturned.toNumber(), 'ether'), 100, "Total returned for the owners should be 100 tokens");

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
        let totalReturned = await poolOwners.getTotalReturned(LinkToken.address);
        assert.equal(web3.fromWei(totalReturned.toNumber(), 'ether'), 5100, "Total returned for the owners should be 5100 tokens");

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
     *  Should be able to transfer part of the ownership of LinkPool to another address
     */
    it("should be able to transfer 12.5% ownership to another address", async() => {
        // Transfer 12.5% of the share 
        await poolOwners.transferOwnership(accounts[3], web3.toWei(500, 'ether'), { from: accounts[1] });

        // Assert the owners share is now 25%
        let share = await poolOwners.getOwnerShare({ from: accounts[1] });
        assert.equal(25, share.toNumber() / 1000, "Owners share should be 25%");

        // Assert the receivers share has increased to 12.7%
        share = await poolOwners.getOwnerShare({ from: accounts[3] });
        assert.equal(12.51, share.toNumber() / 1000, "Receivers share should be 12.51%");
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
        let totalReturned = await poolOwners.getTotalReturned(LinkToken.address);
        assert.equal(web3.fromWei(totalReturned.toNumber(), 'ether'), 10100.1234567, "Total returned for the owners should be 10100.1234567 tokens");

        // Assert the distribution of tokens is correct (manually calculated expected from %)50/
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 3162.530864175, "Total returned for the first creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[2] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 3787.5462962625, "Total returned for the second creator is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 626.02544443317, "Total returned for the first contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[4] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 40.4004938268, "Total returned for the second contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[5] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 50.5006172835, "Total returned for the third contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[6] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 34.34041975278, "Total returned for the fourth contributor is incorrect");
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[7] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 126.25154320875, "Total returned for the fifth contributor is incorrect");

        // Loop through the remaining who contributed 25 ETHs
        for (i = 8; i < 44; i++) {
            ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[i] });
            assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 63.125771604375, "Total returned for the contributor is incorrect");
        }
    });

    /**
     * Test that token withdrawal functions correctly for creators
     */
    it("should allow the creators to withdraw their tokens", async() => {
        // Get the full balance to withdraw
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });

        // Withdraw the token amount
        await poolOwners.withdrawTokens(LinkToken.address, ownerBalance, { from: accounts[1] });

        // Calculate the total returned after withdrawal
        totalReturned = await poolOwners.getTotalReturned(LinkToken.address);

        // Make sure the balance is now 0
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[1] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0, "The owners balance should be 0 after withdrawal");

        // Assert the total returned has decreased
        newTotalReturned = await poolOwners.getTotalReturned(LinkToken.address);
        assert.equal(
            web3.fromWei(totalReturned.toNumber() - ownerBalance.toNumber(), 'ether'), 
            web3.fromWei(newTotalReturned.toNumber(), 'ether'), 
            "The total returned should have decreased after withdrawal"
        );
    });

    /**
     * Test that token withdrawal functions correctly for contributors
     */
    it("should allow the contributors to withdraw their tokens", async() => {
        // Get the full balance to withdraw
        let ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });

        // Withdraw the token amount
        await poolOwners.withdrawTokens(LinkToken.address, ownerBalance, { from: accounts[3] });

        // Get the total returned before withdrawal
        totalReturned = await poolOwners.getTotalReturned(LinkToken.address);

        // Make sure the balance is now 0
        ownerBalance = await poolOwners.getOwnerBalance(LinkToken.address, { from: accounts[3] });
        assert.equal(web3.fromWei(ownerBalance.toNumber(), 'ether'), 0, "The owners balance should be 0 after withdrawal");

        // Assert the total returned has decreased
        newTotalReturned = await poolOwners.getTotalReturned(LinkToken.address);
        assert.equal(
            web3.fromWei(totalReturned.toNumber() - ownerBalance.toNumber(), 'ether'), 
            web3.fromWei(newTotalReturned.toNumber(), 'ether'), 
            "The total returned should have decreased after withdrawal"
        );
    });

    /**
     * Ensure that the shares can be locked once contributions have been made
     */
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

    /**
     * Negative tests
     */

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

    it("shouldn't be able to contribute after the hard cap has been reached", async() => {
        await assertThrowsAsync(
            async() => {
                await web3.eth.sendTransaction({
                    from: accounts[3],
                    to: PoolOwners.address,
                    value: web3.toWei(5, 'ether'),
                    gas: 140000
                });
            },
            "revert"
        );
    });
});