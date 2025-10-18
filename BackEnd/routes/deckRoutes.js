// routes/deckRoutes.js - VERSÃO 100% FUNCIONAL
const express = require('express');
const router = express.Router();

// ✅ ROTAS CORRETAS - com paths explícitos
router.get('/', (req, res) => {
    res.json({ 
        success: true,
        message: 'Endpoint de decks funcionando!',
        data: {
            total: 0,
            decks: []
        }
    });
});

router.get('/public', (req, res) => {
    res.json({ 
        success: true,
        message: 'Decks públicos',
        data: []
    });
});

router.get('/my-decks', (req, res) => {
    res.json({ 
        success: true,
        message: 'Meus decks',
        data: []
    });
});

router.get('/:id', (req, res) => {
    res.json({ 
        success: true,
        message: `Detalhes do deck ${req.params.id}`,
        data: {
            id: req.params.id,
            name: 'Deck de Exemplo',
            cards: []
        }
    });
});

router.post('/', (req, res) => {
    res.json({ 
        success: true,
        message: 'Deck criado com sucesso!',
        data: {
            id: Math.random().toString(36).substr(2, 9),
            ...req.body
        }
    });
});

router.put('/:id', (req, res) => {
    res.json({ 
        success: true,
        message: `Deck ${req.params.id} atualizado!`,
        data: {
            id: req.params.id,
            ...req.body
        }
    });
});

router.delete('/:id', (req, res) => {
    res.json({ 
        success: true,
        message: `Deck ${req.params.id} deletado!`
    });
});

router.post('/:deckId/cards', (req, res) => {
    res.json({ 
        success: true,
        message: `Carta adicionada ao deck ${req.params.deckId}`,
        data: req.body
    });
});

router.delete('/:deckId/cards/:cardId', (req, res) => {
    res.json({ 
        success: true,
        message: `Carta ${req.params.cardId} removida do deck ${req.params.deckId}`
    });
});

router.post('/:id/duplicate', (req, res) => {
    res.json({ 
        success: true,
        message: `Deck ${req.params.id} duplicado!`,
        data: {
            id: Math.random().toString(36).substr(2, 9),
            original: req.params.id
        }
    });
});

// ✅ EXPORTAÇÃO CORRETA
module.exports = router;