const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');

const app = express();
const port = 3001; // Use a different port than your main backend

// Set up Multer for image uploads
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No image file provided.');
        }

        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(req.file.buffer);
        await worker.terminate();

        // Regex parsing to extract batch number and expiry date
        const batchNumberMatch = text.match(/Batch No\.?\s*([A-Za-z0-9]+)/i);
        const expiryDateMatch = text.match(/Exp\.?\s*(\d{2}\/\d{2})/i); // e.g., 10/25

        const result = {
            extractedText: text,
            batchNumber: batchNumberMatch ? batchNumberMatch[1] : null,
            expiryDate: expiryDateMatch ? expiryDateMatch[1] : null,
        };

        res.json(result);
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).send('Internal Server Error during OCR processing.');
    }
});

app.listen(port, () => {
    console.log(`OCR Service is running on http://localhost:${port}`);
});