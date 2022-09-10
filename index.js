const express = require('express')
const app = express();
const mysql = require('mysql')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { response } = require('express');




app.set('views', path.join("views"));
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended:true}))
//make a login System in node with sessions and mysql 
 app.use(cookieParser());
 app.use(express.json());

 app.use(session({
    secret:'user_sid',
    resave:true,
    saveUninitialized:true,
    cookie:{maxAge:21600000 }
 }))





let conn = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"root",
    database:"myWorkTracker",
    port:8889
})


conn.connect((err) =>{
    if(err) {
        console.log(err.message)
    }

    console.log("database connected");
})



app.get('/', (req,res) =>{
  

    if(req.session.user_id) {
        let sql = `select * from users where userName = '${req.session.user_id}'`;
        conn.query(sql, (err,userRow) =>{
            if(err) {
                console.log(err.message);
            }

            let userId = userRow[0].userId;
            let sqlData = `select * from hours where userId=${userId}`
            conn.query(sqlData,(err,rows) =>{
                if(err) throw err.message;
                // res.send(rows)
                res.render('home', {session:req.session, model:rows})
            })
            
        })
      

    }

    else{
        res.render("login", {session:req.session})
    }
})


app.post('/login',(req,res, next) =>{
    let username = req.body.username;
    let password = req.body.password;


    if(username && password) {

    
        // let query = `select * from users where userName='${username}' and userPassword='${password}'`;
        let sql =  `select userPassword from users where userName ='${username}';`;
            conn.query(sql, (err,rows) =>{
                if(err) throw err.message;

                if(rows.length > 0){
                    let hash = rows[0].userPassword;
                    bcrypt.compare(password,hash, (err,result) =>{
                        req.session.user_id = username;
                        res.redirect('/')
                    })
                }

                else{
                    res.send("<script>alert(`UserName or password are incorrect`); window.location=`/`;</script>")
                }

                
            })

        }


})

app.get('/registerUser', (req,res,next) =>{
    res.render('register')

})

app.post('/registerNewUser', (req,res,next) =>{
    const saltRounds = 10;

    //TODO:check if user exist in the database if the email and username is the same
    //TODO:if not register user and hash the password
    let sql = `select * from users where userEmail = '${req.body.email}' or userName ='${req.body.username}'`
    conn.query(sql,(err,rows) =>{
        if(rows.length > 0) {
            res.send("<script>alert(`UserName or Email already exist`);  javascript:history.go(-1);</script>");
        }

        else{

                bcrypt.hash(req.body.password, saltRounds,(err,hash) =>{
                    if(err) throw err.message;
                    let sql = `insert into users(userName, userPassword, usersWage, usersDeduction, userEmail) values ('${req.body.username}', '${hash}', ${req.body.wage}, ${req.body.deduction}, '${req.body.email}')`
                    conn.query(sql,(err,rows) =>{
                        if(err) throw err.message;

                        res.send("<script>alert(`User has been created please log In`); window.location=`/`;</script>")
                    })
                })


        }

    })

})

app.get('/logout', (req,res,next) =>{
 
        req.session.destroy();
        res.redirect('/')
})




app.get('/addHour', (req,res,next) =>{
    if(req.session.user_id) {

        res.render('addNewWorkHour');
    }
    else{
        res.redirect('/')
    }
})




app.post('/addNewHour',(req,res,next) =>{
    if(req.session.user_id) {
        let sql = `select * from users where userName = '${req.session.user_id}'`
        conn.query(sql,(err,rows) =>{
            if(req.body.hours && req.body.breakTime) {
                let sql = `insert into hours (totalHour, totalBreakTime, userId, totalEarned) values (${req.body.hours}, ${req.body.breakTime}, ${rows[0].userId}, ${req.body.hours * rows[0].usersWage})`
                conn.commit(sql);
                res.redirect('/')
            }

    
            else {
                let sql = `insert into hours (totalHour, totalBreakTime, userId, totalEarned) values (${req.body.hours}, ${0}, ${rows[0].userId}, ${req.body.hours * rows[0].usersWage})`
                res.send(sql)

                if(req.body.hours > 5) {
                    //inclase i want to obligar user to enter break
                }
                conn.commit(sql)
                // res.redirect('/')
            }

        })
        
       

    }
    else{
        res.redirect('/');
    }
}) 



app.listen(3000);