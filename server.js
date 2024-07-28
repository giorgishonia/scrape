const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Utility function to wait for a specified time
const waitForTimeout = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

app.get('/scrape', async (req, res) => {
  try {
    // Launch the browser
    const browser = await puppeteer.launch({ headless: false }); // headless: false to see the browser
    const page = await browser.newPage();

    // Navigate to the login page
    await page.goto('https://classroom.btu.edu.ge/ge/student/me/schedule', { waitUntil: 'networkidle2' });

    // Wait for the user to log in manually
    console.log('Please log in to the classroom. Waiting for login...');

    // Wait for login by checking the URL change
    await page.waitForFunction(
      'window.location.href.includes("classroom.btu.edu.ge/ge/student/me")',
      { timeout: 0 }
    );

    // Navigate to the schedule page after login
    await page.goto('https://classroom.btu.edu.ge/ge/student/me/schedule', { waitUntil: 'networkidle2' });

    // Wait an additional 3 seconds for the page to fully load
    await waitForTimeout(3000);

    // Wait for the table to load
    await page.waitForSelector('table#groups');

    // Scrape the table data
    const tableData = await page.evaluate(() => {
      const data = [];
      const rows = document.querySelectorAll('table#groups tr');
      let currentDay = '';

      rows.forEach(row => {
        if (row.querySelector('h4')) {
          currentDay = row.querySelector('h4').innerText.trim();
        } else {
          const cells = row.querySelectorAll('td');
          const rowData = Array.from(cells).map(cell => cell.innerText.trim());
          if (rowData.length > 0) {
            data.push([currentDay, ...rowData]);
          }
        }
      });

      return data;
    });

    // Navigate to the personal resume page
    await page.goto('https://classroom.btu.edu.ge/ge/student/resume/personal', { waitUntil: 'networkidle2' });

    // Wait an additional 3 seconds for the page to fully load
    await waitForTimeout(3000);

    // Scrape the personal information
    const personalInfo = await page.evaluate(() => {
      const info = {};
      const rows = document.querySelectorAll('div.row.form-group');

      rows.forEach(row => {
        const label = row.querySelector('label');
        const value = row.querySelector('div');

        if (label && value) {
          const labelText = label.innerText.trim();
          const valueText = value.innerText.trim();

          if (labelText.includes('სქესი:')) {
            info.gender = valueText;
          }

          if (labelText.includes('დაბ. თარიღი:')) {
            info.birthDate = valueText;
          }
        }
      });

      return info;
    });

    // Close the browser
    await browser.close();

    // Send the scraped data as the response
    res.json({ schedule: tableData, personalInfo: personalInfo });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error scraping data');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
