// controllers/deckController.js
const deckService = require('../services/deckService');

const deckController = {
  async createDeck(req, res) {
    try {
      const deck = await deckService.createDeck(req.body, req.userId);
      
      res.status(201).json({
        success: true,
        message: 'Deck criado com sucesso',
        data: { deck }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async getUserDecks(req, res) {
    try {
      const result = await deckService.getUserDecks(req.userId, req.query);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async getDeck(req, res) {
    try {
      const deck = await deckService.getDeckById(req.params.id, req.userId);
      
      res.json({
        success: true,
        data: { deck }
      });

    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  async addCardToDeck(req, res) {
    try {
      const deckCard = await deckService.addCardToDeck(
        req.params.deckId, 
        req.body, 
        req.userId
      );
      
      res.status(201).json({
        success: true,
        message: 'Carta adicionada ao deck com sucesso',
        data: { deckCard }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async removeCardFromDeck(req, res) {
    try {
      const result = await deckService.removeCardFromDeck(
        req.params.deckId, 
        req.params.cardId, 
        req.userId
      );
      
      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async updateDeck(req, res) {
    try {
      const deck = await deckService.updateDeck(
        req.params.id, 
        req.body, 
        req.userId
      );
      
      res.json({
        success: true,
        message: 'Deck atualizado com sucesso',
        data: { deck }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async deleteDeck(req, res) {
    try {
      const result = await deckService.deleteDeck(req.params.id, req.userId);
      
      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async getPublicDecks(req, res) {
    try {
      const result = await deckService.getPublicDecks(req.query);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async duplicateDeck(req, res) {
    try {
      const deck = await deckService.duplicateDeck(
        req.params.id, 
        req.userId, 
        req.body.newName
      );
      
      res.status(201).json({
        success: true,
        message: 'Deck duplicado com sucesso',
        data: { deck }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = deckController;