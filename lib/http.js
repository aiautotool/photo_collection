var qs = require('querystring');

exports.sendJson = function(resp, statusCode, payload) {
	resp.statusCode = statusCode || 200;
	resp.setHeader('content-type', 'application/json; charset=utf-8');
	resp.end(JSON.stringify(payload));
};

exports.sendError = function(resp, statusCode, message) {
	exports.sendJson(resp, statusCode, { error: message });
};

exports.readFormBody = function(req, callback) {
	var body = '';
	req.on('data', function(chunk) {
		body += chunk;
		if (body.length > 1024 * 1024) {
			req.connection.destroy();
		}
	});
	req.on('end', function() {
		callback(qs.parse(body));
	});
};
