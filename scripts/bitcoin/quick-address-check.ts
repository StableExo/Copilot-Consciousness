import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';

const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const root = bip32.fromSeed(seed);

console.log('Testing mnemonic that worked for bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
console.log('');

// Test first few standard paths
const paths = [
  "m/84'/0'/0'/0/0",
  "m/84'/0'/0'/0/1", 
  "m/84'/0'/0'/0/2",
  "m/84'/0'/0'/1/0",
  "m/84'/0'/1'/0/0",
];

paths.forEach(path => {
  const child = root.derivePath(path);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  console.log(`${path}: ${address}`);
});

console.log('');
console.log('Current target in scripts: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
console.log('Address from images:       bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk');
