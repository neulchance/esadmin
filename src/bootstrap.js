(function (globalThis, factory) {

	// Node.js
	if (typeof exports === 'object') {
		module.exports = factory();
	}

	// Browser
	else {
		// @ts-ignore
		globalThis.MonacoBootstrap = factory();
	}
}(this, function () {
  console.log('what?')
}));