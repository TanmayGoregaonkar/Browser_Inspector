const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs')
const cors = require('cors')
const http = require('http')
const expressWs = require('express-ws')

// const {Server} = require('socket.io')
// const {URL} = require('url');
// const server = http.createServer(app)

const app = express();
const port = 3000;

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    // optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

expressWs(app);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve('./public')));


app.ws('/', function (ws, req) {
    console.log('WebSocket connection established');
    
    ws.on('message', function (message) {
        console.log('Received message from client:', message);

        const data = JSON.parse(message);

        if (data && data.method === "Network.willBeSent") {
            // sending a response back to the client
            // ws.send(JSON.stringify({ message: "Network monitoring enabled" }));
            console.log(data)
        }
        
        if (data && data.method === "Network.requestWillBeSentExtraInfo") {
            console.log(data)
        }
    });

});

app.get('/', (req, res) => {
    res.sendFile(path.resolve('./public/index.html'));
});

app.post('/startDebugging', async (req, res) => {
    let userPort = req.body.port;
    if (!userPort) {
        userPort = 9222;
    }

    const browserType = req.query.browser || 'chrome';

    try {
        let executablePath;
        if (browserType === 'chrome') {
            executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else if (browserType === 'edge') {
            executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        } else {
            throw new Error('Invalid browser type specified');
        }
        // allowing http://127.0.0.1:9222 ${userPort}
        const browser = await puppeteer.launch({
            executablePath,
            args: [
                `--remote-debugging-port=${userPort}`,
                `--remote-allow-origins=*`,
                // `--user-data-dir=remote-profile`
            ],
            headless: false,
        });
        console.log(`Debugging started on ${browserType} on port ${userPort}`);
        // res.send(`Debugging started on ${browserType} on port ${userPort} <br/>View debug logs at <span><a href='http://localhost:${userPort}/json' target='_blank'>http://localhost:${userPort}/json</a></span>`);
        // res.send(`Debugging started on ${browserType} on port ${userPort} <br/>View debug logs at ${path.resolve('./public/index.html')}`);
        // res.redirect('/list')
    } catch (error) {
        console.error(`Error launching browser: ${error.message}`);
        res.send(`Error launching browser: ${error.message}`);
    }
});

app.get('/proxy', async (req, res) => {
    try {
        // Extract the custom port from the query parameter or use the default 9222
        const userPort = req.query.port || 9222;
        const apiUrl = `http://127.0.0.1:${userPort}/json`;

        const response = await fetch(apiUrl);
        const data = await response.json();
        const filteredData = data.filter(item => item.type === 'page');

        res.json(filteredData);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on port http://localhost:${port}`);
});
