pragma solidity ^0.4.3;

import "./Ownable.sol";
import "./ERC677.sol";
import "./SafeMath.sol";

contract PoolOwners is Ownable {

    mapping(int256 => address)  private ownerAddresses;
    mapping(address => bool)    private whitelist;

    mapping(address => uint256) public ownerPercentages;
    mapping(address => uint256) public ownerShareTokens;
    mapping(address => uint256) public tokenBalance;

    mapping(address => mapping(address => uint256)) private balances;

    int256 public totalOwners = 0;

    bool   private contributionStarted = false;
    bool   private distributionActive = false;

    // Public Contribution Variables
    uint256 private ethWei = 1000000000000000000; // 1 ether in wei
    uint256 private valuation = ethWei * 4000; // 1 ether * 4000
    uint256 private hardCap = ethWei * 1000; // 1 ether * 1000
    address private wallet;
    bool    private locked = false;

    uint256 public totalContributed = 0;

    // The contract hard-limit is 0.04 ETH due to the percentage precision, lowest % possible is 0.001%
    // It's been set at 0.2 ETH to try and minimise the sheer number of contributors as that would up the distribution GAS cost
    uint256 private minimumContribution = 200000000000000000; // 0.2 ETH

    /**
        Events
     */

    event Contribution(address indexed sender, uint256 share, uint256 amount);
    event TokenDistribution(address indexed token, uint256 amount);
    event TokenWithdrawal(address indexed token, address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner, uint256 amount);

    /**
        Modifiers
     */

    modifier onlyWhitelisted() {
        require(whitelist[msg.sender]);
        _;
    }

    /**
        Constructor
     */

    constructor(address _wallet) public {
        wallet = _wallet;
    }

    /**
        Contribution Methods
     */

    // Fallback, redirects to contribute
    function() public payable { contribute(msg.sender); }

    function contribute(address sender) internal {
        // Make sure the shares aren't locked
        require(!locked);

        // Ensure the contribution phase has started
        require(contributionStarted);

        // Make sure they're in the whitelist
        require(whitelist[sender]);

        // Assert that the contribution is above or equal to the minimum contribution
        require(msg.value >= minimumContribution);

        // Make sure the contribution isn't above the hard cap
        require(hardCap >= msg.value);

        // Ensure the amount contributed is cleanly divisible by the minimum contribution
        require((msg.value % minimumContribution) == 0);

        // Make sure the contribution doesn't exceed the hardCap
        require(hardCap >= SafeMath.add(totalContributed, msg.value));

        // Increase the total contributed
        totalContributed = SafeMath.add(totalContributed, msg.value);

        // Calculated share
        uint256 share = percent(msg.value, valuation, 5);

        // Calculate and set the contributors % holding
        if (ownerPercentages[sender] != 0) { // Existing contributor
            ownerShareTokens[sender] = SafeMath.add(ownerShareTokens[sender], msg.value);
            ownerPercentages[sender] = SafeMath.add(share, ownerPercentages[sender]);
        } else { // New contributor
            ownerAddresses[totalOwners] = sender;
            totalOwners += 1;
            ownerPercentages[sender] = share;
            ownerShareTokens[sender] = msg.value;
        }

        // Transfer the ether to the wallet
        wallet.transfer(msg.value);

        // Fire event
        emit Contribution(sender, share, msg.value);
    }

    // Add a wallet to the whitelist
    function whitelistWallet(address contributor) external onlyOwner() {
        // Is it actually an address?
        require(contributor != address(0));

        // Add address to whitelist
        whitelist[contributor] = true;
    }

    // Start the contribution
    function startContribution() external onlyOwner() {
        require(!contributionStarted);
        contributionStarted = true;
    }

    /**
        Public Methods
     */

    // Set the owners share per owner, the balancing of shares is done externally
    function setOwnerShare(address owner, uint256 value) public onlyOwner() {
        // Make sure the shares aren't locked
        require(!locked);

        if (ownerShareTokens[owner] == 0) {
            whitelist[owner] = true;
            ownerAddresses[totalOwners] = owner;
            totalOwners += 1;
        }
        ownerShareTokens[owner] = value;
        ownerPercentages[owner] = percent(value, valuation, 5);
    }

    // Non-Standard token transfer, doesn't confine to any ERC
    function sendOwnership(address receiver, uint256 amount) public onlyWhitelisted() {
        // Require they have an actual balance
        require(ownerShareTokens[msg.sender] > 0);

        // Require the amount to be equal or less to their shares
        require(ownerShareTokens[msg.sender] >= amount);

        // Deduct the amount from the owner
        ownerShareTokens[msg.sender] = SafeMath.sub(ownerShareTokens[msg.sender], amount);

        // Remove the owner if the share is now 0
        if (ownerShareTokens[msg.sender] == 0) {
            ownerPercentages[msg.sender] = 0;
            whitelist[receiver] = false; 
            
        } else { // Recalculate percentage
            ownerPercentages[msg.sender] = percent(ownerShareTokens[msg.sender], valuation, 5);
        }

        // Add the new share holder
        if (ownerShareTokens[receiver] == 0) {
            whitelist[receiver] = true;
            ownerAddresses[totalOwners] = receiver;
            totalOwners += 1;
        }
        ownerShareTokens[receiver] = SafeMath.add(ownerShareTokens[receiver], amount);
        ownerPercentages[receiver] = SafeMath.add(ownerPercentages[receiver], percent(amount, valuation, 5));

        emit OwnershipTransferred(msg.sender, receiver, amount);
    }

    // Lock the shares so contract owners cannot change them
    function lockShares() public onlyOwner() {
        require(!locked);
        locked = true;
    }

    // Distribute the tokens in the contract to the contributors/creators
    function distributeTokens(address token) public onlyWhitelisted() {
        // Is this method already being called?
        require(!distributionActive);
        distributionActive = true;

        // Get the token address
        ERC677 erc677 = ERC677(token);

        // Has the contract got a balance?
        uint256 currentBalance = erc677.balanceOf(this) - tokenBalance[token];
        require(currentBalance > ethWei * 20);

        // Add the current balance on to the total returned
        tokenBalance[token] = SafeMath.add(tokenBalance[token], currentBalance);

        // Loop through stakers and add the earned shares
        // This is GAS expensive, but unless complex more bug prone logic was added there is no alternative
        // This is due to the percentages needed to be calculated for all at once, or the amounts would differ
        for (int256 i = 0; i < totalOwners; i++) {
            address owner = ownerAddresses[i];

            // If the owner still has a share
            if (ownerShareTokens[owner] > 0) {
                // Calculate and transfer the ownership of shares with a precision of 5, for example: 12.345%
                balances[owner][token] = SafeMath.add(SafeMath.div(SafeMath.mul(currentBalance, ownerPercentages[owner]), 100000), balances[owner][token]);
            }
        }
        distributionActive = false;

        // Emit the event
        emit TokenDistribution(token, currentBalance);
    }

    // Withdraw tokens from the owners balance
    function withdrawTokens(address token, uint256 amount) public {
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
        emit TokenWithdrawal(token, msg.sender, amount);
    }

    // Is an account whitelisted?
    function isWhitelisted(address contributor) public view returns (bool) {
        return whitelist[contributor];
    }

    // Get the owners token balance
    function getOwnerBalance(address token) public view returns (uint256) {
        return balances[msg.sender][token];
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