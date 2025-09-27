// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {WETH} from "../src/WETH.sol";
import {ChainwebScript} from "kadena-io/foundry-chainweb/Chainweb.sol";

contract DeployWETHKadena is ChainwebScript {
    function run() public {
        uint256[] memory chainIds = chainweb.getChainIds();
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            chainweb.switchChain(chainIds[i]);
            console.log("Deploying WETH to chain:", chainIds[i]);
            
            vm.startBroadcast();
            WETH weth = new WETH();
            vm.stopBroadcast();
            
            console.log("Contract deployed at:", address(weth));
        }
    }
}