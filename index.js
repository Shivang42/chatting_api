const express = require('express');
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const app = express();
const cookieParser = require('cookie-parser');
const httpserver = http.createServer(app);
const iosocket = new Server(httpserver,{cors:{origin:"*"}});

let activeuser = [];
app.use(cookieParser());
app.use(cors());
app.use(express.static('/serve'));
app.set('view engine','ejs');
app.set('views',__dirname+'/templates');
app.get('/',(req,res,next)=>{
    if(!req.cookies.userid){
        let newid = (Math.random()*50000).toFixed(0);
        res.cookie('userid',newid,{maxAge:24*60*60*10});
        res.render('dashboard',{uid:newid});
    }
    else{
        console.log(req.cookies.userid);
        res.render('dashboard',{uid:req.cookies.userid});
    }
    activeuser.push(req.cookies.userid);
    activeuser = new Set(activeuser);
    activeuser = Array.from(activeuser);
});
app.get('/register',(req,res,next)=>{
    let newid = (Math.random()*50000).toFixed(0);
    activeuser.push(newid);
    activeuser = new Set(activeuser);
    activeuser = Array.from(activeuser);
    res.send(JSON.stringify({status:'success',uid:newid}));
    console.log(`------->Registration successfully<-----------`);
console.log(activeuser);
});
app.get('/finduser',(req,res,next)=>{
    // res.writeHead(200,
    //     {'content-type':'application/json'});
    if(!req.query.sterm){
        res.send(JSON.stringify({status:'failure',matches:[]}));
        res.end();
    }
  
    let sregex = `^${req.query.sterm}[a-zA-Z0-9]+`;
    sregex = (new RegExp(sregex,'g'));
    let users = activeuser.filter((auser)=>sregex.exec(auser));

    res.send(JSON.stringify({status:'success',matches:users}));
});
iosocket.on('connection',(socket)=>{
    console.log('sdfds');
socket.on('hey',(uid)=>{
    if(!activeuser.find((u)=>u==uid)){
        activeuser.push(uid);
    }
    console.log(`Active Users: ${activeuser}`)});
    socket.on('chatmess',(chat)=>{
        let message = chat;
        // console.log(message.to);
        // console.log(activeuser);
        // console.log(activeuser.find((auser)=>(parseInt(auser)==parseInt(message.to))));
        if(activeuser.find((auser)=>(parseInt(auser)==parseInt(message.to)))){
            //The recipient is active
            socket.emit('sent','yes');
            //Problematic:- convert this to private messaging'
            console.log(`---<>---`);
            iosocket.emit('servechat',chat);
        }
        else{
            socket.emit('sent','no');
        }
    });
    socket.on('ruser',(user)=>{
        let ind = activeuser.findIndex((auser)=>(parseInt(auser)==parseInt(user)));
        console.log(`Removed: ${ind}`);
        if(ind>=0){
            activeuser = activeuser.splice(ind);
            console.log(activeuser);
            console.log(`user: ${user}`);
        }
    });
    socket.on('suser',(user)=>{
        console.log(activeuser.indexOf(user));
        if(activeuser.indexOf(user)>=0){
            console.log(activeuser);
            console.log(`user: ${user}`);
            socket.emit("found",user);
        }
        else{
            console.log(user in activeuser);
            console.log(activeuser);
            console.log(`user: ${user}`);
            socket.emit("found","none");
        }
    });
    console.log('user was connected');
});

httpserver.listen(3000,(err)=>{
    console.log('Listening ...');
})