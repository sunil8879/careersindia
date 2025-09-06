const fs = require('fs');
const axios = require('axios');
const chalk = require('chalk'); // Ensure you have run 'npm install chalk@4'

// --- CONFIGURATION ---
const INPUT_FILE = 'input_data.txt'; // The file with your 6500 entries
const REPORT_FILE = 'link_report.txt';
const REQUEST_TIMEOUT = 10000;

async function checkLink(url) {
    try {
        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const finalUrl = response.request.res.responseUrl;
        if (finalUrl && finalUrl !== url) {
            return { status: 'REDIRECT', original: url, final: finalUrl };
        }
        return { status: 'OK', url: url };
    } catch (error) {
        let reason = error.code || error.message;
        return { status: 'ERROR', url: url, reason: reason };
    }
}

async function main() {
    console.log(chalk.blue(`Reading raw data from ${INPUT_FILE}...`));
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(chalk.red(`ERROR: Input file not found! Make sure '${INPUT_FILE}' is in the same folder.`));
        return;
    }
    
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');

    // Use a Regular Expression to find all URLs in the text file
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const foundLinks = fileContent.match(urlRegex) || [];
    
    const uniqueLinks = [...new Set(foundLinks)];

    if (uniqueLinks.length === 0) {
        console.error(chalk.red('Found 0 URLs in the file. Please check the file content.'));
        return;
    }

    console.log(chalk.blue(`Found ${uniqueLinks.length} unique URLs to check. This will take a while...`));

    const promises = uniqueLinks.map(link => checkLink(link));
    const results = await Promise.all(promises);

    const okLinks = [], redirectedLinks = [], errorLinks = [];
    results.forEach(data => {
        if (data.status === 'OK') okLinks.push(data);
        if (data.status === 'REDIRECT') redirectedLinks.push(data);
        if (data.status === 'ERROR') errorLinks.push(data);
    });

    console.log(chalk.green(`\n--- ANALYSIS COMPLETE ---`));
    console.log(chalk.green(`OK: ${okLinks.length}`));
    console.log(chalk.yellow(`Redirected: ${redirectedLinks.length}`));
    console.log(chalk.red(`Errors: ${errorLinks.length}`));

    // --- GENERATE A COPY-PASTE READY REPORT ---
    let reportContent = `LINK ANALYSIS REPORT for ${INPUT_FILE}\n`;
    reportContent += `==============================================\n\n`;
    reportContent += `--- REDIRECTED LINKS TO COPY (${redirectedLinks.length}) ---\n`;
    reportContent += `// Copy everything from the line below into your fixer script's correctionMap\n`;
    redirectedLinks.forEach(link => {
        reportContent += `  '${link.original}': '${link.final}',\n`;
    });
    reportContent += `\n\n--- ERROR LINKS TO INVESTIGATE (${errorLinks.length}) ---\n`;
    errorLinks.forEach(link => {
        reportContent += `// ERROR: ${link.url} (Reason: ${link.reason})\n`;
    });

    fs.writeFileSync(REPORT_FILE, reportContent);
    console.log(chalk.cyan(`\nReport saved to ${REPORT_FILE}.`));
}

main();