// Arquivo: cardService.js

const { Op, Sequelize } = require('sequelize'); 
const { Card, CardSet, CardImage } = require('../models/association');

// Função para buscar cards por nome
async function getCardsByName(name) {
   
    const searchName = name ? name.toLowerCase() : ''; 
    
    try {
        const cards = await Card.findAll({
            where: {
                [Op.and]: Sequelize.where(
                    Sequelize.fn('LOWER', Sequelize.col('name')), 
                    {
                        [Op.like]: `%${searchName}%` 
                    }
                )
            },
            include: [
                {
                    model: CardSet,
                    as: 'card_sets',
                    attributes: ['id', 'set_name', 'set_code', 'set_rarity', 'set_price']
                },
                {
                    model: CardImage,
                    as: 'card_images',
                    // REMOVA O image_type E USE APENAS OS CAMPOS QUE EXISTEM
                    attributes: ['id', 'image_url', 'image_url_small'] 
                }
            ]
        });
        console.log(JSON.stringify(cards, null, 2));
        
        return cards;
    } catch (error) {
        console.error('Erro ao buscar cards por nome:', error);
        throw error;
    }
}

module.exports = {
    getCardsByName
};