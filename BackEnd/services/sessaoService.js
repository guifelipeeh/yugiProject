
const [Sessao,User] = require('../models/association');



async function criarSessao(userId, token) {
  try {
    const novaSessao = await Sessao.create({    
      userId,
      token
    });
    return novaSessao;
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    throw error;
  }
}
async function encerrarSessao(token) {
  try {
    const resultado = await Sessao.destroy({ where: { token } });
    return resultado;
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    throw error;
  }
}
async function encerrarSessaoPorUserId(userId) {
  try {
    const resultado = await Sessao.destroy({ where: { userId } });    
    return resultado;
  } catch (error) {
    console.error('Erro ao encerrar sessão por userId:', error);
    throw error;
  }
}

async function obterSessaoPorToken(token) {
  try {
    const sessao = await Sessao.findOne({ where: { token }, include: [{ model: User, as: 'user' }] });
    return sessao;
  } catch (error) {
    console.error('Erro ao obter sessão por token:', error);
    throw error;
  }
}
module.exports = {
  criarSessao,
  encerrarSessao,
  obterSessaoPorToken,
  encerrarSessaoPorUserId
};
