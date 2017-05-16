// app.js
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//var users= [];
var users = {};
//////////////

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

mongoose.connect("mongodb://admin:admin@ds137891.mlab.com:37891/chat", function (err) {
    if(err){
        console.log(err);
    }else{
        console.log('connected to mongodb');
    }
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {type: Date, default: Date.now()}
});

var Chat = mongoose.model('Message', chatSchema);
//////////////

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + "/public"));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
    console.log('one user join...');
////////////////////////

    Chat.find({}, function (err, docs) {
        if(err) {
            throw err;
        }
        console.log('sending old messages...');
        socket.emit('load history', docs);
    });

///////////////////
    socket.on('new user', function(data, callback){
        if (data in users){
            callback(false);
        }else{
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            io.sockets.emit('usersnames', Object.keys(users));
        }

        /*
        if (users.indexOf(data) != -1){
            callback(false);
        }else{
            callback(true);
            socket.nickname = data;
            users.push(socket.nickname);
            io.sockets.emit('usersnames', users);
        }
        */
    });

    socket.on('send messages', function (data, callback) {

        var msg = data.trim();

        if (msg.substr(0,3) ==='-p '){
            msg = msg.substr(3);
            var index = msg.indexOf(' ');
            if(index !== -1) {
                var sendTo = msg.substring(0, index);
                var privateMsg = msg.substring(index + 1);
                if (sendTo in users) {
                    users[sendTo].emit('privateMsg', {msg: privateMsg, nick: socket.nickname});
                    console.log('private message');
                }else{

                    callback("User does not exist! ");
                }

            }else{
                callback("Please enter your private message");
            }
        }else {

            var newMsg = new Chat({msg: msg, nick: socket.nickname});
            newMsg.save(function (err) {
                if(err) throw err;
                io.sockets.emit('broad', {msg: msg, nick: socket.nickname});
            });


            //io.sockets.emit('broad', {msg: data, nick: socket.nickname});

        }
    });

    socket.on('disconnetct', function(data){
        if (!socket.nickname) return;
        delete users[socket.nickname];
        //users.slice(users.indexOf(socket.nickname), 1);
        io.sockets.emit('usersnames', Object.keys(users));
    });



});


server.listen(4200);
console.log('Server has started!');
