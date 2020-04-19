/* Require external APIs and start our application instance */
var express = require('express');
var mysql = require('mysql');
var app = express();

/* Configure our server to read public folder and ejs files */
app.use(express.static('public'));
app.set('view engine', 'ejs');

/* Configure MySQL DBMS */
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'michaelort',
    password: 'michaelort',
    database: 'quotes_db'
});
connection.connect();

/* The handler for the DEFAULT route */
app.get('/', function(req, res){
    var stmt = 'SELECT DISTINCT category FROM l9_quotes';
    connection.query(stmt, function(error, results){
        if(error) throw error;
        
        var category = results;
        res.render('home', {category: category});      
    });
});

/* The handler for the /author route */
app.get('/quotes', function(req, res){
    
    var category = req.query.categorySelect;
    var keyWord = req.query.keyword;
    var gender =  req.query.genderSelect;
    var firstName = req.query.firstname;
    var lastName = req.query.lastname;
    var stmt ="";
    if(keyWord.length){
        //"SELECT quote, firstName, lastName FROM l9_quotes, l9_author WHERE quote LIKE '%life%' and l9_quotes.authorId=l9_author.authorId"
         stmt = 'SELECT quote, firstName, lastName, l9_author.authorId as aid '+
            'FROM l9_quotes, l9_author '+
            'WHERE quote LIKE ' +"'%"+keyWord+"%' "+
            'and l9_quotes.authorId=l9_author.authorId'+";";
    }else if(category.length){
        stmt = "SELECT quote, firstName, lastName, l9_author.authorId as aid " +
        "FROM l9_quotes, l9_author " +
        "WHERE category='life' and " +
        "l9_author.authorId=l9_quotes.authorId;";
    }else if(gender.length && gender != 'none'){
        stmt = "SELECT quote, firstName, lastName, l9_author.authorId as aid "+
        "FROM l9_quotes, l9_author "+
        "WHERE sex='F' and l9_author.authorId=l9_quotes.authorId;";
    }else if(firstName.length && lastName.length){
         stmt = 'select quote, firstName, lastName, l9_author.authorId as aid  ' +
               'from l9_quotes, l9_author ' +
               'where firstName="' + firstName + '" and ' + 'lastName="'+lastName+
               '" and l9_quotes.authorId=l9_author.authorId;';

    }
    if(stmt.length){
        connection.query(stmt, function(error, results){
            if(error) throw error;
            res.render('quotes', {quotes: results});
            
        });
    }else{
        res.render('quotes',{quotes: ''});
    }
    
});

/* The handler for the /author/name/id route */
app.get('/author/:aid', function(req, res){

    var stmt = 'select * from l9_author where l9_author.authorId=\'' 
                + req.params.aid + '\';'
	connection.query(stmt, function(error, found){
	    var author = null;
	    if(error) throw error;
	    if(found.length){
	        author = found[0];
	        // Convert the Date type into the String type
	        author.dob = author.dob.toString().split(' ').slice(0,4).join(' ');
	        author.dod = author.dod.toString().split(' ').slice(0,4).join(' ');
	    }
	    res.render('author', {author: author});
	});
});

/* The handler for undefined routes */
app.get('*', function(req, res){
   res.render('error'); 
});

/* Start the application server */
app.listen(process.env.PORT || 3000, function(){
    console.log('Server has been started');
})