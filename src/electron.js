const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
const Menu = electron.Menu;
const Tray = electron.Tray;
const ipc = electron.ipcMain;
const path = require('path');

const locale = require('./resources/lang.json');
const settings = require('./settings.json');
const lang = settings.lang;

var alertWindows = {};
var alertRevision = {};
var electronReady = false;

exports.BrowserWindow = BrowserWindow;
exports.app = app;
exports.Menu = Menu;
exports.Tray = Tray;
exports.ipc = ipc;
exports.alertWindows = alertWindows;
exports.alertRevision = alertRevision;
exports.electronReady = electronReady;

exports.newAbout = (data) => {
    var aboutWindow = new BrowserWindow({
        'title': locale[lang].title,
        'icon': path.join(__dirname, 'resources', 'icon.png'),
        'width': 330,
        'height': 240,
        'resizable': false,
        'fullscreen': false,
        'autoHideMenuBar': true,
        'skipTaskbar': false
    });

    if (process.platform == 'darwin') app.dock.show();
    aboutWindow.focus();
    aboutWindow.loadURL('file://' + __dirname + '/gui/about.html');
};

exports.newWindow = (data) => {
    var alertWindow = new BrowserWindow({
        'title': locale[lang].title,
        'icon': path.join(__dirname, 'resources', 'icon.png'),
        'minWidth': 600,
        'width': 600,
        'minHeight': 625,
        'height': 625,
        'resizable': false,
        'autoHideMenuBar': true,
        'skipTaskbar': false,
        'webPreferences': {
            'preload': 'https://maps.googleapis.com/maps/api/js'
        }
    });

    if (process.platform == 'darwin') app.dock.show();
    alertWindows[data.earthquake_id] = alertWindow;
    alertRevision[data.earthquake_id] = data.revision;
    alertWindow.focus();
    alertWindow.loadURL('file://' + __dirname + '/gui/map.html');
};

exports.newSettings = () => {
    var settingsWindow = new BrowserWindow({
        'title': locale[lang].settings,
        'icon': path.join(__dirname, 'resources', 'icon.png'),
        'width': 500,
        'height': 550,
        'resizable': false,
        'fullscreen': false,
        'autoHideMenuBar': true,
        'skipTaskbar': false
    });

    if (process.platform == 'darwin') app.dock.show();
    settingsWindow.loadURL('file://' + __dirname + '/gui/settings.html');
};
