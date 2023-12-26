const glob = require('glob')
const path = require('path')

require('ts-node').register({ 
  compilerOptions: {
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
  },
  experimentalResolver: true,
  transpileOnly: true 
})

// Re-export all .ts files as rules
const rules = {};
glob.sync(`${__dirname}/scripts/eslint/rules/*.ts`).forEach((file) => {
	rules[path.basename(file, '.ts')] = require(file);
})

exports.rules = rules
