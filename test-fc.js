const fc = require('fast-check');

// Test how fc.float works
console.log('Testing fc.float(1.01, 25000):');
for (let i = 0; i < 10; i++) {
  console.log(fc.float(1.01, 25000).generator());
}

console.log('\nTesting fc.float({min: 1.01, max: 25000}):');
for (let i = 0; i < 10; i++) {
  console.log(fc.float({min: 1.01, max: 25000}).generator());
}
