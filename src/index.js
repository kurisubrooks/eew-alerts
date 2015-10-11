var socket = require('socket.io-client')('http://eew.kurisubrooks.com:3080');
var parser = require('./parser.js'); // Quake Data Parsing
var colors = require('colors'); // Terminal Text Formatting
var fse = require('fs-extra'); // File System Extras
var osenv = require('osenv'); // OS Specific Globals
var path = require('path'); // File System Paths
var open = require('open'); // Opens Web Browsers
var fs = require('fs'); // File System

var BrowserWindow = require('browser-window'); // Electron Windows
var app = require('app'); // Electron GUI
var Menu = require('menu'); // Electron Menu API
var Tray = require('tray'); // Electron Tray API
var ipc = require('ipc'); // Electron inter-process comm
require('crash-reporter').start(); // Electron Crash Reporter

if (process.platform === 'darwin') var notifier = require(path.join(__dirname, '../lib', 'node-notifier'));
else var notifier = require('node-notifier');

var date = new Date();
var lang1 = require('./settings.json');
var lang = lang1.lang;
var locale = JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'lang.json')) + '');
var copy = path.join(__dirname, 'resources', 'audio');
var paste = osenv.home() + '/Library/Sounds/';
var alertWindows = {};
var alertRevision = {};
var appIcon = null;
var electronReady = false;

function newWindow(data) {
	var alertWindow = new BrowserWindow({
		'title': locale[lang].title,
		'icon': path.join(__dirname, 'resources', 'icon.png'),
		'width': 600,
		'height': 625,
		'resizable': false,
		'auto-hide-menu-bar': true,
		'skip-taskbar': true
	});

	if (process.platform == 'darwin') app.dock.show();
	alertWindows[data.earthquake_id] = alertWindow;
	alertRevision[data.earthquake_id] = data.revision;
	alertWindow.loadUrl('file://' + __dirname + '/index.html');
}

function newSettings() {
	var settingsWindow = new BrowserWindow({
		'title': locale[lang].title + ' — ' + locale[lang].settings,
		'icon': path.join(__dirname, 'resources', 'icon.png'),
		'width': 500,
		'height': 550,
		'resizable': false,
		'auto-hide-menu-bar': true,
		'skip-taskbar': false
	});

	if (process.platform == 'darwin') app.dock.show();
	settingsWindow.loadUrl('file://' + __dirname + '/settings.html');
}

colors.setTheme({
	tweet: 'cyan',
	success: 'green',
	error: ['red', 'bold'],
	warn: 'yellow',
	info: 'blue'
});

if (process.platform === 'darwin') {
	fse.copy(copy, paste, function(error) {
		console.log(("[*] Installed Audio Files to " + paste).success);
		if (error) throw console.error(error.error);
	});
}

socket.on('connect', function() {
	console.log(('[*] Connected to Server').success);

	if (process.platform == 'darwin') notifier.notify({
		'title': locale[lang].title,
		'message': locale[lang].connect,
		'sound': false
	});
	else notifier.notify({
		'title': locale[lang].title,
		'message': locale[lang].connect,
		'sound': false,
		'icon': path.join(__dirname, 'resources', 'icon.png')
	});
});

socket.on('data', function(data) {
	console.log(('[>] Received New Data from Server').info);
	parse(data);
});

socket.on('disconnect', function() {
	console.log(('[!] Socket Dropped').error);

	if (process.platform == 'darwin') notifier.notify({
		'title': locale[lang].title,
		'message': locale[lang].disconnect,
		'sound': false
	});
	else notifier.notify({
		'title': locale[lang].title,
		'message': locale[lang].disconnect,
		'sound': false,
		'icon': path.join(__dirname, 'resources', 'icon.png')
	});
});

