var myID;
var allFiles;
var files = {};
var downfiles = {};
var socket = io.connect('http://${domain}');
//read the requested bytes
var reader;
var chunksize = 65536;


			socket.on('connect', function(data){
				console.log(socket.id);
				socket.emit('joiner');	
				});
			socket.on('yourID', function(data){
				myID=String(data);
				console.log(myID,typeof(myID));
				});
			socket.on('refreshFileList', function(data){
				console.log("incoming data");
				$('#fileslist').show();
				$('#clicky').html('');
				$('#clicky').hide();
				$('#fileslist').html('');
				$('#fileslist').html(function(i,v){
					return '<table id="filestable" cellspacing="0" summary=""><tr><th scope="col" abbr="Filename" class="nobg" width="60%">Filename</th><th scope="col" abbr="Status" width="20%" >Size</th> <th scope="col" abbr="Size"width="20%" >Action</th></tr>' + v;
					});

				allFiles = JSON.parse(data);
				fileList = allFiles['fileList'];
				console.log(fileList);
				for (var fID in fileList) {
				file = fileList[fID];
				if(!file)continue;
				if(fileList[fID].srcID==myID)
				{
				$('#filestable').append('<tr id="entry' + fID+ '"><th scope="row" class="spec">' + file.name + '</th><td>' + file.size + '</td><td class="end" ><div id="fidspan' + fID + '"></div>Transfer<a href="data:' + file.type + ';base64," target="_blank" id="fidsave' + fID + '" style="display:none">Save to disk!</a></td></tr>');
				}
				else
				{
					$('#filestable').append('<tr id="entry' + fID+ '"><th scope="row" class="spec">' + file.name + '</th><td>' + file.size + '</td><td class="end" ><div id="fidspan' + fID + '"></div><a href="" onclick="requestChunk(\'' + file.name + '\', ' + fID + ', ' + file.size + '); return false;" id="fid' + fID + '">Transfer</a><a href="data:' + file.type + ';base64," target="_blank" id="fidsave' + fID + '" style="display:none">Save to disk!</a></td></tr>');
				}

				}
			});



socket.on('peerDisconnected', function(clientID){
		cID = String(clientID);
		fileList = allFiles['fileList'];
		for (var fID in fileList) {
		var fspan = "#entry"+fID;
		console.log('fspan',fspan);
		if(!fileList[fID])continue;
		if(fileList[fID].srcID==cID){
		$(fspan).hide(500);
		fileList[fID]=null;
		}
		}
		console.log(fileList);
		});

/*
 ***************
 CHUNK  REQUEST
 ***************
 */
socket.on('chunkRequest', function(fid, chunkNo,rcpID){
		if(chunkNo == 0){
		$('#info').append("Begining Transfer..");
		}
		fname = allFiles['fileList'][fid].name;
		fileholder= files[fname];
		fileo= fileholder.f; //ugly
		console.log("transfer");
		console.log(fileo);
		start = chunkNo * chunksize;

		if((parseInt(fileholder.size) - 1) <= start + chunksize - 1){
		stop = parseInt(fileholder.size) - 1;
		}
		else{
		stop = start + chunksize - 1;
		}

		// If we use onloadend, we need to check the readyState.
		reader.onloadend = function(evt) {
		if (evt.target.readyState == FileReader.DONE) { // DONE == 2
			console.log("sending chunk");
			var data = evt.target.result;
			socket.emit('chunkTransfer', data, fid, chunkNo+1,rcpID);
		}
		};

		if (fileo.slice) {
			var blob = fileo.slice(start, stop + 1);
		} else if (fileo.mozSlice) {
			var blob = fileo.mozSlice(start, stop + 1);
		}
		else if(fileo.webkitSlice){
			var blob = fileo.webkitSlice(start,stop+1);
		}
		else{
			alert("It won't work in your browser. Please use Chrome or Firefox.");
		}
		reader.readAsBinaryString(blob);
});

/*
 **********************
 CHUNK  TRANSFER
 ***********************
 */
socket.on('chunkTransfer', function(data, fid, chunk){
		//console.log(downfiles[fid]);
		f = downfiles[fid];
		f.data = f.data + data;
		//console.log(chunk);
		//console.log(f.chunks);
		if(f.chunks == chunk){
		console.log("finished");
		var fspan = "#fidspan" + f.fid;
		$(fspan).html('');
		$(fspan).hide();

		var fsave = "#fidsave" + f.fid;
		$(fsave).show();
		$(fsave).attr('href', $(fsave).attr('href') + encode64(f.data));
		$('#info').append("Transfer finished!");

		}
		else{
		console.log("next CHUNK");
		var fspan = "#fidspan" + f.fid;
		$(fspan).html(Math.floor(((chunk/f.chunks) * 100)) + '%');
		var nextchunk = parseInt(chunk);
		socket.emit('chunkRequest', fid, nextchunk,myID);
		}
});

/*
 **********************
 START TRANSFER
 **********************
 */
function requestChunk(file, fid, size){
	if(!allFiles['fileList'][fid])return;
	console.log(file,fid,size);
	var f = "#fidspan" + fid;
	$(f).html('0%');
	f = "#fid" + fid;
	$(f).hide();

	var chunks = size/chunksize;
	if(chunks% 1 != 0){
		chunks = Math.floor(chunks) + 1;
	}

	downfiles[fid] = {data:'', chunk:0, chunks:chunks, fid:fid};
	console.log(downfiles[fid]);
	socket.emit('chunkRequest', fid, 0, myID);
};


/*
 *****************
 FILE ENTRY OBJECT
 *****************
 */
function fileEntry(f){
	this.srcID=myID;
	console.log(this.srcID,typeof(this.srcID));
	this.name=f.name;
	this.size=f.size;
	this.type=f.type;
	this.f=f;
	return this;
}

/*
 *********************
 FILE SELECT
 *********************
 */
function handleFileSelect(evt) {
	console.log("file select");	
	var newFiles={};
	// Loop through the FileList and append files to list.
	var viles = evt.target.files; // FileList object
	//console.log(viles);
	// Loop through the FileList and append files to list.
	for (var i = 0, f; f = viles[i]; i++) {
		if (!files.hasOwnProperty(f)) {
			files[f.name] =  new fileEntry(f);
			newFiles[f.name] = new fileEntry(f);
		};
	}
	console.log(files);
	socket.emit('listfiles', JSON.stringify(newFiles));

};

document.getElementById('files').addEventListener('change', handleFileSelect, false);

var keyStr = "ABCDEFGHIJKLMNOP" +
"QRSTUVWXYZabcdef" +
"ghijklmnopqrstuv" +
"wxyz0123456789+/" +
"=";

function encode64(input) {
	var output = "";
	var chr1, chr2, chr3 = "";
	var enc1, enc2, enc3, enc4 = "";
	var i = 0;

	do {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}

		output = output +
			keyStr.charAt(enc1) +
			keyStr.charAt(enc2) +
			keyStr.charAt(enc3) +
			keyStr.charAt(enc4);
		chr1 = chr2 = chr3 = "";
		enc1 = enc2 = enc3 = enc4 = "";
	} while (i < input.length);

	return output;
}
