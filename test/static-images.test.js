var assert = require('assert');
var path = require('path');
var staticImages = require('../lib/static-images');

var root = path.resolve(__dirname, '..', 'public', 'images');

assert.strictEqual(
	staticImages.resolveImagePath('/public/images/40/0.jpg'),
	path.join(root, '40', '0.jpg')
);

assert.strictEqual(staticImages.resolveImagePath('/public/images/../form.html'), null);
assert.strictEqual(staticImages.resolveImagePath('/public/images/%2e%2e/form.html'), null);
assert.strictEqual(staticImages.resolveImagePath('/api'), null);

console.log('static image path tests passed');
