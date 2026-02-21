const axios = require('axios');
const { exec } = require('child_process');

const API_URL = 'http://localhost:5000/api';

async function waitForServer() {
    console.log("Waiting for server to be ready...");
    let attempts = 0;
    while (attempts < 30) { // 30 attempts * 2s = 60s
        try {
            await axios.get(`${API_URL}/ping`);
            console.log("Server is ready!");
            return true;
        } catch (err) {
            attempts++;
            process.stdout.write(".");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error("\nServer failed to start in time.");
    return false;
}

async function run() {
    const ready = await waitForServer();
    if (ready) {
        console.log("\nStarting verification...");
        const verifyScript = require('path').join(__dirname, 'verify_workflow.js');
        exec(`node "${verifyScript}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`\nError: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`\nStderr: ${stderr}`);
            }
            console.log(`\nStdout:\n${stdout}`);
        });
    }
}

run();
