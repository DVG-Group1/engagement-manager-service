// this file isn't used, just an example of how the data was originally loaded

var riskFactors = [{
	text: 'Consultant Morale and Connection',
	options: [
		'Consultant is very happy in current role and current client assignment.',
		'Consultant is generally happy in current role, and current client assigment.',
		'Consultant is somewhat bored in current role and find that current client assignment is tolerable, but not happy about it. ',
		'Consultant is very unhappy in current role, and/or is very unhappy with current client assignment.',
		'Consultant is very unhappy / ineffective in current role and current client assignments, and is actively seeking new opportunities'
	]
}, {
	text: 'Business Development Effectiveness',
	options: [
		'Very effective CSA2; consultant is actively engaged in business development',
		'',
		'Moderately effective CSA2; consultant will act if directed, but does not take independent action',
		'',
		'Little or no CSA2 activity; consultant is not engaged and disinterested in business development'
	]
}, {
	text: 'Client is ____ with Daugherty consultant (e.g., skillset, attitude, work habits, etc.) and/or work products.',
	options: [
		'Completely satisfied',
		'',
		'Generally satisfied',
		'',
		'Very dissatisfied'
	]
}, {
	text: 'Repeat Likelihood',
	options: [
		'High repeat likelihood based on delivery success and long-term client relationship',
		'Probable repeat likelihood based on delivery success and long-term client relationship',
		'Moderate repeat likelihood, but dependent on unknown or unpredictable factors',
		'Little or no repeat likelihood due to client budgetary issues or leadership changes',
		'Little or no repeat likelihood due to delivery issues or other changes'
	]
}, {
	text: 'Daugherty Management Visibility',
	options: [
		'Regular delivery oversight (including technical / functional QAs). Strong relationships at senior client levels',
		'',
		'Regular delivery oversight (including technical / functional QAs), but limited business relationships ',
		'',
		'Infrequent delivery oversight (e.g., technical, functional QAs,). Little or no relationships at senior client levels'
	]
}, {
	text: 'Risk level for this consultant is...',
	options: [
		'Greatly improving',
		'Slightly improving',
		'Unchanged',
		'Slightly increasing',
		'Greatly increasing'
	]
}];

Promise.all(
	riskFactors.map((r, i) => {
		return db.one(
			'INSERT INTO risk_dimensions (description, ord) VALUES ($1, $2) returning id',
			[r.text, i]
		).then(data => {
			return Promise.all(
				r.options.map((o, j) => {
					return db.one(
						'INSERT INTO risk_dimension_options (description, ord, risk_dimension_id) VALUES ($1, $2, $3)',
						[o, j, data.id]
					);
				})
			);
		});
	})
).catch(e => console.log(e));
