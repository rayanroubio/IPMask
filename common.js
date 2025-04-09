/* globals app */
'use strict';

var _ = chrome.i18n.getMessage;
var isFirefox = /Firefox/.test(navigator.userAgent);

var prefs = {
    color: '#848384',
    counter: true,
    text: false, // icon text,
    version: null,
    faqs: true,
    'last-update': 0,
    ffcurent: null,
    'startup-proxy': 'no'
};

/* icon color */
var icon = (() => {

    return config => {
        if (!config) {
            return;
        }

        let mode = (!config || !config.hasOwnProperty('value') || config.value.mode == 'direct') ? 'disabled' : 'enabled';
       

        let title = 'Vpn\n\n';
        title += (!config || !config.hasOwnProperty('value') || config.value.mode == 'direct' || !config.value.rules || !config.value.rules.proxyForHttp) 
            ? 'IP: Disabled' 
            : 'IP: ' + config.value.rules.proxyForHttp.host;

        chrome.action.setTitle({title});
    };
})();

// init
chrome.storage.local.get(null, ps => {
    //main
    Object.assign(prefs, ps);
    if (prefs.hasOwnProperty('activeIp') && prefs.activeIp !== false && prefs.hasOwnProperty('details')) {
        chrome.proxy.settings.set({
            value: {
                mode: "fixed_servers",
                rules: {
                    bypassList: ["localhost", "127.0.0.1"],
                    proxyForHttp: {
                        host: prefs.details.data.servers[prefs.activeIp[0]].proxies[prefs.activeIp[1]].proxy.split(':')[0],
                        port: Number(prefs.details.data.servers[prefs.activeIp[0]].proxies[prefs.activeIp[1]].proxy.split(':')[1]),
                        scheme: "http"
                    }
                }
            }
        }, icon);
    } else {
        chrome.proxy.settings.set({
            value: {
                mode: 'direct'
            }
        }, icon);
    }
});

chrome.proxy.settings.onChange.addListener(icon);

chrome.storage.onChanged.addListener(ps => {
    Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
});





