'use strict';

var app = {};
var _ = chrome.i18n.getMessage;

var prefs = {};

const STATE_LOGIN = 'login';
const STATE_MAIN = 'main';

let originalIp = "";

var connetStatus="";

app.activeIp = false;
app.lastAuthAttempt = false;
app.state = STATE_LOGIN;
app.conf  = {};
app.notes  = {};
app.lastState = false;

app.callbacks = {
  on: {},
  once: {}
};
app.onces = {};

app.on = (id, callback) => {
  app.callbacks.on[id] = app.callbacks.on[id] || [];
  app.callbacks.on[id].push(callback);
};

app.once = (id, callback) => {
  app.callbacks.once[id] = app.callbacks.once[id] || [];
  app.callbacks.once[id].push(callback);
};
app.emit = (id, value) => {
  (app.callbacks.on[id] || []).forEach(c => c(value));
  (app.callbacks.once[id] || []).forEach(c => c(value));
  app.callbacks.once[id] = [];
};

app.notify = (e, callback) => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e,
}, callback);

app.compare = (a, b) => {
  let ka = Object.keys(a).filter(s => s !== 'remoteDNS' && s !== 'noPrompt');
  let kb = Object.keys(b).filter(s => s !== 'remoteDNS' && s !== 'noPrompt');
  // remove empty array; bypassList = []
  ka = ka.filter(k => (Array.isArray(a[k]) ? a[k].length : true));
  kb = kb.filter(k => (Array.isArray(b[k]) ? b[k].length : true));

  if (ka.length !== kb.length) {
    return false;
  }
  for (const key of ka) {
    if (typeof a[key] === 'string' || typeof a[key] === 'boolean' || typeof a[key] === 'number') {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    else if (Array.isArray(a[key])) {
      if (a[key].some(s => b[key].indexOf(s) === -1)) {
        return false;
      }
    }
    else {
      return app.compare(a[key], b[key]);
    }
  }
  return true;
};

function mod_headers(header_array,p_name,p_value) {
  var did_set = false;
  for(var i in header_array) {
    var header = header_array[i];
    var name = header.name;
    var value = header.value;

    // If the header is already present, change it:
    if(name == p_name) {
      header.value = p_value;
      did_set = true;
    }
  }
  // if it is not, add it:
  if(!did_set) { header_array.push( { name : p_name , value : p_value } ); }
}


/*
chrome.webRequest.onAuthRequired.addListener((details, callbackFn) => {
	
	//console.log(details.isProxy + app.activeIp + "-" + app.conf.data.servers[app.activeIp[0]].proxies[app.activeIp[1]].proxy.split(':')[0]+ "-" +details.challenger.host);
	 
      if (details.isProxy && app.activeIp !== false && app.conf.data.servers[app.activeIp[0]].proxies[app.activeIp[1]].proxy.split(':')[0] === details.challenger.host && details.challenger.port === 43888) {
        if (app.lastAuthAttempt === details.challenger.host) {
          // show error, deactivate proxy
            alert("deactivate proxy");
          app.emit('notify', 'Proxy auth failed: ' + app.conf.data.servers[app.activeIp[0]].proxies[app.activeIp[1]].proxy.split(':')[0]);
          app.emit('update-description', 'Proxy auth failed: ' + app.conf.data.servers[app.activeIp[0]].proxies[app.activeIp[1]].proxy.split(':')[0]);
          app.emit('deactivate-proxy');
          callbackFn({cancel: true});
          return;
        }
        app.lastAuthAttempt = details.challenger.host;
                    
        callbackFn({
          authCredentials: {
            username: app.conf.data.servers[app.activeIp[0]].credentials.username,
            password: app.conf.data.servers[app.activeIp[0]].credentials.password
          }
        });
      }
    },
    //
//);  */

// get conf
chrome.storage.local.get(null, ps => {

console.log(prefs);
  prefs = ps;
  if (prefs.hasOwnProperty('activeIp')) {
    app.activeIp = prefs.activeIp;
  }
  if (prefs.hasOwnProperty('details')) {
    app.state = STATE_MAIN;
    app.conf  = prefs.details;
  }
  if (prefs.hasOwnProperty('notes')) {
    app.notes = prefs.notes;
  }

console.log(app.state);
  app.emit('update_state', app.state);
});

// pref changes
chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);

  if (ps.hasOwnProperty('details') && ps.details.hasOwnProperty('newValue')) {
    app.state = STATE_MAIN;
    app.conf  = ps.details.newValue;
	console.log(app.state);
    app.emit('update_state', app.state);
  }
  if (ps.hasOwnProperty('details') && !ps.details.hasOwnProperty('newValue')) {
    app.state = STATE_LOGIN;
    app.conf  = {};
	console.log(app.state);
    app.emit('update_state', app.state);
  }

  if (prefs.hasOwnProperty('activeIp')) {
    app.activeIp = prefs.activeIp;
  }

  if (prefs.hasOwnProperty('notes')) {
    app.notes = prefs.notes;
  }

});

/**
 * @param {Array.<String>} filters
 * @param {boolean} inclusive
 */
