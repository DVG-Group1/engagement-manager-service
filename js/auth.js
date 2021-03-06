var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var secret = require('./secret.js');

module.exports = (app, getUserByUsername) => {

	app.use(expressJWT({secret}).unless({path: '/login'}));

	app.post('/login', (req, res) => {
		var username = req.body.username;
		var password = req.body.password;

		getUserByUsername(username).then(row => {
			if (row && row.last_name === password){
				console.log('successful login for', username);
				var expDate = new Date();
				expDate.setDate(expDate.getDate() + 7);

				var token = jwt.sign({id: row.id,  role: row.user_role, exp: Math.floor(expDate.getTime()/1000) }, secret);
				res.send({token});
			} else {
				console.log('failed login attempt for ', username);
				res.status(401).send();
			}
		}).catch(err => {
			console.log('Login error', err);
			res.status(500).send();
		});

	});

	app.get('/refresh', (req, res) => {
		var expDate = new Date();
		expDate.setDate(expDate.getDate() + 7);

		var token = jwt.sign({ id: req.body.id, role: req.body.user_role, exp: Math.floor(expDate.getTime()/1000) }, secret);
		res.send({token});
	});
};
