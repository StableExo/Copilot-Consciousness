import * as bip39 from 'bip39';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const MULTIPLIER = 80.18;
const wordlist = bip39.wordlists.english;

console.log('Verifying Grok\'s calculation:\n');

const indices = PUZZLE_NUMBERS.map(num => {
  const log2Val = Math.log2(num);
  const index = Math.floor(log2Val * MULTIPLIER) % 2048;
  return index;
});

console.log('Indices:', indices);
console.log('');

const grokIndices = [721, 561, 641, 481, 400, 320, 240, 160, 80, 0, 801, 881, 962, 1042, 1122, 1202, 1282, 1363, 1443, 1523, 1603, 1683, 1763, 1844];
console.log('Grok indices:', grokIndices);
console.log('Match:', JSON.stringify(indices) === JSON.stringify(grokIndices));
console.log('');

const words = indices.map(i => wordlist[i]);
console.log('Mnemonic:');
console.log(words.join(' '));
console.log('');

const mn = words.join(' ');
console.log('Is valid BIP39:', bip39.validateMnemonic(mn));

// Also check the specific word at index 1844
console.log('\nWord at index 1844:', wordlist[1844]);
console.log('Last word in our mnemonic:', words[23]);
