// DOM Elements
const searchInput = document.querySelector('.search-input');
const serverList = document.querySelector('.server-list');
const selectedServerText = document.getElementById('selected-server');
const selectedFlag = document.getElementById('selected-flag');
const connectButton = document.querySelector('.connect-button');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');

// State
let isConnected = false;
let selectedServer = null;
let servers = [];

// Initialize
document.addEventListener('DOMContentLoaded', initialize);
if (searchInput) searchInput.addEventListener('input', handleSearch);
if (connectButton) connectButton.addEventListener('click', handleConnection);

async function initialize() {
    try {
        // Get server list from background script
        chrome.runtime.sendMessage({ action: 'getServerList' }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('Error loading servers: ' + chrome.runtime.lastError.message, 'error');
                servers = getDefaultServers();
            } else {
                servers = response;
            }
            populateServerList(servers);
        });
        
        // Check initial connection status
        chrome.runtime.sendMessage({ action: 'getConnectionStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('Error checking connection: ' + chrome.runtime.lastError.message, 'error');
            } else if (response) {
                updateConnectionState(response.isConnected, response.server);
            }
        });
    } catch (error) {
        showNotification('Failed to initialize: ' + error.message, 'error');
        servers = getDefaultServers();
        populateServerList(servers);
    }
}

function getDefaultServers() {
    return [
        { name: 'United States', country: 'us', address: '144.126.134.206:14629' },
        { name: 'Germany', country: 'de', address: '194.163.147.233:14629' },
        { name: 'United Kingdom', country: 'uk', address: '80.190.82.58:14629' },
        { name: 'Singapore', country: 'sg', address: '109.123.238.230:14629' }
    ];
}

function populateServerList(servers) {
    if (!serverList) return;
    
    serverList.innerHTML = '';
    
    // Add Auto Select option
    const autoServer = createServerElement({
        name: 'Auto Select',
        country: 'auto',
        address: servers[0].address // Use first server as default
    });
    autoServer.classList.add('selected');
    serverList.appendChild(autoServer);
    
    // Add other servers
    servers.forEach(server => {
        serverList.appendChild(createServerElement(server));
    });

    // Select the first server by default
    if (servers.length > 0) {
        selectServer(servers[0], autoServer);
    }
}

function createServerElement(server) {
    const div = document.createElement('div');
    div.className = 'server-item';
    div.innerHTML = `
        <img src="/data/flags/${server.country}.png" alt="${server.name}" class="country-flag">
        <div class="server-info">
            <div class="server-name">${server.name}</div>
            <div class="server-address">${server.address}</div>
        </div>
    `;
    
    div.addEventListener('click', () => selectServer(server, div));
    return div;
}

function selectServer(server, element) {
    if (!server) return;
    
    selectedServer = server;
    
    if (selectedServerText) {
        selectedServerText.textContent = server.name;
    }
    
    if (selectedFlag) {
        selectedFlag.src = `/data/flags/${server.country}.png`;
        selectedFlag.alt = server.name;
    }
    
    // Update selection visual
    if (element) {
        document.querySelectorAll('.server-item').forEach(item => {
            item.classList.remove('selected');
        });
        element.classList.add('selected');
    }
}

function handleSearch(event) {
    if (!serverList) return;
    
    const searchTerm = event.target.value.toLowerCase();
    const serverItems = document.querySelectorAll('.server-item');
    
    serverItems.forEach(item => {
        const serverName = item.querySelector('.server-name')?.textContent.toLowerCase() || '';
        const serverAddress = item.querySelector('.server-address')?.textContent.toLowerCase() || '';
        const shouldShow = serverName.includes(searchTerm) || serverAddress.includes(searchTerm);
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

async function handleConnection() {
    try {
        if (isConnected) {
            chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
                if (chrome.runtime.lastError || !response.success) {
                    showNotification('Failed to disconnect: ' + (response?.error || chrome.runtime.lastError.message), 'error');
                    return;
                }
                updateConnectionState(false);
                showNotification('Disconnected successfully', 'success');
            });
        } else {
            const server = selectedServer || (servers.length > 0 ? servers[0] : null);
            if (!server) {
                showNotification('No server selected', 'error');
                return;
            }
            
            chrome.runtime.sendMessage({ 
                action: 'connect',
                server: server
            }, (response) => {
                if (chrome.runtime.lastError || !response.success) {
                    showNotification('Failed to connect: ' + (response?.error || chrome.runtime.lastError.message), 'error');
                    return;
                }
                updateConnectionState(true, server);
                showNotification('Connected successfully', 'success');
            });
        }
    } catch (error) {
        showNotification('Connection error: ' + error.message, 'error');
    }
}

function updateConnectionState(connected, server = null) {
    isConnected = connected;
    
    // Update button
    if (connectButton) {
        connectButton.classList.toggle('connected', connected);
        const buttonText = connectButton.querySelector('span');
        if (buttonText) {
            buttonText.textContent = connected ? 'Disconnect' : 'Connect';
        }
    }
    
    // Update status
    if (statusDot) {
        statusDot.style.backgroundColor = connected ? 'var(--success-color)' : 'var(--text-secondary)';
    }
    
    if (statusText) {
        statusText.textContent = connected ? 'Connected' : 'Not Connected';
        statusText.style.color = connected ? 'var(--success-color)' : 'var(--text-secondary)';
    }
    
    // Update selected server if provided
    if (server) {
        const serverElement = Array.from(document.querySelectorAll('.server-item')).find(item => {
            const addressElement = item.querySelector('.server-address');
            return addressElement && addressElement.textContent === server.address;
        });
        
        if (serverElement) {
            selectServer(server, serverElement);
        }
    }
}

function showNotification(message, type = 'success') {
    const container = document.querySelector('.notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
} 