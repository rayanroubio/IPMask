/* globals app */
'use strict';

const apiEndpoint = 'https://www.onworks.net/vpn.json';

var ui = {
    login: {
        container: document.getElementById('login_form_container'),
        form: document.getElementById('login_form'),
        btn: document.getElementById('login_btn'),
       
        
        error: document.getElementById('login_error'),
        logout: document.getElementById('logout'),
    },
    main: {
        container: document.getElementById('main_container'),
        ipsTable: document.getElementById('main_ips_table'),
    }
};



ui.login.logout.addEventListener('click', () => {
    logout();
});

ui.login.form.onsubmit = function (evt) {
    evt.preventDefault();

    login();
};

app.on('update_state', state => {
    if (state === STATE_LOGIN && app.lastState != state) {
                
        app.lastState = STATE_LOGIN;
        showLogin();
    }
    if (state === STATE_MAIN && app.lastState != state) {
        
        app.lastState = STATE_MAIN;
        showMain();
    }
});

app.on('notify', msg => {
    msg = msg.error || msg.message || msg;
    const div = document.createElement('div');
    div.textContent = (new Date()).toTimeString().split(' ')[0] + ': ' + msg;
    document.getElementById('notify').appendChild(div);
    div.scrollIntoView();
    window.setTimeout(() => document.getElementById('notify').removeChild(div), 2000);
});

function showMain() {
    
    if (!app.conf || !app.conf.hasOwnProperty('data')) {
        return;
    }

    // hide login form and show main
    ui.login.container.classList.add('hide')

    ui.main.ipsTable.innerHTML = '';
    for (let i in app.conf.data.servers) {
        let row = document.createElement('tr');
        let col = document.createElement('td');
        col.setAttribute('colspan', '5');
        // col.setAttribute('style', 'text-align: center');
        col.textContent = 'Service #' + i + ', ' + app.conf.data.servers[i].proxies.length + ' IPs';
       // row.appendChild(col);
        ui.main.ipsTable.appendChild(row);
        for (let j in app.conf.data.servers[i].proxies) {
            let row = document.createElement('tr');
            let country = document.createElement('td');
            let proxy = document.createElement('td');
            let action = document.createElement('td');
            let notes = document.createElement('td');
            let note = document.createElement('input');
            let flag = document.createElement('img');
            let flagDescr = document.createElement('td');
            flag.setAttribute('src', '/data/flags/' + app.conf.data.servers[i].proxies[j].country + '.svg');
            flag.setAttribute('alt', app.conf.data.servers[i].proxies[j].country);
            flag.setAttribute('width', '45');
            flag.setAttribute('height', '25');
            flagDescr.textContent = app.conf.data.servers[i].proxies[j].country;
            note.setAttribute('type', 'text');
            note.setAttribute('placeholder', 'note...');
            note.setAttribute('id', 'note' + i + '_' + j);
            if (app.notes.hasOwnProperty('note' + i + '_' + j)) {
                note.setAttribute('value', app.notes['note' + i + '_' + j]);
            }
          
           // notes.appendChild(note);
            country.appendChild(flag);
            // country.textContent = app.conf.data.servers[i].proxies[j].country;
            proxy.textContent = app.conf.data.servers[i].proxies[j].proxy;
            let actionBtn = document.createElement('input');
            actionBtn.setAttribute('type', 'button');
            actionBtn.classList.add('disabled');
            actionBtn.setAttribute('id', 'ip' + i + '_' + j);
            actionBtn.setAttribute('data-id', i + '_' + j);
            actionBtn.textContent = 'Apply';
            actionBtn.addEventListener('click', event => {
                activateIpAction(event);
            });
            action.setAttribute('class', 'modify');
            action.appendChild(actionBtn);
            row.appendChild(country);
            row.appendChild(flagDescr);
            row.appendChild(proxy);
            row.appendChild(action);
            row.appendChild(notes);
            ui.main.ipsTable.appendChild(row)
        }
    }

    if (app.activeIp !== false) {
        activateIp(document.getElementById('ip' + app.activeIp[0] + '_' + app.activeIp[1]), app.activeIp[0], app.activeIp[1], false);
    }

    ui.main.container.classList.remove('hide')
}

function showLogin() {
    ui.main.container.classList.add('hide');
   
    ui.login.container.classList.remove('hide')
}

async function logout() {
    if (app.activeIp !== false) {
        // deactivate another ip
        await deactivate(document.getElementById('ip' + app.activeIp[0] + '_' + app.activeIp[1]), app.activeIp[0], app.activeIp[1]);
    }
    await chrome.storage.local.remove('details');
    app.conf = {};
    app.state = STATE_LOGIN;
    app.emit('update_state', app.state);
}


function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


function login() {
    ui.login.error.textContent = '';

    let extensionc = makeid(50);
    let result = async () => {
        const json = await fetch(apiEndpoint + "?v=" + extensionc )
            .then(r => (
                r.ok ? r.json() : Promise.reject('Cannot connect to the server, status: ' + r.status)
            ))
            .then(j => (j.error ? Promise.reject(j.error) : j));	

        
        if (json.status == 'error') {
            ui.login.error.textContent = json.message;
        } else {
            

            chrome.storage.local.set({
                details: json
            });

            app.conf = json;

            app.state = STATE_MAIN;
			
            
            
            app.emit('update_state', app.state);
            
        }
    };

    result();
}



function activateIpAction(event) {

    let i = event.target.dataset.id.split('_')[0];
    let j = event.target.dataset.id.split('_')[1];

    if (app.activeIp !== false && (app.activeIp[0] != i || app.activeIp[1] != j)) {
        // deactivate another ip
        document.getElementById('ip' + app.activeIp[0] + '_' + app.activeIp[1]).classList.add('disabled');
        deactivate(app.activeIp[0], app.activeIp[1]);
    }

    activateIp(event.target, i, j);
}

function activateIp(target, i, j, notify = true) {
    if (target.classList.contains('disabled')) {
        target.classList.remove('disabled');
        activate(i, j, notify);
    } else {
        target.classList.add('disabled');
        deactivate(target, i, j);
    }
}