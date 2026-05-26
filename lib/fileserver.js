var http = require('./http');

exports.printcwd = function (ss='working') {
	console.log(ss+" "+process.cwd());
};
exports.addUser = function(db, email, pass){
	db.query("insert into users (email, password) values (?,?)", [email, pass], function (err, row) {
		if(err) throw err;
		// console.log(row);
	});	
};
exports.listCollection = function(db, user_no, resp) {
	db.query("select * from collections where user_no = ?", user_no, function (err, row) {
		if(err) throw err;
		http.sendJson(resp, 200, row);
	});
};
exports.listPhoto = function(db, collection_no, resp) {
	db.query("select * from photographs where collection_number = ?", collection_no, function (err, row) {
		if(err) throw err;
		// console.log(row);
		http.sendJson(resp, 200, row);
	});
};
exports.addPhoto = function(db, url, no, resp){
	db.query("insert into photographs (photo_url, collection_number) values (?,?)", [url, no], function (err, row) {
		if(err) throw err;
		// console.log(row);
		
		exports.listPhoto(db, no, resp);
	});	
};
exports.login = function(db, param, resp) {
	if (!param.email || !param.password) {
		http.sendError(resp, 400, 'email and password are required');
		return;
	}

	db.query("select * from users where email = ? and password = ?", [param.email, param.password], function (err, row) {
		if(err) throw err;
		// console.log(row);
		http.sendJson(resp, 200, row);
	});
};
