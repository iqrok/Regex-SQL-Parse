
function replaceNewlineWithSpace (str) {
	return str.replace(/\r|\n/gm, ' ');
}

function removeSingleLineComment (str) {
	// remove sql single line comments (ex: "-- this is a comment')
	return str.replace(/--[^\r\n]*/gm, '');
}

function removeMultipleLinesComment (str) {
	// remove sql multiple lines comments (ex: "/* this is a comment */')
	return str.replace(/\/\*(.|\n)*?\*\//gm, '');
}

function checkSingleQuoteCompleteness (str) {
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

function checkDoubleQuotesCompleteness (str) {
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

function removeTableAliasFromColumn (arr) {
	let columns = [];
	for (let idx in arr) {
		columns.push(arr[idx].replace(/(.*?)\./,''));
	}

	return columns;
}

function parseSelectQuery(query_ori,returnTableAlias=false) {
	//--------------- sql query parsing regex trial - IQROK ---------------------

	let checkBracketCompleteness = function (str) {
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

	let mapColumnsFromQuery = function (regexed_str,returnTableAlias = false) {
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
				try{
					regexed_str[idx] = regexed_str[idx].match(/(.*?)FROM/mi)[1];
				}
				catch(error){
					//if no match found, give an empty string
					regexed_str[idx] = '';
				}
			}

			// Return the column's alias instead, if column is aliased
			let item = regexed_str[idx].trim();
			let rawColumns = item.split(/\ as\ |\ AS\ |\ As\ /);
			let lastAliasIdx = rawColumns.length - 1;

			// Add filtered column to array
			columns.push(rawColumns[lastAliasIdx]);
		}

		return (returnTableAlias)?(columns):(removeTableAliasFromColumn(columns));
	}

	// -------------- MAIN FUNCITON ---------------

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
		let listColumns = mapColumnsFromQuery(raw.split(','),returnTableAlias);

		return listColumns;
	}
	catch (error) {
		//~ console.log(error);
		return [];
	}
	//---------------- end of  sql query parsing regex trial - IQROK ----------------------
}

let sql = [
"SELECT CONCAT( '?', '-', ( SELECT RIGHT(catarNoDaftar, 4) +1 AS noDaft FROM ptb_calon_taruna WHERE catarTahunDaftar = '?' ORDER BY catarId DESC LIMIT 1 )) AS idDaftar, noDaftar, nama AS namaTaruna FROM ptb_calon_taruna"

, "SELECT aa.kanbanName,bb.partNumber,bb.partName,cc.warehouseName FROM tb_kanban aa LEFT JOIN tb_part AS bb ON aa.kanbanNumber=bb.partNumber LEFT JOIN tb_warehouse AS cc ON cc.warehouseId=bb.warehouseId"

, "Select /* ini adalah comment block */ * from Employee1;"

, "Select /* ini adalah comment block */ col1,col2 from Employee1;"

, "SELECT \"DASA WINDU AGUNG\" as supplierName, \"5021-1\" as supplierId, \"PT. TOYOTA MOTOR MANUFACTURING INDONESIA\" as clientName, \"SUNTER 1\" as clientLocation, bb.manifestDepartTime as departTime, date_format(str_to_date(bb.manifestDepartTime, '%Y/%m/%d %H:%i'), '%Y/%m/%d') as manifestDeptDate, date_format(str_to_date(bb.manifestDepartTime, '%Y/%m/%d %H:%i'), '%H:%i') as manifestDeptTime, bb.manifestArrTime as arrTime, date_format(str_to_date(bb.manifestArrTime, '%Y/%m/%d %H:%i'), '%Y/%m/%d') as manifestArrDate, date_format(str_to_date(bb.manifestArrTime, '%Y/%m/%d %H:%i'), '%H:%i') as manifestArrTime, bb.manifestOrderNumber as orderNumber, bb.manifestDockCode as dockCode, kanbanId, kanbanManifestId, kanbanNumber, kanbanQuantity, kanbanName, kanbanUniqueNumber, kanbanArrTime, kanbanPartAddress, kanbanSupplierName, kanbanSupplierId, kanbanDockCode, kanbanPLaneNo, kanbanConveyanceNo, kanbanSupplierData, kanbanClientName, kanbanClientLocation, kanbanBoxNumber, kanbanShutterlotCode, kanbanCase, kanbanPackDate, kanbanImporterCode, kanbanImporterInfo, kanbanRenbanNo, kanbanOtherInfo, cc.partNumber as partNumber, cc.partName as partName, dnId, dnRegion, dnSupplierName, dnSupplierCode, dnDockCode, dnProgressLaneNo, dnOrderNo, dnSupplierPickUpRoute, dnSupplierDepartDate, dnSupplierDepartTime, dnSupplierArrDate, dnSupplierArrTime, dnInterplantRoute, dnInterplantDepartDate, dnInterplantDepartTime, dnInterplantArrDate, dnInterplantArrTime, dnProgressLane, dnProgressLaneDepartDate, dnProgressLaneDepartTime, dnProgressLaneArrDate, dnProgressLaneArrTime, dnDeliveryBarCode, dnConveyanceNo, dnModuleNo,( SELECT COUNT(*) as TOTAL_KANBAN FROM tb_kanban WHERE kanbanManifestId = bb.manifestOrderNumber GROUP BY kanbanManifestId) as TOTAL_KANBAN,( SELECT SUM(kanbanQuantity) as TOTAL_QTY FROM tb_kanban WHERE kanbanManifestId = bb.manifestOrderNumber GROUP BY kanbanManifestId) as TOTAL_QTY FROM tb_kanban LEFT JOIN tb_manifest as bb ON bb.manifestOrderNumber = kanbanManifestId LEFT JOIN tb_part as cc ON kanbanNumber = cc.partNumber LEFT JOIN tb_warehouse as dd ON dd.warehouseId = cc.warehouseId LEFT JOIN tb_delivery_note as ee ON bb.manifestOrderNumber = ee.dnOrderNo WHERE dd.warehouseName = \"GUDANG A\""

, "SELECT \
  e.employee_id AS \"Employee #\" \
  , e.first_name || ' ' || e.last_name AS \"Name\" \
  , e.email AS \"Email\" \
  , e.phone_number AS \"Phone\" \
  , TO_CHAR(e.hire_date, 'MM/DD/YYYY') AS \"Hire Date\" \
  , TO_CHAR(e.salary, 'L99G999D99', 'NLS_NUMERIC_CHARACTERS = ''.,'' NLS_CURRENCY = ''$''') AS \"Salary\" \
  , e.commission_pct AS \"Comission %\" \
  , 'works as ' || j.job_title || ' in ' || d.department_name || ' department (manager: ' \
    || dm.first_name || ' ' || dm.last_name || ') and immediate supervisor: ' || m.first_name || ' ' || m.last_name AS \"Current Job\" \
  , TO_CHAR(j.min_salary, 'L99G999D99', 'NLS_NUMERIC_CHARACTERS = ''.,'' NLS_CURRENCY = ''$''') || ' - ' || \
      TO_CHAR(j.max_salary, 'L99G999D99', 'NLS_NUMERIC_CHARACTERS = ''.,'' NLS_CURRENCY = ''$''') AS \"Current Salary\" \
  , l.street_address || ', ' || l.postal_code || ', ' || l.city || ', ' || l.state_province || ', ' \
    || c.country_name || ' (' || r.region_name || ')' AS \"Location\" \
  , jh.job_id AS \"History Job ID\" \
  , 'worked from ' || TO_CHAR(jh.start_date, 'MM/DD/YYYY') || ' to ' || TO_CHAR(jh.end_date, 'MM/DD/YYYY') || \
    ' as ' || jj.job_title || ' in ' || dd.department_name || ' department' AS \"History Job Title\" \
   \
FROM employees e \
-- to get title of current job_id \
  JOIN jobs j  \
    ON e.job_id = j.job_id \
-- to get name of current manager_id \
  LEFT JOIN employees m  \
    ON e.manager_id = m.employee_id \
-- to get name of current department_id \
  LEFT JOIN departments d  \
    ON d.department_id = e.department_id \
-- to get name of manager of current department \
-- (not equal to current manager and can be equal to the employee itself) \
  LEFT JOIN employees dm  \
    ON d.manager_id = dm.employee_id \
-- to get name of location \
  LEFT JOIN locations l \
    ON d.location_id = l.location_id \
  LEFT JOIN countries c \
    ON l.country_id = c.country_id \
  LEFT JOIN regions r \
    ON c.region_id = r.region_id \
-- to get job history of employee \
  LEFT JOIN job_history jh \
    ON e.employee_id = jh.employee_id \
-- to get title of job history job_id \
  LEFT JOIN jobs jj \
    ON jj.job_id = jh.job_id \
-- to get namee of department from job history \
  LEFT JOIN departments dd \
    ON dd.department_id = jh.department_id \
 \
ORDER BY e.employee_id;"

, `SELECT
    mhs.mhsNiu AS NIM,
	mhsNama AS NAMA,
	mhsAngkatan AS ANGKATAN,
	mhsIsTranskripAkhirDiarsipkan AS SUDAH_DIARSIPKAN,
	prodiNamaResmi AS PROGRAMSTUDI,
   prodiKode AS PROGRAMSTUDI_KODE,
    prodiNamaJenjang AS STRATA,
	mhsTanggalTerdaftar AS TGL_MASUK,
	ydssesiTanggal AS TGL_LULUS,
	ydssesiId AS SESI_ID,
   IF(ydsMhsNiu IS NULL, 0, 1) AS IS_LULUS,
	IF(mhsTanggalLahirTranskrip IS NULL, mhsTanggalLahir, mhsTanggalLahirTranskrip) AS TGL_LAHIR,
	IF(mhsTempatLahirTranskrip IS NULL, kotaNama, mhsTempatLahirTranskrip) AS TEMPAT_LAHIR,
	mhsNomorTranskrip AS NO_TRANSKRIP,
	mhsTanggalTranskrip AS TGL_TRANSKRIP,
	mhsNoIjasah AS NO_IJASAH,
	mhsPrlsrId AS PREDIKAT_ID
FROM mahasiswa mhs
LEFT JOIN program_studi prodi
	ON mhs.mhsProdiKode = prodi.prodiKode
LEFT JOIN s_yudisium ON ydsMhsNiu = mhsNiu
LEFT JOIN s_yudisium_sesi ON ydsYdssesiId=ydssesiId
LEFT JOIN kota_ref
    ON mhsKotaKodeLahir = kotaKode
WHERE mhs.mhsNiu = @NIU`

, `SELECT
	rekap.JML_SKS_W AS JML_SKS_W,
	rekap.JML_SKS_P AS JML_SKS_P,
	rekap.JML_SKS_TOT AS JML_SKS_TOT,
	ROUND(mhs.mhsIpkTranskrip, 2) AS IPK,
	mhs.mhsBobotTotalTranskrip AS TOTAL_SKS_BOBOT,
   mhs.mhsPrlsrNama AS PREDIKAT_IPK
FROM
(
SELECT
	traNiu AS NIU,
	SUM(IF(traSifatMatakuliah = 'W', traJumlahSks, 0)) as JML_SKS_W,
	SUM(IF(traSifatMatakuliah = 'P', traJumlahSks, 0)) as JML_SKS_P,
	SUM(traJumlahSks) as JML_SKS_TOT
FROM
	s_v_transkrip_akhir
WHERE
	traIsDipakai = 1
AND
	traNiu = @NIU
GROUP BY traNiu
) AS rekap
JOIN mahasiswa mhs on mhs.mhsNiu = rekap.NIU`
];

console.log('**********  PARSING STARTED  ***************');
for (let idx in sql) {
	console.log('------------- START ------------------');
	console.log('\n####################### SQL QUERY #######################');
	console.log(sql[idx]);
	console.log('\n####################### PARSED COLUMNS #######################');
	let parsed = parseSelectQuery(sql[idx]);
	console.log(parsed);
	console.log('-------------  END  ------------------\n');
}
console.log('*************  FINISHED  ******************');

//~ let insertQuery =[
//~ 'INSERT INTO tb_produksi_log(`plogNoSPK`,`plogOperator`,`plogTotalPcs`,`plogTotalScrap`,`plogCavityNumber`,`plogWaktuProduksi`,`plogWaktuDowntime`,`plogUniqueId`) VALUES(?,?,?,?,?,?,?)'

//~ ];


//~ console.log('**********  PARSING STARTED  ***************');
//~ for (let idx in insertQuery) {
	//~ console.log('------------- START ------------------');
	//~ console.log('\n####################### SQL QUERY #######################');
	//~ console.log(insertQuery[idx]);
	//~ console.log('\n####################### PARSED COLUMNS #######################');
	//~ let parsed = parseInsertQuery(insertQuery[idx]);
	//~ console.log(parsed);
	//~ console.log('-------------  END  ------------------\n');
//~ }
//~ console.log('*************  FINISHED  ******************');
