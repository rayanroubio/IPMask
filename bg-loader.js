try {
  importScripts('data/panel/utils.js', 'common.js' /*, and so on */);
} catch (e) {
  console.error(e);
}

// State management
let currentConnection = null;
let isConnected = false;
let opcA = { usercx: null, apkononline: null };
let usercx = "";
let apkononline = "";
const apkon_key = "apkon_key";

const vpnServers = [
    { name: 'United States', country: 'us', address: '144.126.134.206:14629' },
    { name: 'Germany', country: 'de', address: '194.163.147.233:14629' },
    { name: 'United Kingdom', country: 'uk', address: '80.190.82.58:14629' },
    { name: 'Singapore', country: 'sg', address: '109.123.238.230:14629' },
];

// Initialize storage
async function initStorage() {
    try {
        let storres = await chrome.storage.local.get([apkon_key]);
        if (apkon_key in storres) { 
            opcA = storres[apkon_key];
        }

        if (opcA.apkononline) { 
            apkononline = opcA.apkononline;
        } else { 
            apkononline = "1"; 
            opcA.apkononline = "1";
        }

        if (opcA.usercx) { 
            usercx = opcA.usercx;
        } else { 
            usercx = "" + xdfty0(10) + "".toLowerCase(); 
            opcA.usercx = usercx;
        }

        let stox = {};
        stox[apkon_key] = opcA;
        await chrome.storage.local.set(stox);
    } catch (error) {
        console.error('Storage initialization error:', error);
    }
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getServerList':
            sendResponse(vpnServers);
            break;

        case 'getConnectionStatus':
            sendResponse({
                isConnected: isConnected,
                server: currentConnection
            });
            break;

        case 'connect':
            handleConnect(request.server, sendResponse);
            return true;

        case 'disconnect':
            handleDisconnect(sendResponse);
            return true;
    }
});

async function handleConnect(server, sendResponse) {
    try {
        if (isConnected && currentConnection && currentConnection.address === server.address) {
            sendResponse({ success: true });
            return;
        }

        if (isConnected) {
            await disconnectFromVPN();
        }

        await connectToVPN(server);
        currentConnection = server;
        isConnected = true;
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('Connection error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleDisconnect(sendResponse) {
    try {
        if (!isConnected) {
            sendResponse({ success: true });
            return;
        }

        await disconnectFromVPN();
        currentConnection = null;
        isConnected = false;
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('Disconnection error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function connectToVPN(server) {
    return new Promise((resolve) => {
        chrome.proxy.settings.set({
            value: {
                mode: "fixed_servers",
                rules: {
                    singleProxy: {
                        scheme: "http",
                        host: server.address.split(':')[0],
                        port: parseInt(server.address.split(':')[1])
                    }
                }
            },
            scope: "regular"
        }, resolve);
    });
}

async function disconnectFromVPN() {
    return new Promise((resolve) => {
        chrome.proxy.settings.clear({
            scope: 'regular'
        }, resolve);
    });
}

// Utility functions
function xdfty0(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var rans10 = '';
    for (var i = 0; i < len; i++) {
        var ranPx = Math.floor(Math.random() * charSet.length);
        rans10 += charSet.substring(ranPx,ranPx+1);
    }
    return rans10.toLowerCase();
}

function b2x(bin) {
    var i = 0, l = bin.length, chr, hex = '';
    for (i; i < l; ++i) {
        chr = bin.charCodeAt(i).toString(16);
        hex += chr.length < 2 ? '0' + chr : chr;
    }
    return hex;
}

// Initialize
initStorage();

// Clear proxy settings on install/update
chrome.runtime.onInstalled.addListener(() => {
    chrome.proxy.settings.clear({
        scope: 'regular'
    });
});

