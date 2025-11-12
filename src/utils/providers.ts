import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
if (!rpcUrl) {
  // In a real application, you might have a fallback or a more robust config system
  console.error('RPC URL not found. Please set ETHEREUM_RPC_URL or BASE_RPC_URL in your .env file');
  throw new Error('RPC URL is required');
}

export const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
