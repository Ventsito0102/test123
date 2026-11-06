const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

// Четене на данните
app.get('/api/data', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            transactions: [],
            cards: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
    const fileData = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(fileData));
});

// Записване на данните
app.post('/api/data', (req, res) => {
    const newData = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
    res.json({ success: true });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Сървърът работи на порт ' + listener.address().port);
});