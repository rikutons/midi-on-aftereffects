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
		onLoadButtonClicked(midiPathText.text);
	}

	window.center();
	window.show();
}

class MidiReader{
	getStr(isTrack) {
		if (isTrack)
			return this.tracks[this.trackIndex];
		else
			return this.file;
	}

	getNum(length, isTrack = false) {
		var str = this.getStr(isTrack);
		var ret = 0;
		for (var i = 0; i < length; i++) {
			ret <<= 8;
			ret |= this.file.charCodeAt(this.index + i);
		}

		return ret;
	}

	getFlexibleNum(isTrack = false) {
		var num;
		if (this.getNum(1, isTrack) & 0x80 != 0) {
			num = getNum(2, isTrack) - 0xf000;
			this.index += 2;
		}
		else {
			num = getNum(1, isTrack);
			this.index++;
		}
		return num;
	}

	constructor() {
		this.file = "";
		this.tracks = [];
		this.trackNum = -1;
		this.trackIndex = 0;
		this.index = 0;
	}

	load(path) {
		var f = new File(path);
		f.encoding = "BINARY";

		f.open("r");
		var length = f.length;
		this.file = f.read(length);
		f.close();
	}

	divideTracks() {
		index = 0x12;
		for (var i = 0; i < trackNum; i++) {
			var length = getNum(4);
			alert(length);
			this.tracks.push(file.substring(index + 8, index + length + 4));
			index += length + 8;
		}
	}

	// WIP
	readLayerNames() {
		for (var i in tracks) {
			var t = 0;
			for (var j = 0, len = tracks[i].length; j < len;) {
				var dt;
				[dt, j] = getFlexibleNum(tracks[i], j);
				t += dt;

				var event = tracks[i].charCodeAt(j);
				j++;
				if (event == 0xf0 || event == 0xf7) {
					var length = this.getFlexibleNum(true);
					alert("SysEx");
				}
			}
		}
	}
}

// main
var midiReader;
setting1();

// main 2(When Load button Pushed)
function onLoadButtonClicked(path) {
	midiReader = new MidiReader();
	midiReader.load(path);
}

// main 3(When Track selected)
function onSelectButtonClicked() {
	
}