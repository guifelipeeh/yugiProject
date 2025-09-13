require ('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const animationRotas = require('./routes/animationRoutes');
const sequelize = require('./db/database');

const card = require('./models/card');
const cardprice = require('./models/CardPrice');
const cardset = require('./models/CardSet');
const cardimage = require('./models/CardImage');

async function sincronizarTabelas() {
    await card.sync({ alter: true });
    console.log('✅ Tabela Card sincronizada com sucesso.');

 await cardprice.sync({ alter: true });
    console.log('✅ Tabela Cardprice sincronizada com sucesso.');
 await cardset.sync({ alter: true });
    console.log('✅ Tabela cardset sincronizada com sucesso.');
 await cardimage.sync({ alter: true });
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
