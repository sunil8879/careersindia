const fs = require("fs");
const fetch = require("node-fetch");

// Load the HTML file
let data = fs.readFileSync("top_vocational.html", "utf8");

// Extract all URLs
let websites = [...new Set(data.match(/https?:\/\/[^\s"']+/g))];

console.log("🔎 Found", websites.length, "websites...");

// Dictionary of known corrections (add as you find them)
const corrections = {
  "http://sbppoly.ac.in": "https://www.sbmp.ac.in/",
  "http://nmcollege.com": "https://nmcollege.in/",
  // add more here...
};

async function verifyAndFix() {
  let updatedData = data;
  let deadLinks = [];

  for (let site of websites) {
    let correctSite = corrections[site] || site;

    try {
      const response = await fetch(correctSite, { method: "HEAD", timeout: 5000 });

      if (response.ok) {
        console.log("✅ WORKING:", correctSite);
        // Replace old with correct if in dictionary
        if (correctSite !== site) {
          updatedData = updatedData.replace(new RegExp(site, "g"), correctSite);
        }
      } else {
        console.log("⚠️ ERROR:", site, "Status:", response.status);
        deadLinks.push(site);
      }
    } catch (err) {
      console.log("❌ DEAD:", site, "-", err.message);
      deadLinks.push(site);
    }
  }

  // Save updated file
  fs.writeFileSync("top_vocational_fixed.html", updatedData, "utf8");
  console.log("\n✅ Updated file saved as top_vocational_fixed.html");

  // Save dead links for manual checking
  if (deadLinks.length) {
    fs.writeFileSync("dead_links.txt", deadLinks.join("\n"), "utf8");
    console.log("❌ Dead links saved in dead_links.txt");
  }
}

verifyAndFix();
