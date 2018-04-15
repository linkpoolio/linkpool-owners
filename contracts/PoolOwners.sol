pragma solidity ^0.4.2;

import "./Ownable.sol";
import "./ERC677.sol";
import "./SafeMath.sol";

contract PoolOwners is Ownable {

    mapping(int256 => address)  private ownersAddresses;
    mapping(address => uint256) private ownerPercentages;
    mapping(address => uint256) private ownerShareTokens;
    mapping(address => uint256) private tokenBalance;
    mapping(address => bool)    private whitelist;

    mapping(address => mapping(address => uint256)) private balances;

    int256 private totalOwners = 0;
    bool   private active = false;

    // Public Contribution Variables
    uint256 private ethWei = 1000000000000000000; // 1 ether in wei
    uint256 private valuation = ethWei * 4000; // 1 ether * 4000
    uint256 private hardCap = ethWei * 1000; // 1 ether * 1000
    uint256 private totalContributed = 0;
    address private wallet;
    bool    private locked = false;

    // The contract hard-limit is 0.04 ETH due to the percentage precision, lowest % possible is 0.001%
    // It's been set at 0.2 ETH to try and minimise the sheer number of contributors as that would up the distribution GAS cost
    uint256 private minimumContribution = 200000000000000000; // 0.2 ETH

    /**
        Events
     */

    event Contribution(address indexed sender, uint256 share, uint256 amount);
    event TokenDistribution(address indexed token, uint256 amount);
    event TokenWithdrawal(address indexed token, address indexed owner, uint256 amount);

    /**
        Modifiers
     */

    modifier onlyPoolOwner() {
        require(ownerShareTokens[msg.sender] != 0);
        _;
    }

    /**
        Constructor
     */

    function PoolOwners(address _wallet) public {
        wallet = _wallet;
    }

    /**
        Contribution Methods
     */

    function() public payable { contribute(msg.sender); }

    function contribute(address sender) internal {
        // Make sure the shares aren't locked
        require(!locked);

        // Make sure they're in the whitelist
        require(whitelist[sender]);

        // Make sure the contribution isn't above the hard cap
        require(hardCap >= msg.value);

        // Make sure the contribution doesn't exceed the hardCap
        require(hardCap >= SafeMath.add(totalContributed, msg.value));

        // Ensure the amount contributed is cleanly divisible by the minimum contribution
        require((msg.value % minimumContribution) == 0);

        // Assert that the contribution is above or equal to the minimum contribution
        require(msg.value >= minimumContribution);

        // Increase the total contributed
        totalContributed = SafeMath.add(totalContributed, msg.value);

        // Calculated share
        uint256 share = percent(msg.value, valuation, 5);

        // Calculate and set the contributors % holding
        if (ownerPercentages[sender] != 0) { // Existing contributor
            ownerShareTokens[sender] = SafeMath.add(ownerShareTokens[sender], msg.value);
            ownerPercentages[sender] = SafeMath.add(share, ownerPercentages[sender]);
        } else { // New contributor
            ownersAddresses[totalOwners] = sender;
            totalOwners = totalOwners + 1;
            ownerPercentages[sender] = share;
            ownerShareTokens[sender] = msg.value;
        }

        // Transfer the ether to the wallet
        wallet.transfer(msg.value);

        // Fire event
        Contribution(sender, share, msg.value);
    }

    // Add a wallet to the whitelist
    function whitelistWallet(address contributor) external onlyOwner() {
        // Is it actually an address?
        require(contributor != address(0));

        // Add address to whitelist
        whitelist[contributor] = true;
    }

    /**
        Public Methods
     */

    // Set the owners share per owner, the balancing of shares is done externally
    function setOwnerShare(address owner, uint256 value) public onlyOwner() {
        // Make sure the shares aren't locked
        require(!locked);

        if (ownerShareTokens[owner] == 0) {
            ownersAddresses[totalOwners] = owner;
            totalOwners = totalOwners + 1;
        }
        ownerShareTokens[owner] = value;
        ownerPercentages[owner] = percent(value, valuation, 5);
    }

    // Non-Standard token transfer, doesn't confine to any ERC
    function transferOwnership(address receiver, uint256 amount) public onlyPoolOwner() {
        // Require the amount to be equal or less to their shares
        require(ownerShareTokens[msg.sender] >= amount);

        // Deduct the amount from the owner
        ownerShareTokens[msg.sender] = SafeMath.sub(ownerShareTokens[msg.sender], amount);

        // Remove the owner if the share is now 0
        if (ownerShareTokens[msg.sender] == 0) {
            delete ownerShareTokens[msg.sender];
            delete ownerPercentages[msg.sender];
        } else { // Recalculate percentage
            ownerPercentages[msg.sender] = percent(ownerShareTokens[msg.sender], valuation, 5);
        }
        
        // Add the new share holder
        ownerShareTokens[receiver] = SafeMath.add(ownerShareTokens[receiver], amount);
        ownerPercentages[receiver] = SafeMath.add(ownerPercentages[receiver], percent(amount, valuation, 5));
    }

    // Lock the shares so contract owners cannot change them
    function lockShares() public onlyOwner() {
        require(!locked);
        locked = true;
    }

    // Get total ETH contribution
    function getTotalContributed() public view returns (uint256) {
        return totalContributed;
    }

    // Get the share of an owner, only if you're one of the share holders
    function getOwnerShare() public view onlyPoolOwner() returns (uint256) {
        return ownerPercentages[msg.sender];
    }

    // Get an owner share balance (contribution amount)
    function getOwnerShareBalance() public view onlyPoolOwner() returns (uint256) {
        return ownerShareTokens[msg.sender];
    }

    // Get the owners token balance
    function getOwnerBalance(address token) public view returns (uint256) {
        return balances[msg.sender][token];
    }

    // Get the total returned in the contract
    function getTotalReturned(address token) public view returns (uint256) {
        return tokenBalance[token];
    }

    // Distribute the tokens in the contract to the contributors/creators
    function distributeTokens(address token) public onlyPoolOwner() {
        // Is this method already being called?
        require(!active);
        active = true;

        // Get the token address
        ERC677 erc677 = ERC677(token);

        // Has the contract got a balance?
        uint256 currentBalance = erc677.balanceOf(this) - tokenBalance[token];
        require(currentBalance > ethWei * 20);

        // Loop through stakers and add the earned shares
        // This is GAS expensive, but unless complex more bug prone logic was added there is no alternative
        // This is due to the percentages needed to be calculated for all at once, or the amounts would differ
        for (int256 i = 0; i < totalOwners; i++) {
            address owner = ownersAddresses[i];

            // If the owner still has a share
            if (ownerShareTokens[owner] > 0) {
                // Calculate and transfer the ownership of shares with a precision of 5, for example: 12.345%
                balances[owner][token] = SafeMath.add(SafeMath.div(SafeMath.mul(currentBalance, ownerPercentages[owner]), 100000), balances[owner][token]);
            }
        }
        // Add the current balance on to the total returned
        tokenBalance[token] = SafeMath.add(tokenBalance[token], currentBalance);
        active = false;

        // Emit the event
        TokenDistribution(token, currentBalance);
    }

    // Withdraw tokens from the owners balance
    function withdrawTokens(address token, uint256 amount) public onlyPoolOwner() {
        // Can't withdraw nothing
        require(amount > 0);

        // Assert they're withdrawing what is in their balance
        require(balances[msg.sender][token] >= amount);

        // Subsitute the amounts
        balances[msg.sender][token] = SafeMath.sub(balances[msg.sender][token], amount);
        tokenBalance[token] = SafeMath.sub(tokenBalance[token], amount);

        // Transfer the tokens
        ERC677 erc677 = ERC677(token);
        require(erc677.transfer(msg.sender, amount) == true);

        // Emit the event
        TokenWithdrawal(token, msg.sender, amount);
    }

    /**
        Private Methods
    */

    // Credit to Rob Hitchens: https://stackoverflow.com/a/42739843
    function percent(uint numerator, uint denominator, uint precision) private pure returns (uint quotient) {
        uint _numerator = numerator * 10 ** (precision+1);
        uint _quotient = ((_numerator / denominator) + 5) / 10;
        return ( _quotient);
    }
}