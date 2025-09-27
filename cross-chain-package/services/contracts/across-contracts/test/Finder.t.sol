// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../lib/protocol/packages/core/contracts/oracle/implementation/Finder.sol";
contract MockBondContract {
    uint256 public lastBond;

    function setBond(address who, uint256 amount) external {
        lastBond = amount;
    }
}

contract FinderTest is Test {
    Finder finder;
    MockBondContract bond;

    bytes32 constant BOND_INTERFACE = keccak256("Bond");

    function setUp() public {
        finder = new Finder();
        bond = new MockBondContract();

        // Set test contract as the owner
        finder.transferOwnership(address(this));

        // Register implementation address
        finder.changeImplementationAddress(BOND_INTERFACE, address(bond));
    }

    function testSetBondThroughFinder() public {
        address impl = finder.getImplementationAddress(BOND_INTERFACE);
        assertEq(impl, address(bond), "Implementation not correctly registered");

        // Now interact with the bond contract directly
        bond.setBond(address(0xBEEF), 12345);
        assertEq(bond.lastBond(), 12345, "Bond not set correctly");
    }
}
