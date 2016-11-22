var server = require('./js/server');

var pgp = require('pg-promise')();
var db = pgp({
	user: 'appuser', //env var: PGUSER
	database: 'derp', //env var: PGDATABASE
	password: 'appuser', //env var: PGPASSWORD
	port: 5432, //env var: PGPORT
});

var all = ob => {
	var keys = Object.keys(ob);
	return Promise.all(keys.map(key => ob[key])).then(data => {
		return keys.reduce((res, key, i) => {
			res[key] = data[i];
			return res;
		}, {});
	});
};

// server.get('/table/:table', req => {
// 	return db.any(`SELECT * FROM ${req.params.table}`);
// });

server.get('/riskDimensions', () => {
	return all({
		riskDimensions: db.any('SELECT id, description FROM risk_dimensions ORDER BY ord'),
		options: db.any('SELECT id, risk_dimension_id as parent, description, ord FROM risk_dimension_options ORDER BY ord')
	}).then(data => {
		return data.riskDimensions.map(r => {
			return {
				id: r.id,
				description: r.description,
				options: data.options.filter(o => o.parent === r.id)
			};
		});
	});
});

server.get('/people', () => {
	return db.any('SELECT id, manager_id, first_name, last_name FROM people ORDER BY last_name, first_name');
});

server.post('/riskAssessment', req => {
	var r = req.body;
	var now = new Date();

	return db.one(
		'INSERT INTO risk_assessments (assessee, assesser, date_added, notes) VALUES ($1, $2, $3, $4) returning id',
		[r.assessee, r.assesser, now, r.notes]
	).then(assessment => {

		console.log('Added assessment', assessment);

		var answers = r.answers.map(a => {
			return db.one(
				'INSERT INTO risk_ratings (date_added, rating, risk_assessment_id, risk_dimension_id) VALUES ($1, $2, $3, $4) returning id',
				[now, a.value, assessment.id, a.id]
			);
		});

		return Promise.all(answers);
	});
});

// server.get('/columns/:table', req => {
// 	return db.any(
// 		'SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
// 		['public', req.params.table]
// 	);
// });

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
