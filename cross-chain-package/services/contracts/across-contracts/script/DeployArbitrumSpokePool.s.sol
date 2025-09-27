// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Arbitrum_SpokePool} from "../lib/contracts/contracts/Arbitrum_SpokePool.sol";
import {TransparentUpgradeableProxy} from "../lib/openzeppelin-contracts/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "../lib/openzeppelin-contracts/contracts/proxy/transparent/ProxyAdmin.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ITokenMessenger} from "../lib/contracts/contracts/external/interfaces/CCTPInterfaces.sol";

contract DeployArbitrumSpokePool is Script {
    function run() external {

        vm.startBroadcast();

        // 1. Deploy implementation
        Arbitrum_SpokePool implementation = new Arbitrum_SpokePool(
        // _wrappedNativeTokenAddress
        0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
        // _depositQuoteTimeBuffer
        3600,
        // _fillDeadlineBuffer
        21600,
        // _l2Usdc
        IERC20(0xaf88d065e77c8cC2239327C5EDb3A432268e5831),
        // _cctpTokenMessenger
        ITokenMessenger(0x19330d10D9Cc8751218eaf51E8885D058642E08A)
        );

        vm.stopBroadcast();

        console2.log("Contract deployed at: ", address(implementation));
    }
}