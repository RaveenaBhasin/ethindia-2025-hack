// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";
import {ChainwebScript} from "kadena-io/foundry-chainweb/Chainweb.sol";

contract DeployCounter is ChainwebScript {
    function run() public {
        uint256[] memory chainIds = chainweb.getChainIds();
        for (uint256 i = 0; i < chainIds.length; i++) {
            chainweb.switchChain(chainIds[i]);
            console.log("Deploying to chain:", chainIds[i]);
            
            vm.startBroadcast();
            Counter counter = new Counter();
            console.log("Deployed at:", address(counter));
            vm.stopBroadcast();
        }
    }
}
