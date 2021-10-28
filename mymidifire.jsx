function setting1(){
	var window = new Window("dialog", "MidiFire");
	var parentGroup = window.add("group");
	parentGroup.orientation = 'column';

	// -- midipath --
	var midiPathGroup = parentGroup.add("group");
	midiPathGroup.orientation = 'row';
	var midiPathText = midiPathGroup.add("statictext",undefined,"");
	midiPathText.characters = 20;
	var midiLoader = midiPathGroup.add('button',undefined, '...');
	midiLoader.onClick= function () {
		midiPath = File.openDialog("Select Midi file", "*.mid")
		midiPathText.text= midiPath;
	}
	// ----

	var executeButton = parentGroup.add("button",undefined, "Load");
	executeButton.onClick = function(){
		window.close();
		loadMidi(midiPathText.text);
	}

	window.center();
	window.show();
}

function readFile(path)
{
	var f = new File(path);
	f.encoding = "BINARY";

	f.open ("r");
	var length = f.length;
	var result = f.read(length);
	f.close();
	return result;
}

function loadMidi(path){
	var file = readFile(path);
	var foralert = ""
	var trackNum = file.charCodeAt(0x0b);
	foralert += trackNum;
	var itr = 0x12;
	var tracks = new Array();
	for (var i = 0; i < trackNum; i++) {
		var length = getBinaryNum(file, itr, itr + 4);
		alert(length);
		tracks.push(file.substring(itr + 8, itr + length + 4));
		itr += length + 8;
	};
	alert(tracks[0]);
	alert(foralert);
	for (var i in tracks) {
		var t = 0;
		for (var j=0, len=tracks[i].length; j < len;) {
			if( tracks[i].charCodeAt(j) & 0x80  != 0){
			  t += getBinaryNum(tracks, j, j + 2) - 0xf000;
			  j += 2;
			}
			else{
			  t += getBinaryNum(tracks, j, j + 1);
			  j++;
			}
			  
		};
	  
	};
}

function getBinaryNum(file, start, end){
	var l = 0;
	for (var i = start; i < end; i++) {
		l <<= 8;
		l |= file.charCodeAt(i);;
	};
	return l;
}


setting1();

