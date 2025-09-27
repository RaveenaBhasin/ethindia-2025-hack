// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";

contract DeployCounterSimple is Script {
    function run() public {
        // Simple deployment without chainweb dependency
        console.log("Deploying Counter contract...");
        
        vm.startBroadcast();
        Counter counter = new Counter();
        vm.stopBroadcast();
        
        console.log("Contract deployed at:", address(counter));
    }
}
