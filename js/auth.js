var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var session = require('express-session');

module.exports = (app, {getUserByUsername, getUserById}) => {
	passport.use(new Strategy((username, password, done) => {
		getUserByUsername(username)
			.then(rows => {
				var row = rows[0];
				if (row){
					if (row.last_name === password){
						console.log('successful login for', username);
						return done(null, row);
					}
					console.log('bad password for', username);
					return done(null, false, {message: 'Incorrect password.'});
				}
				console.log('bad username for ', username);
				return done(null, false, {message: 'Username does not exist.'});
			})
			.catch(err => done(err));
	}));

	passport.serializeUser((user, done) => done(null, user.id));
	passport.deserializeUser((id, done) => getUserById(id).then(user => done(null, user)).catch(err => done(err)));

	app.use(session({
		secret: 'derpin\' it up!',
		resave: false,
		saveUninitialized: false
	}));

	app.use(passport.initialize());
	app.use(passport.session());

	app.post('/login', passport.authenticate('local'), (req, res) => res.send('Logged in!'));
};
