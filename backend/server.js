// server.js
require('dotenv').config();
const fs = require('fs').promises; // Asegúrate de que esto esté al inicio

const express = require('express');
const cors = require('cors');

const { model } = require('./gemini_service'); 
const { extractTextFromPdf } = require('./pdf_processing.js');

const { SpeechClient } = require('@google-cloud/speech'); 
const multer = require('multer'); 

const upload = multer({ storage: multer.memoryStorage() }); 

const speechClient = new SpeechClient();


const pdfFilePath = './data/mass-info.pdf';
const chats = new Map();

let companyInfo = null;

const app = express();
const port = process.env.PORT || 4000; 

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express.json());

async function loadCompanyInfo() {
    try { 
        companyInfo = await extractTextFromPdf(pdfFilePath);
        if (companyInfo) {
            console.log('Información de la empresa cargada del PDF.');
        } else {
            console.error('No se pudo cargar la información de la empresa. El PDF podría estar vacío o haber un error de lectura.');
        }
    } catch (error) {
        console.error('Error al cargar la información del PDF:', error);
        console.error('Asegúrate de que la ruta del PDF sea correcta:', pdfFilePath);
        console.error('Y de que el archivo existe y es legible.');
    }
}

loadCompanyInfo();

app.post('/ask', async (req, res) => {
    const userQuestion = req.body.question;
    const sessionId = req.body.sessionId;

    if (!userQuestion) {
        return res.status(400).send({ error: 'La pregunta es obligatoria.' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
        let prompt = userQuestion;
        if (companyInfo) {
            prompt = `
            Tu nombre: Massi
            Tu género: Femenino
            Tono: Formal y amigable  
            Estilo: Claro y conciso
            
            Contexto: Eres un asistente virtual en tiempo real de "Tienda Mass", una tienda que ofrece productos y servicios a clientes. Tu objetivo es ayudar a los clientes resolviendo sus dudas de forma rápida, clara y amable.

            Instrucciones:  
            - Usa un lenguaje simple y directo.  
            - Responde únicamente lo necesario para resolver la duda del cliente.  
            - No repitas la pregunta del cliente.  
            - Si no sabes la respuesta, indica amablemente que el cliente puede consultar con un asesor humano.
            
            Información de la empresa: "${companyInfo}"  
            Pregunta del cliente: "${userQuestion}"`;
        }

        let chat;
        if (chats.has(sessionId)) {
          chat = chats.get(sessionId);
        } else {
          chat = await model.startChat();
          chats.set(sessionId, chat);
        }

        const result = await chat.sendMessageStream(prompt);

        for await (const chunk of result.stream) {
            const text = chunk.text();

            if (text) {
                res.write(text);
            }
        }

        res.end();
    } catch (error) {
        console.error('Error en el endpoint /ask:', error);
        res.status(500).send({ error: 'Error al procesar la pregunta.' });
    }
});

app.post('/transcribe-audio', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo de audio.');
    }

    // El buffer de audio de Multer se convierte a base64, que es lo que espera Google Speech-to-Text
    const audioBytes = req.file.buffer.toString('base64'); 

    const audio = {
        content: audioBytes,
    };

    // - Para archivos .webm grabados desde el navegador (MediaRecorder): encoding: 'WEBM_OPUS', sampleRateHertz: 48000
    // - Para archivos .wav (PCM sin comprimir): encoding: 'LINEAR16', sampleRateHertz: 16000 o 44100
    // - Para archivos .mp3: encoding: 'MP3'
    const config = {
        encoding: 'WEBM_OPUS', 
        sampleRateHertz: 48000, 
        languageCode: 'es-PE',  
    };

    const request = {
        audio: audio,
        config: config,
    };

    try {
        // Realiza la transcripción
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n'); 

        res.json({ transcript: transcription });
    } catch (error) {
        console.error('ERROR al transcribir audio:', error);
        res.status(500).send(`Error al transcribir el audio. Asegúrate de que el formato (encoding, sampleRateHertz) es correcto. Detalles: ${error.message}`);
    }
});

app.get('/', (req, res) => {
    res.send('Servidor del asistente de Mass está funcionando!');
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});