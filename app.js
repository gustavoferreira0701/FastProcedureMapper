var mysql = require('mysql'),
    conexao = null;

function Conectar() {
	conexao = mysql.createConnection({
		host:"127.0.0.1",
		user:"root",
		password:"naotenhosenha",
		database:"App",
		multipleStatements:true
	});
};

function ListarTabelas() {
	return new Promise((f, r)=>{
		var query = 'SHOW TABLES;';
		conexao.query(query, function consultaTabelas(err, rows) {
			if(err)
				r(err);
			else
				f(rows);
		});
	});	
};

function ProcessarTabelas(tabelas) {
	return new Promise((f,r)=>{
		var promiseList = [];		
		tabelas.map((tabela, idx)=>{
			return GerarProcedures(tabela.Tables_in_MaisEmConta.toString());
		});

		Promise.all(promiseList)
			   .then((ret)=>{
			   		console.log('Procedures geradas');
			   		f(ret);
			   })
			   .catch((e)=>{
			   		console.log(e);
			   		r(e);
			   });	
	});
};

function GerarProcedures(tabela) {
	return new Promise((f,r)=>{		
		ListarColunas(tabela)
			.then((colunas)=>{	
				
				var arr = [
					GerarProcedureSELECT(tabela, colunas),
					GerarProcedureINSERT(tabela, colunas),
					GerarProcedureUPDATE(tabela, colunas),
					GerarProcedureDELETE(tabela, colunas)
				];

				Promise.all(arr)
					   .then(()=>{
					   		f();
					   })
					   .catch((err)=>{
					   		console.log('Erro na geração das procedures da tabela: ', tabela, err);
					   		r(err);
					   });
				
			})
			.catch((e)=> r(e));
	});
};

function GerarProcedureSELECT(tabela, colunas) {

	var query = '',
		where = '',
		header = '';

	header += 'USE MaisEmConta;\n';
	header += 'DROP PROCEDURE IF EXISTS sp' + tabela + 'SELECT; \n';
	header += 'CREATE PROCEDURE sp' + tabela + 'SELECT (';
	query += 'BEGIN \n';
	query += 'SELECT \n';
	
	colunas.forEach((coluna, idx)=>{
		
		query += (idx > 0 ? ',':'') + coluna.nome + '\n';
		
		if(coluna.PK){
			where = 'WHERE ' + coluna.nome + ' = IFNULL(' + coluna.parametro + ','+ coluna.nome +');\n';
			header += coluna.parametro + ' ' + coluna.type + ' ) \n';
		}
	});

	query += 'FROM ' + tabela + '\n';	

	query = header + query + where;
	query += 'END \n';

	return new Promise ((f,r)=>{
		conexao.query(query, function (err, rows) {
			if(err){				
				r(err);
			}
			else{	
				console.log('Procedure sp' + tabela + 'SELECT criada com sucesso');			
				f(rows);
			}
		});
	});
};

function GerarProcedureDELETE(tabela, colunas) {
	var query = '',
		where = '',
		header = '';

	header += 'USE MaisEmConta;\n';
	header += 'DROP PROCEDURE IF EXISTS sp' + tabela + 'DELETE; \n';
	header += 'CREATE PROCEDURE  sp' + tabela + 'DELETE (';
	query += 'BEGIN \n';
	query += 'DELETE \n';
	
	colunas.forEach((coluna, idx)=> {		
		if(coluna.PK){
			where = 'WHERE ' + coluna.nome + ' = ' + coluna.parametro + ';\n';
			header += coluna.parametro + ' ' + coluna.type + ' ) \n';
		}
	});

	query += 'FROM ' + tabela + '\n';	

	query = header + query + where;
	query += 'END \n';

	return new Promise ((f,r)=>{		
		conexao.query(query, function (err, rows) {
			if(err){				
				r(err);
			}
			else{
				console.log('Procedure sp' + tabela + 'DELETE criada com sucesso');
				f(rows);
			}
		});
	});
};

function GerarProcedureUPDATE(tabela, colunas) {
	var query = '',
		where = '',
		header = '';

	header += 'USE MaisEmConta;\n';
	header += 'DROP PROCEDURE IF EXISTS sp' + tabela + 'UPDATE; \n';
	header += 'CREATE PROCEDURE sp' + tabela + 'UPDATE (';
	query += 'BEGIN \n';
	query += 'UPDATE ' + tabela + ' SET \n';
	
	var first = true;

	colunas.forEach((coluna, idx)=>{
		
		if(coluna.PK){
			where = 'WHERE ' + coluna.nome + ' = ' + coluna.parametro + ' ;\n';
		} 
		
		header += (!first ? ',':'') + coluna.parametro + ' ' + coluna.type + '';
		query += (!first ? ',':'') + coluna.nome + ' = ' + coluna.parametro + '\n';	
		first = false;
		
	});	

	header += ' )\n';
	query = header + query + where;
	query += 'END \n';

	return new Promise ((f,r)=>{		
		conexao.query(query, function (err, rows) {
			if(err){				
				r(err);
			}
			else{
				console.log('Procedure sp' + tabela + 'UPDATE criada com sucesso');
				f(rows);
			}
		});
	});
};

function GerarProcedureINSERT(tabela, colunas) {
	var query = '',
		where = '',
		header = '',
		columnName = '',
		columnValue = '';

	header += 'USE MaisEmConta;\n';
	header += 'DROP PROCEDURE IF EXISTS sp' + tabela + 'INSERT; \n';
	header += 'CREATE PROCEDURE sp' + tabela + 'INSERT (';
	query += 'BEGIN \n';
	query += 'INSERT INTO ' + tabela + ' \n';
	
	var first = true;

	colunas.forEach((coluna, idx)=> {		
		if(coluna.PK == false){
			columnName += (!first ? ',':'(') + coluna.nome;		
			columnValue += (!first ? ',':'(') + coluna.parametro;
			header += (!first ? ',':'') + coluna.parametro + ' ' + coluna.type + '';
			first = false;
		}
	});	

	header += ') \n'
	columnName += ')\n';
	columnValue += ')';

	query += columnName + ' \n';
	query += 'VALUES ' + columnValue + '; \n';
	query += 'END \n';	

	query = header + query;

	return new Promise ((f,r)=>{		
		conexao.query(query, function (err, rows) {
			if(err){
				r(err);
			}
			else{
				console.log('Procedure sp' + tabela + 'INSERT criada com sucesso');
				f(rows);
			}
		});
	});
};

function ListarColunas(tabela) {
	return new Promise((f,r)=>{				
		var query = 'DESCRIBE ' + tabela + ' ; ';
		conexao.query(query, function consultaColunas(err, rows) {
			if(err){				
				r(err);
			}
			else{
				var resultado = rows.map((column,idx)=>{
					return {
						'nome':column.Field,
						'parametro':'p'+column.Field.toString(),
						'type': ConfiguraTipoDado(column.Type),
						'PK':column.Key == 'PRI' ? true:false
					};
				});

				f(resultado);
			}
		});
	});
}

function ConfiguraTipoDado(tipoDado) {	
	if(tipoDado.indexOf("varchar") > -1){		  
          return tipoDado.trim();
      }        
      else{
        return tipoDado.split("(")[0].trim(); 
      }
}

Conectar();
ListarTabelas()
	.then(ProcessarTabelas)
	.then(()=> {
		console.log('Procedures geradas com sucesso!');
	})
	.catch((erro)=>{
		console.log('Houve um erro no processo de geração: ', erro);
	});
