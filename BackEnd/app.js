require ('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const animationRotas = require('./routes/animationRoutes');

app.use(animationRotas);

app.use(cors());
app.use(express.json());




async function startServer() {

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
    
}

startServer();