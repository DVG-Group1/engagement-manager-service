
var db = require('./js/db');

var server = require('./js/server')((username) =>
	db.any('SELECT * FROM people WHERE lower(dbs_id)=lower($(username))', {username}).then(rows => rows[0])
);

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

var getInitData = () => all({
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
		SELECT id, risk_dimension_id, risk_val, description
		FROM risk_dimension_options
		ORDER BY risk_val
	`),
	riskAssessments: db.any(`
		SELECT id, assesser_id, assessee_id, date_added, note
		FROM risk_assessments
		WHERE date_inactive IS NULL
		ORDER BY date_added DESC
	`),
	riskRatings: db.any(`
		SELECT risk_ratings.id, risk_dimension_id, risk_assessment_id, rating
		FROM risk_ratings
		INNER JOIN risk_assessments ON risk_assessments.id = risk_assessment_id
		WHERE risk_assessments.date_inactive IS NULL
	`)
});

server.get('/init', getInitData);

// save a risk assessment
server.post('/riskAssessment', req => {
	var r = req.body;

	return db.one(
		'INSERT INTO risk_assessments (assessee_id, assesser_id, date_added, note) VALUES ($1, $2, $3, $4) returning id',
		[r.assessee_id, r.assesser_id, new Date(), r.note]
	).then(assessment => {

		console.log('Added assessment', assessment);

		var answers = Object.keys(r.answers).map(riskID => {
			return db.one(
				'INSERT INTO risk_ratings (rating, risk_assessment_id, risk_dimension_id) VALUES ($1, $2, $3) returning id',
				[r.answers[riskID], assessment.id, riskID]
			);
		});

		return Promise.all(answers).then(getInitData);
	});
});

var allData = () => {
	return all({
		tables: all({
			people: db.any('SELECT * FROM people ORDER BY first_name, last_name'),
			risk_assessments: db.any('SELECT * FROM risk_assessments ORDER BY date_added'),
			risk_dimension_options: db.any('SELECT * FROM risk_dimension_options ORDER BY risk_val'),
			risk_dimensions: db.any('SELECT * FROM risk_dimensions ORDER BY ord'),
			risk_ratings: db.any('SELECT * FROM risk_ratings')
		}),
		cols: db.any('SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=$1', ['public'])
	}).then(({tables, cols}) => {

		return Object.keys(tables).reduce((res, tableName) => {
			res[tableName] = {
				rows: tables[tableName],
				columns: cols.filter(c => c.table_name == tableName)
			};
			return res;
		}, {});

	});
};

// called in View Data. Gets data from all of these tables and their column info.
server.get('/allData', allData);

// called to save a row of a table in View Data
server.post('/saveRecord/:tableName', req => {
	var keys = Object.keys(req.body);

	var params = keys.reduce((res, key) => {
		res[key] = req.body[key];
		res[key + 'col'] = key;
		return res;
	}, {editTableName: req.params.tableName});

	var query;

	if (req.body.id){
		var pairs = keys.filter(key => key !== 'id').map(key => `$(${key}col~)=$(${key})`);
		query = `UPDATE $(editTableName~) SET ${pairs.join(', ')} WHERE id=$(id)`;
	} else {
		var cols = keys.map(key => `$(${key}col~)`);
		var vals = keys.map(key => `$(${key})`);
		query = `INSERT INTO $(editTableName~) (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
	}

	console.log(query, params);
	return db.any(query, params).then(allData);
});
