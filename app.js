/* Require external APIs and start our application instance */
var express = require('express');
var mysql = require('mysql');
var bodyParser = require("body-parser");
var session = require('express-session');
var methodOverride = require('method-override');
var bcrypt = require('bcrypt');
var app = express();


app.use(methodOverride('_method'));
/* Configure our server to read public folder and ejs files */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: 'top secret code!',
    resave: true,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');

/* Configure MySQL DBMS */
const connection = mysql.createConnection({
    host: 'un0jueuv2mam78uv.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'nq4rrxfcgniebb03',
    password: 'ptuxc6zu2x2f140p',
    database: 'tobmch4scnkm51x5'
});
connection.connect();



/* Middleware */
function isAuthenticated(req, res, next){
    if(!req.session.authenticated) res.redirect('/login');
    else next();
}
app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});
function checkUsername(username){
    
    let stmt = 'SELECT * FROM users WHERE username=?';
    return new Promise(function(resolve, reject){
       connection.query(stmt, [username], function(error, results){
           if(error) throw error;
           
           resolve(results);
       }); 
    });
}

function checkPassword(password, hash){
    return new Promise(function(resolve, reject){
       bcrypt.compare(password, hash, function(error, result){
          if(error) throw error;
          resolve(result);
       }); 
    });
}
app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login', async function(req, res){
    
    let isUserExist   = await checkUsername(req.body.username);
    let hashedPasswd  = isUserExist.length > 0 ? isUserExist[0].password : '';
    let passwordMatch = await checkPassword(req.body.password, hashedPasswd);
    if(passwordMatch){
        req.session.authenticated = true;
        req.session.user = isUserExist[0].username;
        res.redirect('/adminHome');
    }
    else{
        res.render('login', {error: true});
    }
});



app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});



app.get('/register', function(req, res){
    res.render('register');
});

app.post('/register', function(req, res){
    let salt = 10;
    bcrypt.hash(req.body.password, salt, function(error, hash){
        if(error) throw error;
        let stmt = 'INSERT INTO users (username, password) VALUES (?, ?)';
        let data = [req.body.username, hash];
        connection.query(stmt, data, function(error, result){
           if(error) throw error;
           res.redirect('/login');
        });
    });
});

app.get('/welcome', isAuthenticated, function(req, res){
   res.render('welcome', {user: req.session.user}); 
});
app.get('/adminHome', isAuthenticated,function(req, res){
    var stmt = 'SELECT * FROM l9_author;';
    console.log(stmt);
    var authors = null;
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length) authors = results;
        res.render('adminHome', {authors: authors, user: req.session.user});
    });
});

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
        "WHERE category='"+category+"' and " +
        "l9_author.authorId=l9_quotes.authorId;";
    }else if(gender.length && gender != 'none'){
        stmt = "SELECT quote, firstName, lastName, l9_author.authorId as aid "+
        "FROM l9_quotes, l9_author "+
        "WHERE sex='"+gender+"' and l9_author.authorId=l9_quotes.authorId;";
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
app.get('/author/new', isAuthenticated,function(req, res){
    res.render('author_new');
});

/* Create a new author - Add author into DBMS */
app.post('/author/new', isAuthenticated,function(req, res){
   //console.log(req.body);
   connection.query('SELECT COUNT(*) FROM l9_author;', function(error, result){
       if(error) throw error;
       if(result.length){
            var authorId = result[0]['COUNT(*)'] + 1;
            var stmt = 'INSERT INTO l9_author ' +
                      '(authorId, firstName, lastName, dob, dod, sex, profession, country, biography) '+
                      'VALUES ' +
                      '(' + 
                       authorId + ',"' +
                       req.body.firstname + '","' +
                       req.body.lastname + '","' +
                       req.body.dob + '","' +
                       req.body.dod + '","' +
                       req.body.sex + '","' +
                       req.body.profession + '","' +
                       req.body.country + '","' +
                       req.body.biography + '"' +
                       ');';
            console.log(stmt);
            connection.query(stmt, function(error, result){
                if(error) throw error;
                res.redirect('/');
            })
       }
   });
});
app.get('/author/:aid/edit', isAuthenticated,function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           var author = results[0];
           author.dob = author.dob.toISOString().split('T')[0];
           if(author.dod != '0000-00-00'){
              author.dod = author.dod.toISOString().split('T')[0];
              
           }
           res.render('author_edit', {author: author});
       }
    });
});

/* Edit an author record - Update an author in DBMS */
app.put('/author/:aid', isAuthenticated,function(req, res){
    console.log(req.body);
    var stmt = `UPDATE l9_author SET firstName = '${req.body.firstname}',`+
    `lastName = '${req.body.lastname}', dob = '${req.body.dob}',`+
    `dod ='${req.body.dod}', sex = '${req.body.sex}', profession = '${req.body.profession}', `+
    `portrait ='${req.body.portrait}', biography = ? , `+
    `country ='${req.body.country} ' WHERE authorId = ${req.params.aid};`;

    connection.query(stmt, [req.body.biography],function(error, result){
        if(error) throw error;
        res.redirect('/author/' + req.params.aid);
    });
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
app.get('/author/:aid/delete', function(req, res){
    var stmt = 'DELETE from l9_author WHERE authorId='+ req.params.aid + ';';
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/adminHome');
    });
});

/* The handler for undefined routes */
app.get('*', function(req, res){
   res.render('error'); 
});

/* Start the application server */
app.listen(process.env.PORT, process.env.IP, function(){
    console.log('Server has been started');
})