function parse(input) {
	var data = JSON.parse(input);

	try {
		var sound_string = parser.soundString(data);
		var situation_string = parser.situationString(data, locale);
		var template = parser.template(data, locale);
		var subtitle_template = template[0];
		var message_template = template[1];

		console.log(('[~] ' + data.earthquake_time + ' - ' + data.epicenter_en).yellow);
		console.log(('[~] ' + locale[lang].units.update + ' ' + situation_string + ', ' + locale[lang].units.magnitude + ': ' + data.magnitude + ', ' + locale[lang].units.seismic + ': ' + data.seismic_en).yellow);

		// Night Mode Check
		if (date.getHours() >= '07' || data.magnitude >= 6) {
			// Mac Day Notification
			if (process.platform === 'darwin') {
				notifier.notify({
					'title': locale[lang].title,
					'subtitle': subtitle_template,
					'message': message_template,
					'sound': sound_string,
					'time': 10000,
					'wait': true
				});
				// Linux & Windows Day Notification
			} else {
				notifier.notify({
					'title': locale[lang].title,
					'subtitle': subtitle_template,
					'message': message_template,
					'icon': path.join(__dirname, 'resources', 'icon.png'),
					'sound': sound_string,
					'urgency': 'critical',
					'time': 10000
				});
			}
		} else {
			// Mac Night Notifiction
			if (process.platform === 'darwin') {
				notifier.notify({
					'title': locale[lang].title,
					'subtitle': subtitle_template,
					'message': message_template,
					'sound': false,
					'time': 10000,
					'wait': true
				});
				// Linux & Windows Night Notification
			} else {
				notifier.notify({
					'title': locale[lang].title,
					'subtitle': subtitle_template,
					'message': message_template,
					'icon': path.join(__dirname, 'resources', 'icon.png'),
					'sound': false,
					'urgency': 'critical',
					'time': 10000
				});
			}
		}
		var webContents = alertWindows[data.earthquake_id].webContents;
		if (data.revision == 1 && (alertRevision[data.earthquake_id] === undefined || data.revision > alertRevision[data.earthquake_id]) && electronReady === true) {
			newWindow(data);
			webContents.on('did-finish-load', function() {
				webContents.send('data', [data, template, locale]);
			});

			var alertWindow = alertWindows[data.earthquake_id];

			alertWindow.on('closed', function() {
				alertWindow = null;
			});
		} else if (electronReady === true) {
			if (alertWindows[data.earthquake_id] === undefined) {
				newWindow(data);
				webContents.on('did-finish-load', function() {
					webContents.send('data', [data, template, locale]);
				});
			} else if (alertRevision[data.earthquake_id] !== undefined && data.revision > alertRevision[data.earthquake_id]) {
				webContents.send('data', [data, template, locale]);
				alertRevision[data.earthquake_id] = data.revision;
			}
		}

	} catch (err) {
		if (process.platform == 'darwin') notifier.notify({
			'title': locale[lang].title,
			'message': locale[lang].error + ': ' + err.message,
			'sound': false
		});
		else notifier.notify({
			'title': locale[lang].title,
			'message': locale[lang].error + ': ' + err.message,
			'sound': false,
			'icon': path.join(__dirname, 'resources', 'icon.png')
		});
	}
}

if (process.platform == 'darwin') app.dock.hide();

app.on('ready', function() {
	electronReady = true;

	appIcon = new Tray(path.join(__dirname, 'resources', 'IconTemplate.png'));
	appIcon.setPressedImage(path.join(__dirname, 'resources', 'IconPressed.png'));

	var contextMenu = Menu.buildFromTemplate([
	{
		label: locale[lang].help,
		click: function() {
			open('http://lumios.xyz/support.html');
		}
	},
	{
		type: 'separator'
	},
	{
		label: locale[lang].test,
		click: function() {
			parse('{"type":"0","drill":false,"announce_time":"2015/10/11 07:17:46","earthquake_time":"2015/10/11 07:16:32","earthquake_id":"20151011071640","situation":"0","revision":"1","latitude":"43.1","longitude":"145.8","depth":"50km","epicenter_en":"Offshore South Eastern Nemuro Peninsula","epicenter_ja":"根室半島南東沖","magnitude":"3.8","seismic_en":"2","seismic_ja":"2","geography":"sea","alarm":"0"}');
		}
	},
	{
		type: 'separator'
	},
	{
		label: locale[lang].contribute,
		click: function() {
			open('https://github.com/lumios/eew');
		}
	},
	{
		label: locale[lang].bug,
		click: function() {
			open('https://github.com/lumios/eew/issues');
		}
	},
	{
		type: 'separator'
	},
	{
		label: locale[lang].settings,
		click: function() {
			newSettings();
		}
	},
	{
		label: locale[lang].quit,
		click: function() {
			console.log(('[!] Closed due to user request.').error);
			process.exit(0);
		}
	}]);

	appIcon.setToolTip('EEW');
	appIcon.setContextMenu(contextMenu);

	appIcon.on('clicked', function(event) {
		console.log(event);
	});

	try {
		var setting = require('./settings.json');
	} catch (e) {
		newSettings();
	}

});

app.on('window-all-closed', function() {
	if (process.platform == 'darwin') app.dock.hide();
	return;
});
