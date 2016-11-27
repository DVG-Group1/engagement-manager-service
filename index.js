var server = require('./js/server');

var pgp = require('pg-promise')();
var db = pgp({
	user: 'appuser', //env var: PGUSER
	database: 'derp', //env var: PGDATABASE
	password: 'appuser', //env var: PGPASSWORD
	port: 5432, //env var: PGPORT
});

// take an object whose values are all promises, and when they're all done return a similar object whose properties are the results of those promises
var all = ob => {
	var keys = Object.keys(ob);
	return Promise.all(keys.map(key => ob[key])).then(data => {
		return keys.reduce((res, key, i) => {
			res[key] = data[i];
			return res;
		}, {});
	});
};

var initData = userID => all({
	people: db.any(`
		SELECT id, manager_id, first_name, last_name
		FROM people
		ORDER BY first_name, last_name
	`),
	riskDimensions: db.any(`
		SELECT id, name, description
		FROM risk_dimensions
		ORDER BY ord
	`),
	riskOptions: db.any(`
		SELECT id, risk_dimension_id, description
		FROM risk_dimension_options
		ORDER BY ord
	`),
	riskAssessments: db.any(`
		SELECT id, assessee, date_added, note
		FROM risk_assessments
		WHERE assesser=$(userID)
		AND date_inactive IS NULL
		ORDER BY date_added DESC
	`, {userID}),
	riskRatings: db.any(`
		SELECT risk_ratings.id, risk_dimension_id, risk_assessment_id, rating
		FROM risk_ratings
		INNER JOIN risk_assessments ON risk_assessments.id = risk_assessment_id
		WHERE risk_assessments.assesser=$(userID)
		AND risk_assessments.date_inactive IS NULL
	`, {userID})
});

// get all the things
server.get('/init/:userID', req => initData(req.params.userID));

// save a risk assessment
server.post('/riskAssessment', req => {
	var r = req.body;

	return db.one(
		'INSERT INTO risk_assessments (assessee, assesser, date_added, note) VALUES ($1, $2, $3, $4) returning id',
		[r.assessee, r.assesser, new Date(), r.note]
	).then(assessment => {

		console.log('Added assessment', assessment);

		var answers = Object.keys(r.answers).map(riskID => {
			return db.one(
				'INSERT INTO risk_ratings (rating, risk_assessment_id, risk_dimension_id) VALUES ($1, $2, $3) returning id',
				[r.answers[riskID], assessment.id, riskID]
			);
		});

		return Promise.all(answers).then(() => initData(r.assesser));
	});
});

// called in View Data. Gets data from all of these tables and their column info.
server.get('/allData', () => {
	var tables = ['people', 'risk_assessments', 'risk_dimension_options', 'risk_dimensions', 'risk_ratings'].map(name => {
		return db.any(`SELECT * FROM ${name}`).then(rows => {
			return {name, rows};
		});
	});

	return all({
		tables: Promise.all(tables),
		cols: db.any('SELECT table_name, column_name, is_nullable, data_type FROM information_schema.columns WHERE table_schema=$1', ['public'])
	}).then(({tables, cols}) => {
		return tables.map(t => {
			t.columns = cols.filter(c => c.table_name == t.name);
			return t;
		});
	});
});

// called to save a row of a table in View Data
server.post('/save/:table', req => {
	var params = req.body;
	var pairs = Object.keys(req.body).filter(
		key => key !== 'id'
	).map(key => {
		params[key + 'col'] = key;
		params[key] = req.body[key];
		return `$(${key}col~)=$(${key})`;
	});
	params.tableToUpdate = req.params.table;

	var query = 'UPDATE $(tableToUpdate~) SET ' + pairs.join(', ') + ' WHERE id=$(id)';
	console.log(query, params);
	return db.any(query, params);
});
