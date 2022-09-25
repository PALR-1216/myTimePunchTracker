const express = require('express')
const app = express();
const mysql = require('mysql')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const bcrypt = require('bcrypt');
// const morgan = require('morgan');
const cookieParser = require('cookie-parser');
// const { response } = require('express');

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




//Connect Database for local develompent im MAMP
let conn = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"root",
    database:"myWorkTracker",
    port:8889
})


//Connect Database for Global Develompent in cleverCloud
// let conn = mysql.createConnection({
//     host:"bp2qffuyks8vhungamgb-mysql.services.clever-cloud.com",
//     user:"u0mtfkpltlezrzpw",
//     password:"8UwCtVlwGUFA17fVqfjK",
//     port:3306,
//     database:"bp2qffuyks8vhungamgb"

// })


conn.connect((err) =>{
    if(err) {
        console.log(err.message)
    }

    console.log("database connected");
})



app.get('/', (req,res) =>{
  

    if(req.session.user_id) {
        
        let sql = `select * , FORMAT(usersWage,2) as formatWage from users where userName = '${req.session.user_id}'`;
        // let sql = `select *, FORMAT(totalBreakTime,2) as formated from hours where userName='${req.session.user_id}'`
        conn.query(sql, (err,userRow) =>{
            if(err) {
                console.log(err.message);
            }

            let userId = userRow[0].userId;
            let usersWage = userRow[0].usersWage;
            let totalHours
            let totalEarned;
            let totalNet
            let usersDeduction = userRow[0].usersDeduction;
            // let sqlData = `select * from hours where userId=${userId}`
            // let sqlTotal = `select SUM(totalHour) as SumHours, DECIMAL((totalhour * ${usersWage}),2) as totalMoney from hours where userId=${userId} group by totalHour`;
            let sqlTotalHours = `select Format(SUM(totalHour),2) as SumHours from hours where userId=${userId};`; 
            
            conn.query(sqlTotalHours,(err,totalRows) =>{
                if(err) throw err;
                totalHours = totalRows[0].SumHours;
                let sqltotalMoney = `select Format((${totalHours} * ${usersWage}),2) as totalMoney;`

                conn.query(sqltotalMoney,(err,rows) =>{
                    if(err) throw err.message;
                    totalEarned = rows[0].totalMoney
                    totalNet = totalEarned - (totalEarned * usersDeduction)

                    let sqlData = `SELECT totalHour, hourId, userId, totalBreakTime, FORMAT((totalHour * ${usersWage} ),2) as totalEarned , dateAdded from hours where userId='${userId}'`
                    conn.query(sqlData,(err,rows) =>{
                     
                        if(err) throw err.message;
                        // res.send(rows)
                       
                        res.render('home', {session:req.session, model:rows, totalHours:totalHours, totalMoney:totalNet.toFixed(2)})
                    })
                })

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
        let sql =  `select userPassword from users where userName ='${username}'`;
            conn.query(sql, (err,rows) =>{
                if(err) throw err.message;

                if(rows.length > 0){
                    let hash = rows[0].userPassword;
                    bcrypt.compare(password,hash, (err,result) =>{
                        if(result) {
                            req.session.user_id = username;
                            res.redirect('/')
                        }

                        else{
                        
                            res.send("<script>alert(`UserName or password are incorrect`); window.location=`/`;</script>")
                        }
                       
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
                    if(req.body.deduction) {
                        // res.json("No Deduc")
                        let sql = `insert into users(userName, userPassword, usersWage, usersDeduction, userEmail) values ('${req.body.username}', '${hash}', ${req.body.wage}, ${req.body.deduction / 100}, '${req.body.email}')`
                        conn.commit(sql)

                    }
                    else{

                        let sql = `insert into users(userName, userPassword, usersWage, userEmail) values ('${req.body.username}', '${hash}', ${req.body.wage}, '${req.body.email}')`
                        conn.commit(sql)

                    }


                
                    // conn.query(sql,(err,rows) =>{
                    //     if(err) throw err.message;

                    res.send("<script>alert(`User has been created please log In`); window.location=`/`;</script>")
                    // })
                })


        }

    })

})

app.get('/UsersProfile',(req,res) =>{
    if(req.session.user_id) {
        let sql = `select Format(usersWage,2) as usersWage, userName, usersDeduction, userEmail from users where userName = '${req.session.user_id}'`;
        conn.query(sql, (err,rows) =>{
            if(err) throw err;

            res.render("userProfile", {usersInfo:rows})

        })

      
    }

    else{
        res.redirect('/')
    }
})

app.get('/EditProfile', (req,res) =>{
    //need to work on the udpate profile fucntion
    //TODO:when i update user i get an error i thin it is because i need to chance the cookie session to the new name variable
    if(req.session.user_id) {
        let sql = `select * from users where userName = '${req.session.user_id}'`;
        conn.query(sql,(err,rows) =>{
            if(err) throw err;

            res.render("editProfile", {model:rows})
        })

    }

    else{
        res.redirect('/')
    }
})

// app.post("/UpdateUserProfile", (req,res) =>{
//     if(req.session.user_id) {

//         let sqlUSer = `select userId from users where userName='${req.session.user_id}'`
//         conn.query(sqlUSer,(err,rows) =>{
//             if(err) throw err;
//             let sql = `update users set userName = '${req.body.username}', userEmail = '${req.body.email}', usersWage =${req.body.wage}, usersDeduction=${req.body.deduction} where userId = ${rows[0].userId}`;
//             req.session.user_id = req.body.username;
            
//             res.send("<script>alert(`User Info Updated`); window.location=`/`;</script>")

//         })
//     }else{
//         res.redirect('/')
//     }
    
// })

app.get('/logout', (req,res,next) =>{
 
        req.session.destroy();
        res.redirect('/')
})


app.get('/dropTable', (req,res,next) =>{
    if(req.session.user_id) {
        res.render("dropTable")
    }

    else{
        res.redirect('/')
    }
})


app.post('/dropAllData',(req,res,next) =>{
    if(req.session.user_id) {

        if(req.body.password) {
            let sql =  `select * from users where userName ='${req.session.user_id}'`;

            conn.query(sql, (err,rows) =>{
                if(err) throw err.message;

                if(rows.length > 0){
                    let hash = rows[0].userPassword;
                    bcrypt.compare(req.body.password,hash, (err,result) =>{
                        if(result) {
                            let sqlDrop = `delete from hours where userId=${rows[0].userId}`
                            conn.commit(sqlDrop);
                            res.redirect('/')
                            
                        }

                        else{
                        
                            res.send("<script>alert(`password is incorrect`); window.location=`/`;</script>")
                        }
                       
                    })
                }

                else{
                    res.send("<script>alert(`password is incorrect`); window.location=`/`;</script>")
                }

                
            })
        }

    }

    else{
        res.redirect('/')
    }
})




app.get('/addHour', (req,res,next) =>{
    if(req.session.user_id) {
        let sql = `select * from users where userName='${req.session.user_id}'`
        conn.query(sql,(err,rows) =>{
            if(err) throw err;
            res.render('addNewWorkHour');
        })

     
    }
    else{
        res.redirect('/')
    }
})




app.post('/addNewHour',(req,res,next) =>{
    let dateObj = new Date();
        let year = dateObj.getFullYear().toString().slice(-2)
        let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
        let date = ("0" + dateObj.getDate()).slice(-2);
        let AllDate = year + "/" + month + "/" + date

    if(req.session.user_id) {
        let sql = `select userId from users where userName = '${req.session.user_id}'`;
        conn.query(sql,(err,rows) =>{
            if(err) throw err;


            if(req.body.hours && req.body.breakTime) {
                if(req.body.type == "Hours"){
                    let sqlHours = `insert into hours (totalHour, totalBreakTime, userId, dateAdded) values (${req.body.hours - req.body.breakTime}, ${parseFloat(req.body.breakTime).toFixed(2)}, ${rows[0].userId}, '${AllDate}')`
                    // res.json(sqlHours)
                    conn.query(sqlHours,(err,rows) =>{
                        console.error("Eror in adding hours")
                        if(err) throw err.message
                    })
                    res.redirect('/')
    
                }
                
    
                else{
                    let totalMinutes = parseFloat(req.body.breakTime).toFixed(2) / 100
    
                    let sqlMinutes = `insert into hours (totalHour, totalBreakTime, userId, dateAdded) values (${req.body.hours - totalMinutes}, ${totalMinutes}, ${rows[0].userId}, '${AllDate}')`
                    conn.query(sqlMinutes, (err,rows) =>{
                        if(err) throw err;
                    })
                    res.redirect('/') 
                }             
            }
    
            else{
    
                let tiempoYmedio = 1.5;
    
                let sqlNoBreak = `insert into hours(totalHour, userId, dateAdded) values (${req.body.hours}, ${rows[0].userId}, '${AllDate}')`
                // if(req.body.hours > 5) {
                //     let timeExtra = req.body.hours - 5 
                //     let totalHourExtra = req.body.hours - timeExtra;
                //     // res.json(`${totalHours} x 8.50 + ${timeExtra} == ${totalHours * 8.50 } ${timeExtra} x ${tiempoYmedio * 8.50} == ${(totalHours * 8.50) + ((8.50 * tiempoYmedio) * timeExtra)}`)
                // }
                conn.query(sqlNoBreak,(err,rows) =>{
                    if(err) throw err.message;
    
    
                })
                res.redirect('/')
                // conn.query(sqlNoBreak,(err,rows) =>{
                //     if(err) throw err;
    
                // })
                // res.redirect('/')
    
                // res.json({
                //     Hours:req.body.hours,
                //     Break:"No Break"
    
                // })
    
            }

            
        })
        
        
    }

    else{
        res.redirect('/')
    }
}) 



app.get('/DeleteRow/:hourId/:userId',(req,res) =>{
    let sql = `delete from hours where hourId=${req.params.hourId} and userId =${req.params.userId}`
    conn.commit(sql)
    res.redirect('/')
})




const PORT = process.env.PORT


const port = process.env.PORT || 3000;

app.listen(port, (err) =>{
    if(err) throw err.message;
    console.log("Server running")
})