var express = require('express');
var cors = require('cors');

var bodyparser = require('body-parser');
var cookieParser = require('cookie-parser')
var userRouter = require('./user-routes.js');
var session = require('express-session')
var app = express();

app.use(cors());

var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;

app.use(bodyparser.urlencoded({
    extended:true
}));

app.use(cookieParser());
app.use(bodyparser.json());
app.use(session({secret: 'keyboard cat'}));
app.use(passport.initialize());
 app.use(passport.session());


app.use('/user',userRouter);

app.listen(2000,function(){
    console.log('Listening on port 2000')
});