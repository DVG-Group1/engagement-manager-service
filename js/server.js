'use strict';

var app = require('express')();
app.use(require('cors')());
app.use(require('compression')());
app.use(require('body-parser').json());

// var session = require('express-session');
// var passport = require('passport');
// app.use(session({
// 	secret: 'derpin\' it up!',
// 	resave: false,
// 	saveUninitialized: false
// }));
// app.use(passport.initialize());
// app.use(passport.session());

var api = {app};

['get', 'post', 'put', 'delete'].forEach(method => {
	api[method] = (path, func) => {
		app[method](path, (req, res) => {
			Promise.resolve(func(req)).then(r => {
				res.send(r);
			}).catch(err => {
				console.log(err, err.stack.split(/\s*\n\s*/).join('\n'));
				res.status(500).send(err.message);
			});
		});
	};
});

app.listen(process.env.VCAP_APP_PORT || 3001, function () {
	console.log('Started on port ' + this.address().port);
});

process.on('SIGINT', () => process.exit(0));

module.exports = api;
