document.getElementById('launchDefaultButton').addEventListener('click', async function () {
    try {
        const browserType = document.getElementById('browserSelect').value;
        const response = await fetch(`/startDebugging?browser=${browserType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'port=9222',
        });

        const result = await response.text();
        document.getElementById('debugOutput').innerHTML = result;

        // fetchListData(browserType,9222)
    } catch (error) {
        console.error('Error launching on default port:', error.message);
    }
});

document.getElementById('customPort').addEventListener('click', async function (event) {
    event.preventDefault(); // Prevent the default form submission behavior
    try {
        const browserType = document.getElementById('browserSelect').value;
        const userPort = document.getElementById('portInput').value;

        const response = await fetch(`/startDebugging?browser=${browserType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `port=${userPort}`,
        });

        const result = await response.text();
        document.getElementById('debugOutput').innerHTML = result;
        // fetchListData(browserType,userPort)
    } catch (error) {
        console.error('Error launching on specified port:', error.message);
    }
});


const btnele = document.querySelector('.btn');
const listContainer = document.getElementById('listContainer')
let combinedHeaders = {};


const clickHandler = async () => {
    const browserType = document.getElementById('browserSelect').value;
    const userPort = document.getElementById('portInput').value || 9222;

    try {
        // Fetch from the updated proxy endpoint with the custom port parameter
        const response = await fetch(`http://localhost:3000/proxy?port=${userPort}`);
        const data = await response.json();

        const wsUrl = data[0].webSocketDebuggerUrl;
        // Filter data to include only items with type: page
        const filteredData = data.filter(item => item.type === 'page');

        // Logging filtered data
        console.log(filteredData);
        // Clear previous content in the list container
        listContainer.innerHTML = '';

        // Create HTML elements for each item and append them to the list container
        filteredData.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
            <div style="color: white;">Id: ${item.id}</div>
            <div></div>
            <div style="color: #1E90FF;">Title: ${item.title}</div>
            <div></div>
            <div style="color: #FFD700;">Type: ${item.type}</div>
            <div></div>
            <div style="color: #00FF00;">WS: ${item.webSocketDebuggerUrl}</div>
            <div></div>
            <button class="connectWebSocketButton" data-webSocketUrl="${item.webSocketDebuggerUrl}">Connect WebSocket</button>
            <button class="printLogs" data-webSocketUrl="${item.webSocketDebuggerUrl}">Print logs</button>
            <button class="showLogs" data-webSocketUrl="${item.webSocketDebuggerUrl}">See Logs</button>
             `;
            // console.log(item.webSocketDebuggerUrl)
            // Add some additional styles to the list item
            listItem.style.borderBottom = '1px solid #333';
            listItem.style.padding = '10px';
            listItem.style.margin = '5px';
            listContainer.appendChild(listItem);
        });

        // Connection to WebSocket
        const connectWebSocketButtons = document.querySelectorAll('.connectWebSocketButton');
        connectWebSocketButtons.forEach(button => {
            button.addEventListener('click', () => {
                const webSocketUrl = button.dataset.websocketurl;

                console.log(webSocketUrl)
                if (webSocketUrl) {
                    connectWebSocket(webSocketUrl);
                } else {
                    console.error('WebSocket URL is undefined');
                }
            });

        });

        // Show the logs
        const showLogs = document.querySelectorAll('.showLogs');
        showLogs.forEach(button => {
            button.addEventListener('click', () => {
                try {
                    const logsHtml = generateLogsHtml();
                    // Open a new window with the logs HTML content
                    const newWindow = window.open();
                    newWindow.document.write(logsHtml);


                    const downloadButton = newWindow.document.getElementById('downloadSelectedHeaders');
                    downloadButton.addEventListener('click', () => {
                        const selectedHeaders = newWindow.document.querySelectorAll('input[name="headerCheckbox"]:checked');
                        const selectedUrls = Array.from(selectedHeaders).map(header => header.value);
                        const mH = mergingOfheader(combinedHeaders)
                        // Filtered mergedHeaders to include only selected URLs
                        const selectedMergedHeaders = Object.fromEntries(
                            Object.entries(mH).filter(([key, value]) => selectedUrls.includes(key))
                        );


                        const harObject = {
                            log: {
                                version: '1.2',
                                creator: {
                                    name: 'Browser Debug Launcher',
                                    version: '1.0'
                                },
                                entries: Object.keys(selectedMergedHeaders).map(key => ({
                                    startedDateTime: new Date().toISOString(),
                                    request: {
                                        method: 'GET',
                                        url: key,
                                        headers: Object.entries(selectedMergedHeaders[key]).map(([name, value]) => ({
                                            name,
                                            value
                                        }))
                                    },
                                    response: {
                                        status: 200,
                                        statusText: 'OK',
                                        headers: []
                                    }
                                }))
                            }
                        };
                        const blob = new Blob([JSON.stringify(harObject, null, 2)], { type: 'application/json' });
                        saveAs(blob, 'selected_headers.har');
                    });
                } catch (error) {
                    console.error('Error displaying merged headers:', error.message);
                }
            });
        });

        // Printing the merged header object on console
        const printLogs = document.querySelectorAll('.printLogs');
        printLogs.forEach(button => {
            button.addEventListener('click', () => {
                const websocketurl = button.dataset.websocketurl;
                if (websocketurl) {
                    try {
                        const mergedHeaders = mergingOfheader(combinedHeaders);
                        console.log(mergedHeaders);
                    } catch (error) {
                        console.log('Error downloading combined headers:', error.message);
                    }
                } else {
                    console.error('WebSocket URL is undefined');
                }
            });
        });



    } catch (error) {
        console.error('Error fetching and displaying list data:', error.message);
    }
}

const connectWebSocket = (webSocketUrl) => {
    console.log(webSocketUrl)
    const socket = new WebSocket(webSocketUrl)
    // Assuming that webSocketUrl is in the format "ws://localhost:9222/..."
    socket.onopen = function () {
        console.log('WebSocket connection established');
        const message = JSON.stringify({
            id: 1,
            method: "Network.enable",
            params: {}
        });

        socket.send(message)
    };
    socket.onmessage = function (event) {

        const message = JSON.parse(event.data);
        // console.log(message.params.documentURL)
        if (message.method === 'Network.requestWillBeSent') {
            const { requestId, request } = message.params;
            if (!combinedHeaders[requestId]) {
                combinedHeaders[requestId] = { requestHeaders: request.headers,documentURL: message.params.documentURL };
            } else {
                combinedHeaders[requestId].requestHeaders = request.headers;
                combinedHeaders[requestId].documentURL = message.params.documentURL;
            }
        } else if (message.method === 'Network.requestWillBeSentExtraInfo') {
            const { requestId, headers } = message.params;
            if (!combinedHeaders[requestId]) {
                combinedHeaders[requestId] = { extraInfoHeaders: headers };
            } else {
                combinedHeaders[requestId].extraInfoHeaders = headers;
            }
        }
        //    console.log(combinedHeaders) 
    };
    socket.onerror = function (error) {
        console.error('WebSocket connection error:', error);
    };
};

const mergingOfheader = (combinedHeaders) => {
    const mergedHeaders = {};
    for (const key in combinedHeaders) {
        if (Object.prototype.hasOwnProperty.call(combinedHeaders, key,)) {
            const logEntry = combinedHeaders[key];
            const headers = {
                ...logEntry.requestHeaders,
                ...logEntry.extraInfoHeaders
            }
            if (logEntry.documentURL) {
                headers.documentURL = logEntry.documentURL;
            }
            mergedHeaders[key] = headers;
        }
    }
    return mergedHeaders;
}

// Creating HTML file containing logs stored in mergeHeaders object
// const generateLogsHtml = () => {
//     const mH = mergingOfheader(combinedHeaders);
//     let html = '<html><head><title>Merged Headers</title></head><body><h1>Merged Headers</h1><form id="headerForm">';
//     Object.keys(mH).forEach(key => {
//         html += `<div><input type="checkbox" id="${key}" name="headerCheckbox" value="${key}">`;
//         html += `<label for="${key}">${key}</label></div>`;
//     });
//     html += '<button type="button" id="downloadSelectedHeaders">Download Selected Headers</button></form></body></html>';
//     return html;
// };

const generateLogsHtml = () => {
    const mH = mergingOfheader(combinedHeaders);
    let html = '<html><head><title>Merged Headers</title></head><body><h1>Merged Headers</h1><form id="headerForm">';
    Object.keys(mH).forEach(key => {
        const documentURL = mH[key].documentURL || key; // Use documentURL if available, otherwise use the key
        html += `<div><input type="checkbox" id="${documentURL}" name="headerCheckbox" value="${key}">`;
        html += `<label for="${documentURL}">${documentURL}</label></div>`;
        html += `<div><a href="${mH[key].documentURL}" target="_blank">Visit the URL</a></div>`;
    });
    html += '<button type="button" id="downloadSelectedHeaders">Download Selected Headers</button></form></body></html>';
    return html;
};
btnele.addEventListener('click', clickHandler);