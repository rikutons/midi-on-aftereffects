var encoding = require('encoding-japanese');
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

function setting2(trackNames) {
	var window = new Window("dialog", "MidiFire");
	var parentGroup = window.add("group");
	parentGroup.orientation = 'column';

	// -- track --
	var trackGroup = parentGroup.add("group");
	trackGroup.orientation = 'row';
	var trackText = trackGroup.add("statictext", undefined, "track: ");
	var trackDropDownList = trackGroup.add("dropdownlist", undefined, trackNames);

	// -- item --
	var itemNames = [];
	var items = [];
	for (var i = 1; i <= app.project.items.length; i++) {
		if(app.project.items[i] instanceof FootageItem || app.project.items[i] instanceof CompItem){
			itemNames.push(app.project.items[i].name);
			items.push(app.project.items[i]);
		}
	}
	var itemGroup = parentGroup.add("group");
	itemGroup.orientation = 'row';
	var itemText = itemGroup.add("statictext", undefined, "item: ");
	var itemDropDownList = itemGroup.add("dropdownlist", undefined, itemNames);

	// -- offset --
	var offsetGroup = parentGroup.add("group");
	offsetGroup.orientation = 'row';
	offsetGroup.add("statictext", undefined, "offset: ");
	var offsetEditText = offsetGroup.add("edittext", undefined, "0");
	offsetGroup.add("statictext", undefined, "[beats]");

	var executeButton = parentGroup.add("button", undefined, "Start");
	executeButton.onClick = function () {
		window.close();
		onSelectButtonClicked(trackDropDownList.selection.index, items[itemDropDownList.selection.index]);
		onSelectButtonClicked(trackDropDownList.selection.index, items[itemDropDownList.selection.index], offsetEditText.text);
	}

	window.center();
	window.show();
}

class MidiReader {
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
			ret |= str.charCodeAt(this.index + i);
		}
		this.index += length;

		return ret;
	}

	getFlexibleNum(isTrack = false) {
		var num = this.getNum(1, isTrack);
		var ret = (num & 0x7f);
		while(num >= 0x80){
			num = this.getNum(1, isTrack);
			ret = ret << 7 | (num & 0x7f);
		}
		return ret;
	}

	constructor() {
		this.file = "";
		this.tracks = [];
		this.trackNames = [];
		this.trackNum = -1;
		this.trackIndex = 0;
		this.index = 0;
		this.resolution = 0;
		this.tempo = [];
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
		this.index = 0x0B;
		this.trackNum = this.getNum(1, false);
		this.index = 0x12;
		for (var i = 0; i < this.trackNum; i++) {
			var length = this.getNum(4);
			this.tracks.push(this.file.substring(this.index, this.index + length));
			this.index += length + 4;
		}
	}

	readInfo() {
		this.index = 0x0C;
		this.resolution = this.getNum(2);
		for (this.trackIndex = 0; this.trackIndex < this.trackNum; this.trackIndex++) {
			var t = 0;
			this.index = 0;
			// alert("track: " + this.trackIndex);
			while(this.index < this.tracks[this.trackIndex].length) {
				t += this.getFlexibleNum(true);

				var event = this.getNum(1, true);
				// SysEx Event
				if (event == 0xf0 || event == 0xf7) {
					var length = this.getFlexibleNum(true);
					this.index += length;
					if (event == 0x70)
						this.index++;
				}
				// Meta Event
				else if (event == 0xFF) {
					var eventType = this.getNum(1, true);
					var length = this.getFlexibleNum(true);
					// alert("eventType" + eventType.toString(16));
					switch (eventType) {
						// Sequence/Track Name
						case 0x03:
							var sjisText = this.getStr(true).substring(this.index, this.index + length);
							var text = encoding.convert( sjisText, "UNICODE", "SJIS");
							this.trackNames.push(text);
							this.index += length;
							break;
						// Set Tempo
						case 0x51:
							this.tempo.push({t: t, tempo: this.getNum(3, true)});
							$.writeln("t: " + this.tempo[this.tempo.length - 1].t)
							$.writeln("tempo: " + this.tempo[this.tempo.length - 1].tempo);
							break;
						default:
							this.index += length;
							break;
					}
				}
				// MIDI Event
				else {
					// Adapt Runnning-Status-Rule
					if(event < 0x80)
						this.index++;
					else
						this.index += 2;
				}
			}
		}
	}

	getTrackNames(){
		return this.trackNames;
	}

	readTimings(trackIndex, offsetBeat) {
		var t = 0;
		var beforeEventTop;
		var offset = this.getSecond(offsetBeat * this.resolution);
		this.index = 0;
		this.trackIndex = trackIndex;
		var timings = [];
		while(this.index < this.tracks[this.trackIndex].length) {
			t += this.getFlexibleNum(true);
			$.writeln("t: " + t);

			var event = this.getNum(1, true);
			$.writeln("event: " + event.toString(16));
			if (event == 0xf0 || event == 0xf7) {
				var length = this.getFlexibleNum(true);
				this.index += length;
				if (event == 0x70)
					this.index++;
			}
			// Meta Event
			else if (event == 0xFF) {
				this.index++; // Discard event type
				var length = this.getFlexibleNum(true);
				this.index += length;
			}
			// MIDI Event
			else {
				var top = event >> 4;
				if(top < 0x8){
					top = beforeEventTop;
					this.index--;
					$.writeln("event top to: " + top.toString(16));
				}
				switch(top){
					case 0x8: // Note Off
					case 0xA: // Polyphonic Key Pressure
					case 0xB: // Controll Change
					case 0xE: // Pitch Bend
						this.index += 2;
						break;
					case 0xC: // Program Change
					case 0xD: // Channel Pressure
						this.index++;
						break;
					// Note On
					case 0x9:
						this.index++;
						var velocity = this.getNum(1, true);
						if(velocity == 0)
							break;
						var s = this.getSecond(t) - offset;
						if(s < 0)
							break;
						$.writeln("s: " + s);
						timings.push(s);
						break;
				}
				beforeEventTop = top;
			}
		}
		return timings;
	}

	getSecond(t) {
		var s = 0;
		for (var i = 0; i < this.tempo.length; i++) {
			if(i + 1 == this.tempo.length || t < this.tempo[i + 1].t){
				s += (t - this.tempo[i].t) * this.tempo[i].tempo;
				break;
			}
			else{
				s += (this.tempo[i + 1].t - this.tempo[i].t) * this.tempo[i].tempo;
			}
		}
		return s / 1000000.0 / this.resolution;
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
	midiReader.divideTracks();
	midiReader.readInfo();
	var trackNames = midiReader.getTrackNames();
	setting2(trackNames);
}

// main 3(When Track selected)
function onSelectButtonClicked(trackIndex, item, offset) {
	var timings = midiReader.readTimings(trackIndex, offset);
}