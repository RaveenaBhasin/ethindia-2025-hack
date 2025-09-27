// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Ethereum_SpokePool} from "../lib/contracts/contracts/Ethereum_SpokePool.sol";
import {ChainwebScript} from "kadena-io/foundry-chainweb/Chainweb.sol";

contract DeploySpokePoolImplKadena is ChainwebScript {
    function run() public {
        uint256[] memory chainIds = chainweb.getChainIds();
        
        // Get WETH address from environment variable
        address wethAddr = vm.envOr("WETH", address(0));
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            chainweb.switchChain(chainIds[i]);
            console.log("Deploying SpokePool Implementation to chain:", chainIds[i]);
            
            vm.startBroadcast();
            
            // Deploy implementation
            Ethereum_SpokePool implementation = new Ethereum_SpokePool(
                wethAddr, // WETH address from environment
                3600, // uint32 livenessPeriod
                6*3600 // uint32 rootBundleProposalTimeout
            );
            
            vm.stopBroadcast();
            
            console.log("SpokePool Implementation deployed at:", address(implementation));
        }
    }
}
