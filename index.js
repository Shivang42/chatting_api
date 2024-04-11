const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const app = express();
const cookieParser = require('cookie-parser');
const httpserver = http.createServer(app);
const iosocket = new Server(httpserver, { cors: { origin: "*" } });

let activeuser = [];
app.use(cookieParser());
app.use(cors());
app.use(express.static('/serve'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');
app.get('/', (req, res, next) => {
    if (!req.cookies.userid) {
        let newid = (Math.random() * 50000).toFixed(0);
        res.cookie('userid', newid, { maxAge: 24 * 60 * 60 * 10 });
        res.render('dashboard', { uid: newid });
    }
    else {
        console.log(req.cookies.userid);
        res.render('dashboard', { uid: req.cookies.userid });
    }
    activeuser.push(req.cookies.userid);
    activeuser = new Set(activeuser);
    activeuser = Array.from(activeuser);
});
app.get('/register', (req, res, next) => {
    // let newid = (Math.random()*50000).toFixed(0);
    let newuser = req.query.id;
    if (!newuser) {
        res.send(JSON.stringify({ status: 'failure', uid: newuser }));
    }
    if (!activeuser.find((ele) => ele.uname === newuser)) {
        activeuser.push(newuser);
        activeuser = new Set(activeuser);
        activeuser = Array.from(activeuser);
        res.send(JSON.stringify({ status: 'success', uid: newuser }));
        console.log(`------->Registration successfully<-----------`);
    }
    else {
        res.send(JSON.stringify({ status: 'exists', uid: newuser }));
    }
    console.log(activeuser.map((au) => au.id));
});

app.get('/finduser', (req, res) => {
    if (!req.query.sterm) {
        res.send(JSON.stringify({ status: 'failure', matches: [] }));
        res.end();
    }

    let sregex = `^${req.query.sterm}[a-zA-Z0-9]+`;
    sregex = (new RegExp(sregex, 'g'));
    let users = activeuser.filter((auser) => sregex.exec(auser.uname));

    res.send(JSON.stringify({ status: 'success', matches: users }));
});

iosocket.on('connection', (socket) => {
    socket.on('hey', (uid,friends) => {
        if (!activeuser.find((u) => u.uname == uid)) {
            activeuser.push({ id: socket.id, uname: uid });
            console.log(`uid:: ${uid}`);
            console.log(`${activeuser.map((au)=>au.uname).toString()} : asers`);
            activeuser.forEach((auser)=>{
                if(friends.findIndex((ufr)=>auser.uname===ufr)>=0){
                    iosocket.to(auser.id).emit("nigg",uid,true);
                }
            });
        }
        console.log(`${activeuser.map((au)=>au.uname).toString()} : active users`)
    });
    
    socket.on('chatmess', (chat) => {
        let message = chat;
        // console.log(message.to);
        // console.log(activeuser);
        // console.log(activeuser.find((auser)=>((auser)==(message.to))));
        let auser = activeuser.find((auser) => ((auser.uname) == (message.to)));
        if (auser) {
            //The recipient is active
            socket.emit('sent', 'yes');
            //Problematic:- convert this to private messaging'
            console.log(`---<>---`);
            console.log(`Sent to: ${auser.id}`);
            iosocket.to(auser.id).emit('servechat', chat);
            // iosocket.emit('servechat',chat);
        }
        else {
            socket.emit('sent', 'no');
        }
    });
    socket.on('nudge', (nfriends) => {
        if (nfriends) {
            let aids = activeuser.map((auser) => auser.uname);
            let status = nfriends.fids.map((nfr) => ({ uname: nfr, active: (aids.findIndex((aid) => aid === nfr) > -1) }));
            iosocket.to(nfriends.sid).emit('status', status);
        }
    });
    socket.on('ruser', (user) => {
        let ind = activeuser.findIndex((auser) => ((auser.uname) == (user.uid)));
        console.log(`Removed: ${ind}`);
        if (ind >= 0) {
            activeuser = activeuser.slice(0,ind).concat(activeuser.slice(ind+1));
            activeuser.forEach((auser)=>{
                if(user.friends.findIndex((ufr)=>auser.uname===ufr.id)>=0){
                    iosocket.to(auser.id).emit("nigg",user.uid,false);
                }
            })
        }
        console.log(`${activeuser.map((au)=>au.uname).toString()} : active users`);
    });
    socket.on("friends",(frlist,uid,sid,flag)=>{
        // console.log(`found ===>${frlist.findIndex((fr)=>fr.id===uid)}`);
        let ind = frlist.findIndex((fr)=>fr.id===uid);
        if(ind>=0){
            frlist[ind].active = flag;
        }
        iosocket.to(sid).emit("status",frlist);
    });
    socket.on('suser', (user) => {
        console.log(activeuser.indexOf(user));
        if (activeuser.indexOf(user) >= 0) {
            console.log(activeuser);
            console.log(`user: ${user}`);
            socket.emit("found", user);
        }
        else {
            console.log(user in activeuser);
            console.log(activeuser);
            console.log(`user: ${user}`);
            socket.emit("found", "none");
        }
    });
    console.log('user was connected');
});

httpserver.listen(3000, (err) => {
    console.log('Listening ...');
})