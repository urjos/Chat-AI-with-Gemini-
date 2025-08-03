const pdfParse = require('pdf-parse');
const fs = require('node:fs/promises');

async function extractTextFromPdf(pdfPath) {
    try {
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error al leer el PDF:', error);
        return null;
    }
}

module.exports = { extractTextFromPdf };