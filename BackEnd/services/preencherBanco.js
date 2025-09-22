// services/preencherBanco.js
const axios = require('axios');
const { sequelize, Card, CardSet, CardImage, CardPrice } = require('../models/association');

class PreencherBanco {
  constructor() {
    this.baseUrl = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
    this.batchSize = 100; // Aumentei para ser mais eficiente
  }

  async syncDatabase() {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexão com banco estabelecida');
      
      // Sincronizar antes de popular
      await sequelize.sync({ alter: true });
      console.log('✅ Banco sincronizado');
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao sincronizar banco:', error);
      return false;
    }
  }

  // Função auxiliar para delay
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Parse seguro de preços
  parsePrice(priceString) {
    if (!priceString || priceString === '0.00' || priceString === '') return 0.0;
    const price = parseFloat(priceString);
    return isNaN(price) ? 0.0 : price;
  }

  async populateDatabase() {
    try {
      console.log('🚀 Iniciando população do banco de dados...');
      
      // Sincronizar primeiro
      const synced = await this.syncDatabase();
      if (!synced) {
        throw new Error('Falha na sincronização do banco');
      }

      let offset = 0;
      let totalProcessed = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        console.log(`🔄 Buscando cards de ${offset + 1} a ${offset + this.batchSize}...`);
        
        try {
          const response = await axios.get(this.baseUrl, {
            params: { 
              num: this.batchSize, 
              offset: offset,
              misc: 'yes' // Para garantir todos os dados
            }
          });

          const cardsData = response.data.data;
          
          if (!cardsData || cardsData.length === 0) {
            hasMoreData = false;
            console.log('📭 Nenhum card encontrado, finalizando...');
            break;
          }

          console.log(`📥 Encontrados ${cardsData.length} cards nesta página`);
          
          // Processar cada card
          for (const cardData of cardsData) {
            try {
              await this.processCardData(cardData);
              totalProcessed++;
            } catch (cardError) {
              console.error(`❌ Erro ao processar card ${cardData.id || 'N/A'}:`, cardError.message);
            }
          }

          // Verificar se há mais dados
          if (cardsData.length < this.batchSize) {
            hasMoreData = false;
            console.log('🏁 Última página alcançada');
          } else {
            offset += this.batchSize;
          }

          // Pequena pausa para não sobrecarregar a API
          await this.sleep(500);
          
          console.log(`✅ Página processada. Total: ${totalProcessed} cards`);

        } catch (batchError) {
          console.error(`❌ Erro no lote offset ${offset}:`, batchError.message);
          // Continuar para o próximo lote mesmo com erro
          offset += this.batchSize;
        }
      }

      console.log(`🎉 População concluída com sucesso!`);
      console.log(`📊 Total de cards processados: ${totalProcessed}`);
      
      return { success: true, totalProcessed };
      
    } catch (error) {
      console.error('💥 Erro fatal na população do banco:', error);
      throw error;
    }
  }

  async processCardData(cardData) {
    return await sequelize.transaction(async (transaction) => {
      // Verificar se card já existe
      const existingCard = await Card.findByPk(cardData.id, { transaction });
      
      if (existingCard) {
        await this.updateCard(existingCard, cardData, transaction);
      } else {
        await this.createCard(cardData, transaction);
      }
    });
  }

  async createCard(cardData, transaction) {
    // Criar card principal
    const card = await Card.create({
      id: cardData.id,
      name: cardData.name,
      type: cardData.type,
      frameType: cardData.frameType,
      desc: cardData.desc,
      atk: cardData.atk || null,
      def: cardData.def || null,
      level: cardData.level || null,
      rank: cardData.rank || null,
      scale: cardData.scale || null,
      linkval: cardData.linkval || null,
      race: cardData.race,
      attribute: cardData.attribute || null,
      archetype: cardData.archetype || null
    }, { transaction });

    // Criar card sets
    if (cardData.card_sets && cardData.card_sets.length > 0) {
      const cardSetsData = cardData.card_sets.map(set => ({
        set_name: set.set_name || 'Unknown Set',
        set_code: set.set_code || 'UNK-000',
        set_rarity: set.set_rarity || 'Common',
        set_rarity_code: set.set_rarity_code || '(C)',
        set_price: this.parsePrice(set.set_price),
        card_id: card.id
      }));

      await CardSet.bulkCreate(cardSetsData, { 
        transaction,
        ignoreDuplicates: true 
      });
    }

    // Criar card images
    if (cardData.card_images && cardData.card_images.length > 0) {
      const cardImagesData = cardData.card_images.map(image => ({
        card_id: card.id,
        image_url: image.image_url || '',
        image_url_small: image.image_url_small || null,
        image_url_cropped: image.image_url_cropped || null
      }));

      await CardImage.bulkCreate(cardImagesData, { 
        transaction,
        ignoreDuplicates: true 
      });
    }

    // Criar card prices
    if (cardData.card_prices && cardData.card_prices.length > 0) {
      const priceData = cardData.card_prices[0];
      await CardPrice.create({
        card_id: card.id,
        cardmarket_price: this.parsePrice(priceData.cardmarket_price),
        tcgplayer_price: this.parsePrice(priceData.tcgplayer_price),
        ebay_price: this.parsePrice(priceData.ebay_price),
        amazon_price: this.parsePrice(priceData.amazon_price),
        coolstuffinc_price: this.parsePrice(priceData.coolstuffinc_price)
      }, { 
        transaction,
        ignoreDuplicates: true 
      });
    }

    console.log(`✅ Card criado: ${card.id} - ${card.name}`);
  }

  async updateCard(existingCard, cardData, transaction) {
    // Atualizar card principal
    await existingCard.update({
      name: cardData.name,
      type: cardData.type,
      frameType: cardData.frameType,
      desc: cardData.desc,
      atk: cardData.atk || null,
      def: cardData.def || null,
      level: cardData.level || null,
      rank: cardData.rank || null,
      scale: cardData.scale || null,
      linkval: cardData.linkval || null,
      race: cardData.race,
      attribute: cardData.attribute || null,
      archetype: cardData.archetype || null
    }, { transaction });

    // Remover dados antigos
    await CardSet.destroy({ where: { card_id: existingCard.id }, transaction });
    await CardImage.destroy({ where: { card_id: existingCard.id }, transaction });
    await CardPrice.destroy({ where: { card_id: existingCard.id }, transaction });

    // Recriar dados relacionados
    if (cardData.card_sets && cardData.card_sets.length > 0) {
      const cardSetsData = cardData.card_sets.map(set => ({
        set_name: set.set_name || 'Unknown Set',
        set_code: set.set_code || 'UNK-000',
        set_rarity: set.set_rarity || 'Common',
        set_rarity_code: set.set_rarity_code || '(C)',
        set_price: this.parsePrice(set.set_price),
        card_id: existingCard.id
      }));

      await CardSet.bulkCreate(cardSetsData, { transaction });
    }

    if (cardData.card_images && cardData.card_images.length > 0) {
      const cardImagesData = cardData.card_images.map(image => ({
        card_id: existingCard.id,
        image_url: image.image_url || '',
        image_url_small: image.image_url_small || null,
        image_url_cropped: image.image_url_cropped || null
      }));

      await CardImage.bulkCreate(cardImagesData, { transaction });
    }

    if (cardData.card_prices && cardData.card_prices.length > 0) {
      const priceData = cardData.card_prices[0];
      await CardPrice.create({
        card_id: existingCard.id,
        cardmarket_price: this.parsePrice(priceData.cardmarket_price),
        tcgplayer_price: this.parsePrice(priceData.tcgplayer_price),
        ebay_price: this.parsePrice(priceData.ebay_price),
        amazon_price: this.parsePrice(priceData.amazon_price),
        coolstuffinc_price: this.parsePrice(priceData.coolstuffinc_price)
      }, { transaction });
    }

    console.log(`🔄 Card atualizado: ${existingCard.id} - ${existingCard.name}`);
  }

  // Método para popular apenas um card específico (útil para testes)
  async populateSingleCard(cardId) {
    try {
      console.log(`🔄 Buscando card ${cardId}...`);
      
      const response = await axios.get(this.baseUrl, {
        params: { id: cardId }
      });

      if (response.data.data && response.data.data.length > 0) {
        await this.processCardData(response.data.data[0]);
        console.log(`✅ Card ${cardId} processado com sucesso!`);
        return true;
      } else {
        console.log(`❌ Card ${cardId} não encontrado`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar card ${cardId}:`, error.message);
      return false;
    }
  }
}

module.exports = new PreencherBanco();