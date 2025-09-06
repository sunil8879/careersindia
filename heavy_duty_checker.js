const fs = require('fs');
const axios = require('axios');
const chalk = require('chalk'); // Ensure you have run 'npm install chalk@4'

// --- CONFIGURATION ---
const INPUT_FILE = 'input_data.txt';
const REPORT_FILE = 'link_report.txt';
const REQUEST_TIMEOUT = 15000; // Increased timeout to 15 seconds
const RETRIES = 2; // Will try a total of 3 times (1 initial + 2 retries)
const BATCH_SIZE = 10; // How many links to check at once
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkLinkWithRetries(url) {
    for (let i = 0; i <= RETRIES; i++) {
        try {
            const response = await axios.get(url, {
                timeout: REQUEST_TIMEOUT,
                maxRedirects: 5,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
            });
            const finalUrl = response.request.res.responseUrl;
            if (finalUrl && finalUrl !== url) {
                return { status: 'REDIRECT', original: url, final: finalUrl };
            }
            return { status: 'OK', url: url };
        } catch (error) {
            const isRetryable = error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            if (isRetryable && i < RETRIES) {
                console.log(chalk.yellow(`  -> Retrying (${i + 1}/${RETRIES}): ${url}`));
                await sleep(1000 * (i + 1)); // Wait longer after each retry
                continue;
            }
            let reason = error.code || error.message;
            return { status: 'ERROR', url: url, reason: reason };
        }
    }
}

async function main() {
    console.log(chalk.blue.bold(`--- Heavy Duty Link Checker ---`));
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(chalk.red(`ERROR: Input file not found! Make sure '${INPUT_FILE}' is in the folder.`));
        return;
    }
    
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const foundLinks = fileContent.match(urlRegex) || [];
    const uniqueLinks = [...new Set(foundLinks)];

    if (uniqueLinks.length === 0) {
        console.error(chalk.red('Found 0 URLs in the file. Please check your input file.'));
        return;
    }

    console.log(chalk.cyan(`Found ${uniqueLinks.length} unique URLs.`));
    console.log(chalk.cyan(`Processing in batches of ${BATCH_SIZE} with a ${DELAY_BETWEEN_BATCHES / 1000}s delay.`));
    console.log(chalk.yellow('This will be slow but much more accurate. Please be patient.'));

    const allResults = [];
    for (let i = 0; i < uniqueLinks.length; i += BATCH_SIZE) {
        const batch = uniqueLinks.slice(i, i + BATCH_SIZE);
        const batchNumber = (i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(uniqueLinks.length / BATCH_SIZE);
        
        console.log(chalk.magenta(`\n--- Processing Batch ${batchNumber} of ${totalBatches} ---`));
        
        const promises = batch.map(link => checkLinkWithRetries(link));
        const batchResults = await Promise.all(promises);
        allResults.push(...batchResults);

        if (i + BATCH_SIZE < uniqueLinks.length) {
            await sleep(DELAY_BETWEEN_BATCHES);
        }
    }

    const okLinks = [], redirectedLinks = [], errorLinks = [];
    allResults.forEach(data => {
        if (data.status === 'OK') okLinks.push(data);
        if (data.status === 'REDIRECT') redirectedLinks.push(data);
        if (data.status === 'ERROR') errorLinks.push(data);
    });

    console.log(chalk.green.bold(`\n--- ANALYSIS COMPLETE ---`));
    console.log(chalk.green(`OK: ${okLinks.length}`));
    console.log(chalk.yellow(`Redirected: ${redirectedLinks.length} (These are automatically fixed!)`));
    console.log(chalk.red(`Final Errors: ${errorLinks.length} (This is your final, much smaller, manual list)`));

    // Generate the same report format
    let reportContent = `--- REDIRECTED LINKS TO COPY (${redirectedLinks.length}) ---\n`;
    redirectedLinks.forEach(link => {
        reportContent += `  '${link.original}': '${link.final}',\n`;
    });
    reportContent += `\n\n--- FINAL ERROR LINKS TO INVESTIGATE (${errorLinks.length}) ---\n`;
    errorLinks.forEach(link => {
        reportContent += `// ERROR: ${link.url} (Reason: ${link.reason})\n`;
    });

    fs.writeFileSync(REPORT_FILE, reportContent);
    console.log(chalk.cyan.bold(`\nReport saved to ${REPORT_FILE}. Use this with the fixer script.`));
}

main();