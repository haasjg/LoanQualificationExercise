import fc from 'fast-check';

const gen = fc.integer(1, 25000);

console.log('Generating 10 values from fc.integer(1, 25000):');
for (let i = 0; i < 10; i++) {
  console.log(gen);
}

// Try to find a 0
console.log('\nSearching for 0 in 10000 samples:');
let foundZero = false;
for (let i = 0; i < 10000; i++) {
  // This is wrong - gen is an object, not a function
  // console.log('Should print actual value');
}

// Correct way to sample
const arb = fc.integer(1, 25000);
console.log('\nUsing arb.generate:');
for (let i = 0; i < 10; i++) {
  const gen = arb.generate(Math.random());
  console.log(gen);
  if (gen.value === 0) foundZero = true;
}
console.log('Found 0:', foundZero);
