import { JsonRpcProvider } from 'ethers';

export class RPCProvider {
  private provider: JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  public getProvider(): JsonRpcProvider {
    return this.provider;
  }
}
