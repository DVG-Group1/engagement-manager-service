var pgp = require('pg-promise')();
var db = pgp(process.env.RDS_USERNAME ? {
	user: process.env.RDS_USERNAME, //AWS info
	database: process.env.RDS_DB_NAME, //AWS info
	password: process.env.RDS_PASSWORD, //AWS info
	port: process.env.RDS_PORT, //AWS info
	host: process.env.RDS_HOSTNAME
} : {
	user: 'appuser', //env var: PGUSER
	database: 'derp_db_postgres', //env var: PGDATABASE
	password: 'appuser', //env var: PGPASSWORD
	port: 5432
});

module.exports = db;
