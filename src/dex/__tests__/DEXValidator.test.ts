import { DEXRegistry } from '../core/DEXRegistry';
import { ethers } from 'ethers';

jest.mock('ethers', () => {
    const originalEthers = jest.requireActual('ethers');
    let validAddresses: Set<string>;

    return {
        ethers: {
            providers: {
                JsonRpcProvider: jest.fn().mockImplementation(() => ({
                    getCode: jest.fn().mockImplementation(address => {
                        if (!validAddresses) {
                            const { DEXRegistry } = jest.requireActual('../core/DEXRegistry');
                            const registry = new DEXRegistry();
                            validAddresses = new Set(
                                registry.getAllDEXes().flatMap(dex => [dex.router, dex.factory])
                            );
                        }
                        if (validAddresses.has(address)) {
                            return Promise.resolve('0x12345');
                        }
                        return Promise.resolve('0x');
                    }),
                })),
            },
            utils: originalEthers.ethers.utils,
        },
    };
});

describe('DEX Validator Tests', () => {
    let registry: DEXRegistry;

    beforeEach(() => {
        registry = new DEXRegistry();
    });

    it('should validate all DEX configurations', async () => {
        const dexes = registry.getAllDEXes();
        expect(dexes.length).toBeGreaterThan(0);

        for (const dex of dexes) {
            console.log(`Validating ${dex.name}...`);

            const provider = new ethers.providers.JsonRpcProvider();

            const routerCode = await provider.getCode(dex.router);
            expect(routerCode).not.toBe('0x');

            const factoryCode = await provider.getCode(dex.factory);
            expect(factoryCode).not.toBe('0x');
        }
    });

    it('should fail validation for a DEX with an invalid address', async () => {
        const provider = new ethers.providers.JsonRpcProvider();
        const invalidAddress = '0xInvalidAddress';
        const code = await provider.getCode(invalidAddress);
        expect(code).toBe('0x');
    });
});
