const puppeteer = require("puppeteer");

const generatePdf = async (data) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(`
    <h1>Reporte de Balance</h1>
    <p>Ingresos: ${data.ingresos}</p>
    <p>Egresos: ${data.egresos}</p>
    <p>Activos: ${data.activos}</p>
    <p>Pasivos: ${data.pasivos}</p>
  `);
    const pdf = await page.pdf({ format: "A4" });
    await browser.close();
    return pdf;
};

module.exports = generatePdf;
