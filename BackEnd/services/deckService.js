// services/cardService.js
const { Card, CardSet, CardImage, CardPrice } = require('../models/association');

class CardService {
  async searchCards(filters = {}) {
    try {
      const { 
        name, 
        type, 
        race, 
        attribute, 
        archetype,
        atk_min, 
        atk_max,
        level,
        page = 1, 
        limit = 20 
      } = filters;

      const offset = (page - 1) * limit;
      const where = {};

      if (name) where.name = { [Op.like]: `%${name}%` };
      if (type) where.type = type;
      if (race) where.race = race;
      if (attribute) where.attribute = attribute;
      if (archetype) where.archetype = archetype;
      if (level) where.level = level;
      
      if (atk_min !== undefined || atk_max !== undefined) {
        where.atk = {};
        if (atk_min !== undefined) where.atk[Op.gte] = atk_min;
        if (atk_max !== undefined) where.atk[Op.lte] = atk_max;
      }

      const { count, rows: cards } = await Card.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['name', 'ASC']],
        include: [
          {
            model: CardSet,
            as: 'card_sets',
            attributes: ['set_name', 'set_code', 'set_rarity']
          },
          {
            model: CardImage,
            as: 'card_images',
            attributes: ['image_url_small'],
            limit: 1
          }
        ]
      });

      return {
        cards,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      };

    } catch (error) {
      throw new Error(`Erro ao buscar cartas: ${error.message}`);
    }
  }

  async getCardById(cardId) {
    try {
      const card = await Card.findByPk(cardId, {
        include: [
          {
            model: CardSet,
            as: 'card_sets',
            attributes: ['set_name', 'set_code', 'set_rarity', 'set_price']
          },
          {
            model: CardImage,
            as: 'card_images',
            attributes: ['image_url', 'image_url_small', 'image_url_cropped']
          },
          {
            model: CardPrice,
            as: 'card_prices',
            attributes: ['cardmarket_price', 'tcgplayer_price', 'ebay_price']
          }
        ]
      });

      if (!card) {
        throw new Error('Carta não encontrada');
      }

      return card;

    } catch (error) {
      throw new Error(`Erro ao obter carta: ${error.message}`);
    }
  }

  async getRandomCards(limit = 10) {
    try {
      const cards = await Card.findAll({
        order: sequelize.random(),
        limit: parseInt(limit),
        include: [{
          model: CardImage,
          as: 'card_images',
          attributes: ['image_url_small'],
          limit: 1
        }]
      });

      return cards;

    } catch (error) {
      throw new Error(`Erro ao obter cartas aleatórias: ${error.message}`);
    }
  }

  async getCardsBySet(setCode) {
    try {
      const cards = await Card.findAll({
        include: [{
          model: CardSet,
          as: 'card_sets',
          where: { set_code: { [Op.like]: `%${setCode}%` } },
          attributes: []
        }],
        include: [{
          model: CardImage,
          as: 'card_images',
          attributes: ['image_url_small'],
          limit: 1
        }]
      });

      return cards;

    } catch (error) {
      throw new Error(`Erro ao obter cartas do conjunto: ${error.message}`);
    }
  }
}

module.exports = new CardService();