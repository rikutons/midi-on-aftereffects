var encoding = require('encoding-japanese');
var gFileName = "";
function setting1(){
	var window = new Window("dialog", "MidiFire");
	var parentGroup = window.add("group");
	parentGroup.orientation = 'column';
	var midiPath = "";

	// -- midipath --
	var midiPathPanel = parentGroup.add("panel", undefined, "Midi Setting");
	midiPathPanel.add("statictext",undefined,"Select .midi File");
	var midiPathGroup = midiPathPanel.add("group");
	midiPathGroup.orientation = 'row';
	var midiPathText = midiPathGroup.add("statictext",undefined,"");
	midiPathText.characters = 20;
	var midiLoader = midiPathGroup.add('button',undefined, '...');
	midiLoader.onClick= function () {
		midiPath = File.openDialog("Select Midi file", "*.mid")
		gFileName = midiPath.displayName;
		midiPathText.text = midiPath.displayName;
	}
	// ----

	var buttonGroup = parentGroup.add("group");
	buttonGroup.orientation = 'row';
	buttonGroup.alignment = "right";
	var executeButton = buttonGroup.add("button",undefined, "Load");
	executeButton.onClick = function(){
		window.close();
		onLoadButtonClicked(midiPath);
	}

	window.center();
	window.show();
}

function setting2(trackNames) {
	var textSize = [0, 0, 100, 20];
	var editBoxSize = [0, 0, 60, 20];
	var bigEditBoxSize = [0, 0, 240, 20];
	var window = new Window("dialog", "MidiFire");
	var parentGroup = window.add("group");
	parentGroup.orientation = 'column';
	parentGroup.alignChildren = 'left';

	var midiPanel = parentGroup.add("panel", undefined, "Midi Setting");
	midiPanel.orientation = "column";

	// -- name --
	var nameGroup = midiPanel.add("group"); 
	nameGroup.alignment = "left";
	nameGroup.add("statictext", textSize, "name:");
	nameGroup.add("statictext", undefined, gFileName);

	// -- track --
	var trackGroup = midiPanel.add("group");
	trackGroup.alignment = "left";
	trackGroup.add("statictext", textSize, "track: ");
	var trackDropDownList = trackGroup.add("dropdownlist", undefined, trackNames);

	// -- offset --
	var offsetGroup = midiPanel.add("group");
	offsetGroup.alignment = "left";
	offsetGroup.add("statictext", textSize, "offset: ");
	var offsetEditText = offsetGroup.add("edittext", editBoxSize, "0");
	offsetGroup.add("statictext", undefined, "[beats]");

	// -- note range --
	var noteGroup = midiPanel.add("group");
	noteGroup.alignment = "left";
	noteGroup.add("statictext", textSize, "note range: ");
	noteGroup.add("statictext", undefined, "min: ");
	var noteMinEditText = noteGroup.add("edittext", editBoxSize, "0");
	noteGroup.add("statictext", undefined, "max: ");
	var noteMaxEditText = noteGroup.add("edittext", editBoxSize, "255");

	var compPanel = parentGroup.add("panel", undefined, "New Composition Setting");
	compPanel.orientation = "column";
	// -- item --
	var itemNames = [];
	var items = [];
	for (var i = 1; i <= app.project.items.length; i++) {
		if(app.project.items[i] instanceof FootageItem || app.project.items[i] instanceof CompItem){
			itemNames.push(app.project.items[i].name);
			items.push(app.project.items[i]);
		}
	}
	var itemGroup = compPanel.add("group");
	itemGroup.alignment = "left";
	itemGroup.add("statictext", textSize, "item: ");
	var itemDropDownList = itemGroup.add("dropdownlist", undefined, itemNames);

	// -- comp name --
	var compNameGroup = compPanel.add("group");
	compNameGroup.alignment = "left";
	compNameGroup.add("statictext", textSize, "comp name: ");
	var compNameEditText = compNameGroup.add("edittext", bigEditBoxSize, "");
	trackDropDownList.onChange = function () {
		compNameEditText.text = trackDropDownList.selection;
	}

	// -- comp size --
	var compSizeGroup = compPanel.add("group");
	compSizeGroup.alignment = "left";
	compSizeGroup.add("statictext", textSize, "comp size: ");
	compSizeGroup.add("statictext", undefined, "width: ");
	var compWidthEditText = compSizeGroup.add("edittext", editBoxSize, 1920);
	compSizeGroup.add("statictext", undefined, "height: ");
	var compHeightEditText = compSizeGroup.add("edittext", editBoxSize, 1080);

	// -- comp fps --
	var compfpsGroup = compPanel.add("group");
	compfpsGroup.alignment = "left";
	compfpsGroup.add("statictext", textSize, "comp fps: ");
	var compFpsEditText = compfpsGroup.add("edittext", editBoxSize, 30);

	var buttonGroup = parentGroup.add("group");
	buttonGroup.orientation = 'row';
	buttonGroup.alignment = "right";
	var executeButton = buttonGroup.add("button", undefined, "Start");
	executeButton.onClick = function () {
		window.close();
		var noteRange = [parseInt(noteMinEditText.text), parseInt(noteMaxEditText.text)];
		var compSize = [parseInt(compWidthEditText.text), parseInt(compHeightEditText.text)];
		var fps = parseInt(compFpsEditText.text);
		onSelectButtonClicked(trackDropDownList.selection.index, items[itemDropDownList.selection.index], offsetEditText.text, noteRange, compNameEditText.text, compSize, fps);
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

	readTimings(trackIndex, offsetBeat, noteRange) {
		var t = 0;
		var beforeEventTop;
		var offset = this.getSecond(offsetBeat * this.resolution);
		this.index = 0;
		this.trackIndex = trackIndex;
		var timings = [];
		while(this.index < this.tracks[this.trackIndex].length) {
			t += this.getFlexibleNum(true);

			var event = this.getNum(1, true);
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
						var note = this.getNum(1, true);
						if(noteRange[0] > note || noteRange[1] < note){
							this.index++;
							break;
						}
						var velocity = this.getNum(1, true);
						if(velocity == 0)
							break;
						var s = this.getSecond(t) - offset;
						if(s < 0)
							break;
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

function makeLayer(timings, item, compName, compSize, fps) {
	var myComp = app.project.items.addComp(compName, compSize[0], compSize[1], 1, timings[timings.length - 1], fps);
	var layer = myComp.layers.add(item);
	layer.timeRemapEnabled = true;
	layer.startTime = timings[0];
	for (let i = 0; i < timings.length; i++) {
		var dir = i % 2 == 0 ? 1 : -1;
		if(i != 0) {
			var beforeT = timings[i] - 0.0001;
			layer.scale.setValueAtTime(beforeT, [100 * -dir, 100]);
			// Added +0 to ignore -0
			layer.property("Time Remap").setValueAtTime(beforeT, Math.min(beforeT - timings[i - 1] + 0, item.duration));
		}
		layer.scale.setValueAtTime(timings[i], [100 * dir, 100]);
		layer.property("Time Remap").setValueAtTime(timings[i], 0);
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
function onSelectButtonClicked(trackIndex, item, offset, noteRange, compName, compSize, fps) {
	var timings = midiReader.readTimings(trackIndex, offset, noteRange);
	makeLayer(timings, item, compName, compSize, fps);
}