  const puppeteer = require('puppeteer');
  const xlsx = require('xlsx');

  // Utility function to wait for a specified time
  const waitForTimeout = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  };

  (async () => {
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

    // Wait an additional 10 seconds for the page to fully load
    await waitForTimeout(10000);

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

    // Create a new workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(tableData);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Schedule');

    // Write the workbook to an Excel file
    xlsx.writeFile(wb, 'schedule.xlsx');

    // Close the browser
    await browser.close();

    console.log('Scraping completed and data saved to schedule.xlsx');
  })();
