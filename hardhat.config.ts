import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
require('dotenv').config();

console.log("BASE_PRIVATE_KEY:", process.env.BASE_PRIVATE_KEY);

const config: HardhatUserConfig = {
  paths: {
    sources: "./src/arbitrage",
  },
  solidity: "0.8.20",
  networks: {
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.BASE_PRIVATE_KEY ? [process.env.BASE_PRIVATE_KEY] : [],
    },
  },
};

export default config;
