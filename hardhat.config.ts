// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    overrides: {
      "contracts/FlashSwapV2.sol": {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "contracts/interfaces/IUniswapV2Router02.sol": {
        version: "0.7.6"
      },
      "contracts/interfaces/IDODOV1V2Pool.sol": {
        version: "0.7.6"
      }
    }
  },
  paths: {
    sources: "./contracts"
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.BASE_RPC_URL || "",
        enabled: process.env.FORKING === "true"
      }
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    },
    mainnet: {
      url: process.env.BASE_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    },
    base: {
      url: process.env.BASE_RPC_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD"
  },
  tracer: {
    enabled: true,
    tasks: ['test', 'node']
  }
};

export default config;
