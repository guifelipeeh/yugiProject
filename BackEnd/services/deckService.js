// services/cardService.js
const { Op, Sequelize } = require('sequelize');
const { Card, CardSet, CardImage, CardPrice, Deck, DeckCard } = require('../models/association');

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
            attributes: ['image_url', 'image_url_small'],
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

  async saveDeck(deckData) {
    try {
      const { name, description, userId, mainDeck, extraDeck, sideDeck } = deckData;
      
      // Criar o deck
      const newDeck = await Deck.create({
        name,
        description: description || '',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Função para adicionar cartas ao deck
      const addCardsToDeck = async (cards, deckType) => {
        if (!cards || cards.length === 0) return;
        
        const deckCardsData = cards.map(card => ({
          deck_id: newDeck.id,
          card_id: card.id,
          deck_type: deckType,
          quantity: card.quantity || 1,
          created_at: new Date()
        }));

        await DeckCard.bulkCreate(deckCardsData);
      };

      // Adicionar cartas de cada seção
      await addCardsToDeck(mainDeck, 'main');
      await addCardsToDeck(extraDeck, 'extra');
      await addCardsToDeck(sideDeck, 'side');

      // Recuperar o deck completo com as cartas
      const completeDeck = await this.getDeckById(newDeck.id);
      
      return completeDeck;

    } catch (error) {
      throw new Error(`Erro ao salvar deck: ${error.message}`);
    }
  }

  async updateDeck(deckId, deckData) {
    try {
      const { name, description, mainDeck, extraDeck, sideDeck } = deckData;
      
      // Atualizar informações básicas do deck
      await Deck.update(
        {
          name,
          description: description || '',
          updated_at: new Date()
        },
        { where: { id: deckId } }
      );

      // Remover cartas antigas
      await DeckCard.destroy({ where: { deck_id: deckId } });

      // Adicionar novas cartas
      const addCardsToDeck = async (cards, deckType) => {
        if (!cards || cards.length === 0) return;
        
        const deckCardsData = cards.map(card => ({
          deck_id: deckId,
          card_id: card.id,
          deck_type: deckType,
          quantity: card.quantity || 1,
          created_at: new Date()
        }));

        await DeckCard.bulkCreate(deckCardsData);
      };

      await addCardsToDeck(mainDeck, 'main');
      await addCardsToDeck(extraDeck, 'extra');
      await addCardsToDeck(sideDeck, 'side');

      return await this.getDeckById(deckId);

    } catch (error) {
      throw new Error(`Erro ao atualizar deck: ${error.message}`);
    }
  }

  async getDeckById(deckId) {
    try {
      const deck = await Deck.findByPk(deckId, {
        include: [
          {
            model: DeckCard,
            as: 'deck_cards',
            include: [
              {
                model: Card,
                as: 'card',
                include: [
                  {
                    model: CardImage,
                    as: 'card_images',
                    attributes: ['image_url', 'image_url_small'],
                    limit: 1
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!deck) {
        throw new Error('Deck não encontrado');
      }

      // Organizar cartas por tipo de deck
      const organizedDeck = {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        user_id: deck.user_id,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        main: [],
        extra: [],
        side: []
      };

      deck.deck_cards.forEach(deckCard => {
        const cardData = {
          ...deckCard.card.toJSON(),
          quantity: deckCard.quantity
        };

        switch (deckCard.deck_type) {
          case 'main':
            organizedDeck.main.push(cardData);
            break;
          case 'extra':
            organizedDeck.extra.push(cardData);
            break;
          case 'side':
            organizedDeck.side.push(cardData);
            break;
        }
      });

      return organizedDeck;

    } catch (error) {
      throw new Error(`Erro ao obter deck: ${error.message}`);
    }
  }

  async getUserDecks(userId) {
    try {
      const decks = await Deck.findAll({
        where: { user_id: userId },
        include: [
          {
            model: DeckCard,
            as: 'deck_cards',
            attributes: ['deck_type'],
            include: [
              {
                model: Card,
                as: 'card',
                attributes: ['id', 'name', 'type'],
                include: [
                  {
                    model: CardImage,
                    as: 'card_images',
                    attributes: ['image_url_small'],
                    limit: 1
                  }
                ]
              }
            ]
          }
        ],
        order: [['updated_at', 'DESC']]
      });

      // Processar decks para contar cartas
      const processedDecks = decks.map(deck => {
        const deckJson = deck.toJSON();
        const mainCount = deckJson.deck_cards.filter(dc => dc.deck_type === 'main').length;
        const extraCount = deckJson.deck_cards.filter(dc => dc.deck_type === 'extra').length;
        const sideCount = deckJson.deck_cards.filter(dc => dc.deck_type === 'side').length;

        // Pegar algumas cartas para preview
        const previewCards = deckJson.deck_cards.slice(0, 5).map(dc => ({
          id: dc.card.id,
          name: dc.card.name,
          image: dc.card.card_images[0]?.image_url_small
        }));

        return {
          id: deckJson.id,
          name: deckJson.name,
          description: deckJson.description,
          card_count: mainCount + extraCount + sideCount,
          main_count: mainCount,
          extra_count: extraCount,
          side_count: sideCount,
          preview_cards: previewCards,
          updated_at: deckJson.updated_at
        };
      });

      return processedDecks;

    } catch (error) {
      throw new Error(`Erro ao obter decks do usuário: ${error.message}`);
    }
  }

  async deleteDeck(deckId) {
    try {
      // Deletar primeiro as cartas do deck
      await DeckCard.destroy({ where: { deck_id: deckId } });
      
      // Depois deletar o deck
      const deleted = await Deck.destroy({ where: { id: deckId } });
      
      if (!deleted) {
        throw new Error('Deck não encontrado');
      }

      return { message: 'Deck deletado com sucesso' };

    } catch (error) {
      throw new Error(`Erro ao deletar deck: ${error.message}`);
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
        order: Sequelize.literal('RAND()'),
        limit: parseInt(limit),
        include: [{
          model: CardImage,
          as: 'card_images',
          attributes: ['image_url', 'image_url_small'],
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
        include: [
          {
            model: CardSet,
            as: 'card_sets',
            where: { set_code: { [Op.like]: `%${setCode}%` } },
            attributes: []
          },
          {
            model: CardImage,
            as: 'card_images',
            attributes: ['image_url', 'image_url_small'],
            limit: 1
          }
        ]
      });

      return cards;

    } catch (error) {
      throw new Error(`Erro ao obter cartas do conjunto: ${error.message}`);
    }
  }

  // Nova função para validar deck
  async validateDeck(deckData) {
    const { mainDeck = [], extraDeck = [], sideDeck = [] } = deckData;
    
    const errors = [];

    // Validar tamanho do deck principal
    const mainCount = mainDeck.reduce((sum, card) => sum + (card.quantity || 1), 0);
    if (mainCount < 40) {
      errors.push('Deck principal deve ter pelo menos 40 cartas');
    }
    if (mainCount > 60) {
      errors.push('Deck principal não pode ter mais de 60 cartas');
    }

    // Validar tamanho do deck extra
    const extraCount = extraDeck.reduce((sum, card) => sum + (card.quantity || 1), 0);
    if (extraCount > 15) {
      errors.push('Deck extra não pode ter mais de 15 cartas');
    }

    // Validar tamanho do deck side
    const sideCount = sideDeck.reduce((sum, card) => sum + (card.quantity || 1), 0);
    if (sideCount > 15) {
      errors.push('Deck side não pode ter mais de 15 cartas');
    }

    // Validar cartas proibidas/limitadas (implementar lógica da banlist)
    const cardCounts = {};
    const allCards = [...mainDeck, ...extraDeck, ...sideDeck];
    
    allCards.forEach(card => {
      cardCounts[card.id] = (cardCounts[card.id] || 0) + (card.quantity || 1);
    });

    // Aqui você pode adicionar validações da banlist
    for (const [cardId, count] of Object.entries(cardCounts)) {
      if (count > 3) {
        errors.push(`Carta com ID ${cardId} excede o limite de 3 cópias`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      counts: {
        main: mainCount,
        extra: extraCount,
        side: sideCount
      }
    };
  }
}

module.exports = new CardService();