function removeCookies( filters, inclusive ){

  // only delete the domains in filters
  if( inclusive ){

    $.each( filters, function( filterIndex, filterValue ){
      chrome.cookies.getAll( {"domain":filterValue}, function( cookies ){
        $.each( cookies, function(cookieIndex, cookie){
          removeCookie( cookie );
        });
      });
    });

    // delete all domains except filters
  } else {

    var filterMap = {};

    $.each( filters, function( filterIndex, filterValue ){
      var filterSegments = filterValue.split('.');
      if( filterValue.indexOf(".")!=0 && filterValue.indexOf("http")!=0 && filterValue!="localhost" && (filterSegments.length>2 || filterSegments[2]!='local' ) ){
        filterValue = "."+filterValue;
      }
      filterMap[filterValue] = true;
    });

    chrome.cookies.getAll( {}, function( cookies ){

      $.each( cookies, function(cookieIndex, cookie){

        if( filterMap[cookie.domain] ){
          return;
        }
        removeCookie( cookie );
      });
    });
  }
}

/**
 *
 * @param  {Object} cookie
 */
function removeCookie( cookie ){
  var protocol = cookie.secure ? "https://":"http://";
  var cookieDetails = {
    "url":	protocol+cookie.domain,
    "name":	cookie.name
  };
  chrome.cookies.remove( cookieDetails, function( result ){

  });
}


async function getCurrentIp() {
	console.log("ip wait");
    //var res = await fetch('http://api.ipify.org/');
    var res = await fetchWithTimeout('http://api.ipify.org/', {
      timeout: 9000
    });
    
    //console.log(res.text() );
    return await res.text();
}

 

 function setProxy(config, notify = true) {
     
     
     var activated = 0;
     if ( localStorage.getItem('activated') )
     {
            activated = localStorage.getItem('activated');
     }
       else {
           activated = 0;
           localStorage.setItem('activated', activated);
       }
     
  // set proxy
  try {
    //chrome.proxy.settings.set(config);
       connetStatus="";
       chrome.proxy.settings.set(config, function  () {
                    // Get ip after setting proxy and compare it with original ip
                    /*getCurrentIp().then(ip => {*/

                                    
                                    
                                    if (config.value.mode != 'direct') 
                                    {
                                        
                                        //alert(ip + " -- " + config.value.rules.proxyForHttp.host );
                                        app.emit('notify', 'Proxy activated: ' + config.value.rules.proxyForHttp.host);
                                        
                                        
                                        //setTimeout(function()
                                        //{ 
                                        //    logout();
                                        //    
                                        //}, 10000);
                                        
                                        var activated = localStorage.getItem('activated');
                                        
                                        if ( activated == 0 )
                                        {
                                            activated = 1;
                                            localStorage.setItem('activated', activated);
                                            
                                            setTimeout(function()
                                            { 
                                            }, 100);
                                        }
                                        
                                        
                                        
                                        
                                        //chrome.action.setIcon({path:"128Pass.png"});
                                        
                                        
                                        /*if (ip == config.value.rules.proxyForHttp.host)
                                        {
                                            connetStatus="Connected";
                                            app.emit('notify', 'Proxy activated: ' + config.value.rules.proxyForHttp.host);		


                                        //	app.emit('update-description', 'Proxy activated: ' + config.value.rules.proxyForHttp.host);
                                        }
                                        else
                                        {  
                                            connetStatus="NotConnected";
                                             app.emit('notify', 'Proxy NOT activated: ' );


                                        }  */
                                    }
                                    else {
                                        app.emit('notify', 'Proxy deactivated');
                                        
                                        activated = 0;
                                        localStorage.setItem('activated', activated);
                                        
                                        //chrome.action.setIcon({path:"128.png"});
                                        
                                    }


                 /*})*/
        });
												
												
				
  } catch (e) {
   //pp.emit('notify', e.message || e);
      activated = 0;
      localStorage.setItem('activated', activated);
  }
}

 
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}
 

function activate(i, j, notify) {
  app.lastAuthAttempt = false;

  chrome.storage.local.set({
    activeIp: [i, j]
  });

  const value = {
    mode: "fixed_servers",
    rules: {
      bypassList: ["localhost", "127.0.0.1"],
      proxyForHttp: {
        host: app.conf.data.servers[i].proxies[j].proxy.split(':')[0],
        port: Number(app.conf.data.servers[i].proxies[j].proxy.split(':')[1]),
        scheme: "http"
      },
      proxyForHttps: {
        host: app.conf.data.servers[i].proxies[j].proxy.split(':')[0],
        port: Number(app.conf.data.servers[i].proxies[j].proxy.split(':')[1]),
        scheme: "http"
      },
    }
  };
  // value.remoteDNS = ui.manual.remoteDNS.checked;
  // value.noPrompt = ui.manual.noPrompt.checked;
  // trigger ip change
  setProxy({value}, notify);
  // app.emit('update-description', 'Proxy activated: ' + app.conf.data.servers[i].proxies[j].proxy);
}

function deactivate(i, j) {
  // deactivate

  chrome.storage.local.set({
    activeIp: false
  });

  app.activeIp = false;
  // trigger ip change
  const value = {
    mode: 'direct'
  };
  setProxy({value});
   //app.emit('update-description', 'Proxy Connecting..');
   app.emit('update-description', '');
}

app.on('deactivate-proxy', () => {
  if (this.activeIp !== false) {
    var target = document.getElementById('ip' + app.activeIp[0] + '_' + app.activeIp[1]);
    if (target) {
      target.classList.add('disabled');
    }
    deactivate(app.activeIp[0], app.activeIp[1]);
  }
});







