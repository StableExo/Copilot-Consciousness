import { ethers } from 'ethers';

export class RPCProvider {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  public getProvider(): ethers.providers.JsonRpcProvider {
    return this.provider;
  }
}
