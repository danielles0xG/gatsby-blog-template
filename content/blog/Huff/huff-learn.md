---
title: EVM Assembly with Huff & Foundry
date: "2023-03-12T23:46:37.121Z"
---

I often use Foundry and Forge to test smart contracts and possible security vector attacks,
but this time I will test Solidity contracts written in Huff to have a better picture of the EVM operations.

Note: If you would like to refresh on EVM opcodes I would recommend the super famous site https://www.evm.codes.

Huff lang it's an EVM low-level compatible language that will allow us to efficiently manipulate the machine stack operations (opcodes) to return the desired contract bytecode.

### Huff
Huff offers the following constructs for writing contracts:
- interfaces | constants | custom errors | jump Labels | macros and functions
We will go over each one in a practical way once we test out our basic token contract.

Quick example "balanceOf(address)" macro:

A macro is one huff's way to put together the bytecode, and each time a macro is invoked, the code within is placed at the point of invocation. This is efficient in terms of runtime gas cost due to not having to jump to and from the macro's code.

#
`````
/// @notice Balance Of
/// @notice Returns the balance of the given address
#define macro BALANCE_OF() = takes (0) returns (0) {
    NON_PAYABLE()                                       // []
    0x04 calldataload                                   // [account]
    [BALANCE_LOCATION] LOAD_ELEMENT_FROM_KEYS(0x00)     // [balance]
    0x00 mstore                                         // []
    0x20 0x00 return                                    // []
}
`````
This is a huff macro of the "balanceOf()" function commonly seen at ERC20 & ERC721 contract standards.

### Solidity

WIP


[Github huff practice](https://github.com/danielles0xG/huff-dev.git)

