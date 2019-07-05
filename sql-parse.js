function replaceNewlineWithSpace(str) {
	return str.replace(/\r|\n/gm, ' ');
}

function removeSingleLineComment(str) {
	// remove sql single line comments (ex: "-- this is a comment')
	return str.replace(/--[^\r\n]*/gm, '');
}

function removeMultipleLinesComment(str) {
	// remove sql multiple lines comments (ex: "/* this is a comment */')
	return str.replace(/\/\*(.|\n)*?\*\//gm, '');
}

function checkSingleQuoteCompleteness(str) {
	let counter = 0;

	// just in case variable is not string
	if (typeof str === 'string') {
		for (let i = 0; i < str.length; i++) {
			if (str[i] == '\'')
				counter++;
		}
		// if number of brackets is odd, something is missing
		return (counter % 2 == 0) ? (true) : (false);
	}
	else
		return false;
};

function checkDoubleQuotesCompleteness(str) {
	let counter = 0;

	// just in case variable is not string
	if (typeof str === 'string') {
		for (let i = 0; i < str.length; i++) {
			if (str[i] == '\"')
				counter++;
		}
		// if number of brackets is odd, something is missing
		return (counter % 2 == 0) ? (true) : (false);
	}
	else
		return false;
};

function removeTableAliasFromColumn(arr) {
	let columns = [];
	for (let idx in arr) {
		columns.push(arr[idx].replace(/(.*?)\./, ''));
	}

	return columns;
}

function checkBracketCompleteness(str) {
	let openingBracket = 0;
	let closingBracket = 0;

	// just in case variable is not string
	if (typeof str === 'string') {
		for (let i = 0; i < str.length; i++) {
			if (str[i] == '(')
				openingBracket++;

			if (str[i] == ')')
				closingBracket++;
		}

		return (openingBracket == closingBracket) ? (true) : (false);
	}
	else
		return false;
};

function mapColumnsFromQuery(regexed_str, returnTableAlias = false) {
	let columns = [];

	for (let idx = 0, isBreakInsertion = false; idx < regexed_str.length; idx++) {
		if (!isBreakInsertion) {
			// check a pair of brackets or quotes is a complete pair, just like you and me
			// concat the next string, until it forms a complete pair
			if (!checkBracketCompleteness(regexed_str[idx])) {
				if (regexed_str[idx + 1] === undefined) {
					isBreakInsertion = true;
				}
				else {
					regexed_str[idx + 1] = regexed_str[idx] + regexed_str[idx + 1];
					regexed_str[idx] = undefined;
					continue;
				}
			}

			if (!checkSingleQuoteCompleteness(regexed_str[idx])) {
				if (regexed_str[idx + 1] === undefined) {
					isBreakInsertion = true;
				}
				else {
					regexed_str[idx + 1] = regexed_str[idx] + regexed_str[idx + 1];
					regexed_str[idx] = undefined;
					continue;
				}
			}

			if (!checkDoubleQuotesCompleteness(regexed_str[idx])) {
				if (regexed_str[idx + 1] === undefined) {
					isBreakInsertion = true;
				}
				else {
					regexed_str[idx + 1] = regexed_str[idx] + regexed_str[idx + 1];
					regexed_str[idx] = undefined;
					continue;
				}
			}
		}

		if (isBreakInsertion) {
			// pair is not a complete one. fuck it, must be the last column...
			//trying to find last column
			try {
				regexed_str[idx] = regexed_str[idx].match(/(.*?)FROM/mi)[1];
			}
			catch (error) {
				//if no match found, give an empty string
				regexed_str[idx] = '';
			}
		}

		// Return the column's alias instead, if column is aliased
		let item = regexed_str[idx].trim();
		let rawColumns = item.split(/\ as\ |\ AS\ |\ As\ /);
		let lastAliasIdx = rawColumns.length - 1;

		// Add filtered column to array
		if(rawColumns[lastAliasIdx].length > 0)
			columns.push(rawColumns[lastAliasIdx].replace(/\`|\'|\"/gm,''));
	}

	return (returnTableAlias) ? (columns) : (removeTableAliasFromColumn(columns));
}

function getAllTablesInQuery(query_ori){
	let regexedTables = query_ori.match(/[\s]+FROM|JOIN[\s]+([\S]+)/gmi);
	let tables=[];

	if(regexedTables){
		for(let idx=0;idx<regexedTables.length;idx++){
			let table = regexedTables[idx];
			table = table.replace(/[\s]+FROM|JOIN[\s]+/gmi,'');

			if(table.match(/\,/)){
				let multipleTables = table.split(',');

				for(let tmpTable of multipleTables){
					tmpTable = tmpTable.replace(/[^A-Za-z0-9_]/gi,'');
					if(tmpTable.length>0)
						tables.push(tmpTable);
				}
			}
			else{
				table = table.replace(/[^A-Za-z0-9_]/gi,'');
				if(table.length>0)
					tables.push(table);
			}
		}
	}

	return tables;
}

const sqlParse = {
	parseSelectQuery(query_ori, returnTableAlias = false) {
		// replace newline on sql query with space, simply because I hate multiple lines in regexp
		query_ori = replaceNewlineWithSpace(query_ori);

		// removing comments on sql query
		query_ori = removeSingleLineComment(query_ori);
		query_ori = removeMultipleLinesComment(query_ori);

		// Select all characters between the first 'SELECT' and the LAST 'FROM'
		let queryBetween = query_ori.match(/select([\s\S]+)from/gmi);

		try {
			// Assuming the first match is the list of columns selected in the query
			// 	because we selected all characters between the first 'SELECT' and the LAST 'FROM'
			let raw = queryBetween[0].match(/\ (.*) /)[0].trim();

			// parse columns selected
			let listColumns = mapColumnsFromQuery(raw.split(','), returnTableAlias);

			return {
				columns : listColumns
				,tables : getAllTablesInQuery(query_ori)
			};
		}
		catch (error) {
			//~ console.log(error);
			return [];
		}
	}
	,
	parseInsertQuery(query_ori, returnTableAlias = false) {
		// replace newline on sql query with space, simply because I hate multiple lines in regexp
		query_ori = replaceNewlineWithSpace(query_ori);

		// removing comments on sql query
		query_ori = removeSingleLineComment(query_ori);
		query_ori = removeMultipleLinesComment(query_ori);

		// Select all characters between the first 'SELECT' and the LAST 'FROM'
		let insertedTable = query_ori.match(/INSERT INTO[\s]([\w]+)/mi)[1];
		let typeInsert = query_ori.match(/[\s]VALUES[\s]*\(/mi) ? 'values_syntax' : 'set_syntax';
		let insertedColumns;

		if(typeInsert==='values_syntax'){
			insertedColumns = query_ori.match(new RegExp(`${insertedTable}[\\s]*\\((.*?)[\\s]VALUES[\\s]*\\(`,`mi`))[1];
			insertedColumns = insertedColumns.split(',');

			//next TO DO
			//~ let insertedValues = query_ori.match(/[\s]VALUES[\s]*\(([\s\S]+)\)/mi);
		}
		else{
			insertedColumns = query_ori.match(new RegExp(`${insertedTable}[\\s]*SET[\\s]*([\\s\\S]+)`,`mi`))[1];
			insertedColumns = insertedColumns.replace(/\`/gm,'');
			insertedColumns = insertedColumns.split(',');

			for(let idx = 0;idx<insertedColumns.length;idx++){
				insertedColumns[idx] = insertedColumns[idx].replace(/\=[\s\S]+/mi,'').trim();
			}

		}

		return {
			columns : mapColumnsFromQuery(insertedColumns)
			,tables : [insertedTable]
		};
	}
	,
	parseUpdateQuery(query_ori, returnTableAlias = false) {
		// replace newline on sql query with space, simply because I hate multiple lines in regexp
		query_ori = replaceNewlineWithSpace(query_ori);

		// removing comments on sql query
		query_ori = removeSingleLineComment(query_ori);
		query_ori = removeMultipleLinesComment(query_ori);

		// Select all characters between the first 'SELECT' and the LAST 'FROM'
		let table = query_ori.match(/UPDATE[\s]+([\w]+)[\s]+/mi)[1];
		let otherTables = getAllTablesInQuery(query_ori);
		let columns;

		columns = query_ori.match(/[\s]+SET[\s]+([\s\S]+)/mi)[1];
		//~ columns = columns.replace(/\`/gm,'');
		columns = columns.split(',');

		for(let idx = 0;idx<columns.length;idx++){
			columns[idx] = columns[idx].replace(/\=[\s\S]+/mi,'').trim();
		}

		return {
			columns : mapColumnsFromQuery(columns)
			,tables : [table,...otherTables]
		}
		//~ return 'mapColumnsFromQuery(columns)';
	}
	,
}

module.exports = function(query_ori){
		query_ori = query_ori.trim();
		let results;
		let firstCommand = query_ori.match(/(.*?)\s/mi);

		try{
			firstCommand = firstCommand[1].trim().toUpperCase();

			switch(firstCommand){
				case "SELECT" :
					results = sqlParse.parseSelectQuery(query_ori);
					break;
				case "INSERT" :
					results = sqlParse.parseInsertQuery(query_ori);
					break;
				case "UPDATE" :
					results = sqlParse.parseUpdateQuery(query_ori);
					break;
				default:
					results = {
						columns : []
						,tables : []
					};
					break
			}
			return results;
		}
		catch(error){
			console.log(error);
			return {
				columns : []
				,tables : []
				,error: String(error)
			};
		}
	};
