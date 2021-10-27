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
	var hex = "";
	var foralert = "";
	for (var i = 0; i < file.length; i++) {
	  var n = file.charCodeAt(i);
	  hex += ('00' + n.toString(16)).slice(-2);
	};
	foralert += hex.substr(0, 20);
	foralert += "format: " + file.substr(8, 10) + "\n";
	alert(foralert);
}


setting1();

