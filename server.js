// Requirements

var app = require('express').createServer()
, express = require('express')
, io = require('socket.io').listen(app)
, jqtpl = require("jqtpl");


// Load the config file
var config = require('config').Server;
io.set('log level', 1);

// App Stuff
app.use('/public', express.static(__dirname + '/public'));
app.listen(config.port);
app.set("view engine", "html");
app.set("view options", {layout: false});
app.register(".html", require("jqtpl").express);


app.get('/', function (req, res) {
	res.render (__dirname + '/index', {domain: config.siteDomain});
});
var allFiles = {};

var fileCount=0;
var socketConnections={};
var rooms={};

function newRm(name,pass){
	this.rmName=name;
	this.rmPass=pass;
	this.clientCtr
}
// P2P Stuff
io.sockets.on('connection', function (clientSocket) {
	
	clientSocket.on('createRm', function (name,password) {
		var rmName = String(name);
		var rmPass = String(password);
		if(!rmPass)rmPass=rmName;
		console.log(rmName,rmPass);
		if(rooms[rmName]){
			clientSocket.emit('occupied');
			return;
		}
		allFiles[rmName]=[];
		rooms[rmName]=rmPass;
		clientSocket.join(rmName);
		clientSocket.room = rmName;
		clientSocket.emit('yourID',clientSocket.id);
		socketConnections[clientSocket.id]=clientSocket;
		clientSocket.emit('refreshFileList',JSON.stringify(allFiles[rmName]));
		
		//console.log(socketConnections);	
	});
	
	
	clientSocket.on('loginRm',function(name,password){
		var rmName = String(name);
		var rmPass = String(password);
		if(!rmPass)rmPass=rmName;

		console.log(rmName,rmPass);
		if(rooms[rmName]){
			if(rooms[rmName]==rmPass){
				clientSocket.join(rmName);
				clientSocket.room = rmName;
				clientSocket.emit('yourID',clientSocket.id);
				socketConnections[clientSocket.id]=clientSocket;
				clientSocket.emit('refreshFileList',JSON.stringify(allFiles[rmName]));
				return;
				}
			else
			{
				clientSocket.emit('wrongPass');
			}
		}
		else clientSocket.emit('notFound');
	});
	
	
	clientSocket.on('disconnect', function(){
		var rm = clientSocket.room;
		io.sockets.in(clientSocket.room).emit('peerDisconnected',clientSocket.id);
		for(var fID in allFiles[clientSocket.room]){
			if(!allFiles[clientSocket.room][fID])continue;
			if(allFiles[clientSocket.room][fID].srcID == clientSocket.id){
				allFiles[clientSocket.room][fID]=null;
			}
		}
		console.log(allFiles[clientSocket.room]);
		clientSocket.leave(clientSocket.room);
		var cccc = io.sockets.clients(clientSocket.room);
		if (cccc.length==0){
			rooms[rm]="";
			console.log("closing room");
}
	});
	
	clientSocket.on('listfiles', function (data) {
		obj = JSON.parse(data);
		for(variables in obj){
			allFiles[clientSocket.room].push(obj[variables]);
			//console.log(allFiles[clientSocket.room]);
		}
		io.sockets.in(clientSocket.room).emit('refreshFileList',JSON.stringify(allFiles[clientSocket.room]));
		console.log(allFiles[clientSocket.room]);
	});
	
	
	clientSocket.on('chunkRequest', function (fid,chunkNo,rcpID) {
		var sID=allFiles[clientSocket.room][JSON.parse(fid)].srcID;
		//console.log(typeof(sID));
		//console.log(rcpID);
		var fileOwner=socketConnections[sID];
		fileOwner.emit('chunkRequest',fid,chunkNo,rcpID);
		
	});
	
	clientSocket.on('chunkTransfer', function (data, fid, chunkNo,rcpID) {
		var rID=String(rcpID);
		//console.log(rID);
		var fileReceipent = socketConnections[rID];
		fileReceipent.emit('chunkTransfer', data, fid, chunkNo);
	});
	
});


