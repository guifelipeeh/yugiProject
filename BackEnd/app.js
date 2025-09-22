require ('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const animationRotas = require('./routes/animationRoutes');
const sequelize = require('./db/database');
const populateRoutes = require('./routes/populateRoutes')
const { Card, CardSet, CardImage, CardPrice } = require('./models/association');

async function sincronizarTabelas() {
    await Card.sync({ alter: true });
    console.log('✅ Tabela Card sincronizada com sucesso.');

 await CardPrice.sync({ alter: true });
    console.log('✅ Tabela Cardprice sincronizada com sucesso.');
 await CardSet.sync({ alter: true });
    console.log('✅ Tabela cardset sincronizada com sucesso.');
 await CardImage.sync({ alter: true });
    console.log('✅ Tabela cardimage sincronizada com sucesso.');     

}





async function inicializarDataBase() {
    
    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados estabelecida com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
    }
}

app.use('/Banco',populateRoutes);
app.use('/yugi',animationRotas);

app.use(cors());
app.use(express.json());







async function startServer() {

    await inicializarDataBase();
    await sincronizarTabelas();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
    
}

startServer();
