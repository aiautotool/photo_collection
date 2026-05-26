var fs = require('fs');
var path = require('path');

var imageRoot = path.resolve(__dirname, '..', 'public', 'images');

function resolveImagePath(requestPath) {
	var prefix = '/public/images/';
	if (requestPath.indexOf(prefix) !== 0) {
		return null;
	}

	var relativePath = decodeURIComponent(requestPath.slice(prefix.length));
	var resolvedPath = path.resolve(imageRoot, relativePath);
	if (resolvedPath.indexOf(imageRoot + path.sep) !== 0) {
		return null;
	}

	return resolvedPath;
}

function contentType(filePath) {
	var ext = path.extname(filePath).toLowerCase();
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	if (ext === '.gif') return 'image/gif';
	return 'application/octet-stream';
}

exports.resolveImagePath = resolveImagePath;

exports.serve = function(requestPath, resp) {
	var filePath;

	try {
		filePath = resolveImagePath(requestPath);
	} catch (err) {
		resp.statusCode = 400;
		resp.end('Invalid image path');
		return;
	}

	if (!filePath) {
		resp.statusCode = 403;
		resp.end('Forbidden');
		return;
	}

	fs.stat(filePath, function(err, stat) {
		if (err || !stat.isFile()) {
			resp.statusCode = 404;
			resp.end('Not found');
			return;
		}

		resp.setHeader('content-type', contentType(filePath));
		fs.createReadStream(filePath).pipe(resp);
	});
};
