
/**
 * Module dependencies.
 */

var express = require('express')
  , socketio = require('socket.io')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var allowCrossDomain = function(req, res, next) {
     res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
};

app.configure(function() {
    app.use(allowCrossDomain);
});


var server = app.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var io = socketio.listen(server, {origins: '*'});
io.set("origins","*:*");

io.set('transports', ['xhr-polling']);

var clients = {};
var socketsOfClients = {};
var clientStatus = {}; // 1: available, 2 not available

io.sockets.on('connection', function(socket) {
  socket.on('set username', function(userName) {
    // Is this an existing user name?
	console.log(userName);
//    if (clients[userName] === undefined) {
      // Does not exist ... so, proceed
      clients[userName] = socket.id;
  	  clientStatus[userName] = 1;
      socketsOfClients[socket.id] = userName;
      userNameAvailable(socket.id, userName);
	  userJoined(userName);
//    } else
//    if (clients[userName] === socket.id) {
//      // Ignore for now
//    } else {
//      userNameAlreadyInUse(socket.id, userName);
//    }
  });

  socket.on('message', function(message) {
	var msg = JSON.parse(message);
	console.log(JSON.stringify(msg));
	var dataToSend = {};
	dataToSend["notice"] = "message";
	dataToSend["data"] =   msg;
    if (msg.target == "All") {
      // broadcast
      io.sockets.emit('message',
    		  dataToSend);
    } else {
      // Look up the socket id
    	
      io.sockets.sockets[clients[msg.target]].emit('message', 
    		  dataToSend);
    }
    setTimeout(function() {
		delete dataToSend;
	}, 100);
  });

  socket.on('disconnect', function() {
	  var uName = socketsOfClients[socket.id];
	  delete socketsOfClients[socket.id];
    delete clients[uName];
	// relay this message to all the clients
	userLeft(uName);
  });
});

function userJoined(uName) {
	var dataToSend = {};
	dataToSend["notice"] = "userJoined";
	dataToSend["data"] =  { "userName": uName };
	Object.keys(socketsOfClients).forEach(function(sId) {
		io.sockets.sockets[sId].emit('userJoined', dataToSend);
	});
	setTimeout(function() {
		delete dataToSend;
	}, 100);
}

function userLeft(uName) {
	var dataToSend = {};
	dataToSend["notice"] = "userLeft";
	dataToSend["data"] =  { "userName": uName };
    io.sockets.emit('userLeft',dataToSend);
    setTimeout(function() {
	    delete dataToSend;
    }, 100);
}

function userNameAvailable(sId, uName) {
  setTimeout(function() {
    console.log('Sending welcome msg to ' + uName + ' at ' + sId);
    var availableUsers = new Array();
    Object.keys(clients).forEach(function(playerName){
    	if(clientStatus[playerName] == 1) {
    		availableUsers.push(playerName); 
    	}
    }) ;
    var dataToSend = {};
    dataToSend["notice"] = "allAvailableUsers";
    dataToSend["data"] = { "userName" : uName, "currentUsers": JSON.stringify(availableUsers)};
    
    io.sockets.sockets[sId].emit('welcome',  dataToSend);
    setTimeout(function() {
	    delete availableUsers;
	    delete dataToSend;
    }, 100);
  }, 500);
}

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    io.sockets.sockets[sId].emit('error', { "userNameInUse" : true });
  }, 500);
}
