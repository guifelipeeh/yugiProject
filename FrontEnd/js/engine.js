// Motor de regras do Duelo YugiProject.
// Módulo puro (sem DOM), usado pelo modo CPU no navegador e pelo servidor no modo online.
//
// Regras resumidas (sistema próprio, simplificado):
// - Cada duelista começa com 8000 PV e 5 cartas na mão.
// - Energia: no início do seu turno sua energia máxima aumenta em 1 (até 10) e é recarregada.
// - Monstros custam energia de acordo com o nível; magias custam 1; baixar armadilha custa 1.
// - Monstros não podem atacar no turno em que entram em campo; cada um ataca uma vez por turno.
// - Ninguém ataca no primeiro turno do duelo.
// - Magias têm efeitos genéricos de acordo com o subtipo; armadilhas disparam sozinhas
//   quando o oponente declara um ataque.
// - Vence quem zerar os PV do oponente ou quando o oponente não puder comprar carta.

export const START_LP = 8000;
export const START_HAND = 5;
export const MAX_HAND = 7;
export const MAX_ENERGY = 10;
export const ZONES = 5;
export const MIN_DECK = 20;
export const MAX_DECK = 60;
export const SUPPORT_AURA = 300;

const EXTRA_TYPES = ["Fusion", "Synchro", "XYZ", "Link"];

export const SPELL_EFFECTS = {
  Normal: { label: "Comprar 1 carta", short: "+1 carta" },
  "Quick-Play": { label: "Causar 600 de dano ao oponente", short: "600 dano" },
  Equip: { label: "Um monstro seu ganha +600 ATK permanente", short: "+600 ATK" },
  Continuous: { label: "Fica em campo: seus monstros ganham +300 ATK", short: "+300 ATK aura" },
  Field: { label: "Fica em campo: seus monstros ganham +300 ATK", short: "+300 ATK aura" },
  Ritual: { label: "Recuperar 1000 PV", short: "+1000 PV" },
};

export const TRAP_EFFECTS = {
  Normal: { label: "Ao ser atacado: destrói o monstro atacante", short: "Destrói atacante" },
  Counter: { label: "Ao ser atacado: anula o ataque e causa 500 de dano", short: "Anula + 500" },
  Continuous: { label: "Ao ser atacado: anula o ataque e o atacante perde 500 ATK", short: "Anula, -500 ATK" },
};

// ---------- Cartas ----------

export function isExtraDeckType(type = "") {
  return EXTRA_TYPES.some((t) => type.includes(t));
}

/** Converte um card da API/DB num card de duelo compacto. Retorna null se não for jogável. */
export function normalizeCard(raw) {
  if (!raw || raw.id == null) return null;
  const type = String(raw.type || "");
  if (isExtraDeckType(type) || type === "Token" || type.includes("Skill")) return null;
  let kind;
  if (type.includes("Spell")) kind = "spell";
  else if (type.includes("Trap")) kind = "trap";
  else if (type.includes("Monster")) kind = "monster";
  else return null;
  const img = raw.card_images?.[0] || {};
  const card = {
    id: Number(raw.id),
    name: String(raw.name || "Carta").slice(0, 80),
    kind,
    sub: String(raw.race || "Normal"),
    attribute: raw.attribute || null,
    img: img.image_url_small || img.image_url || raw.img || null,
    desc: String(raw.desc || "").slice(0, 600),
  };
  if (kind === "monster") {
    card.atk = Math.max(0, Number(raw.atk) || 0);
    card.def = Math.max(0, Number(raw.def) || 0);
    card.level = Math.max(1, Math.min(12, Number(raw.level) || 4));
  } else if (kind === "spell" && !SPELL_EFFECTS[card.sub]) {
    card.sub = "Normal";
  } else if (kind === "trap" && !TRAP_EFFECTS[card.sub]) {
    card.sub = "Normal";
  }
  return card;
}

export function cardCost(card) {
  if (!card) return 0;
  if (card.kind === "monster") return Math.max(1, Math.ceil(card.level * 0.75));
  return 1;
}

export function effectText(card) {
  if (!card) return "";
  if (card.kind === "spell") return SPELL_EFFECTS[card.sub]?.label || "";
  if (card.kind === "trap") return TRAP_EFFECTS[card.sub]?.label || "";
  return "";
}

/** Valida uma lista de cards normalizados para uso em duelo. */
export function validateDuelDeck(cards) {
  const errors = [];
  if (!Array.isArray(cards)) return ["Deck inválido."];
  if (cards.length < MIN_DECK) errors.push(`O deck precisa de pelo menos ${MIN_DECK} cartas jogáveis no Deck Principal (tem ${cards.length}).`);
  if (cards.length > MAX_DECK) errors.push(`O deck pode ter no máximo ${MAX_DECK} cartas.`);
  const counts = {};
  for (const c of cards) counts[c.id] = (counts[c.id] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) if (n > 3) errors.push(`A carta ${id} tem mais de 3 cópias.`);
  if (!cards.some((c) => c.kind === "monster")) errors.push("O deck precisa ter monstros.");
  return errors;
}

// ---------- Estado ----------

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newPlayer(name, deck, startUid) {
  let uid = startUid;
  return {
    player: {
      name,
      lp: START_LP,
      energy: 0,
      maxEnergy: 0,
      deck: deck.map((c) => ({ ...c, uid: uid++ })),
      hand: [],
      monsters: Array(ZONES).fill(null),
      supports: Array(ZONES).fill(null),
      grave: [],
    },
    next: uid,
  };
}

/**
 * Cria um novo duelo.
 * @param {{name:string, deck:object[]}} a primeiro duelista
 * @param {{name:string, deck:object[]}} b segundo duelista
 * @param {() => number} rng gerador aleatório
 */
export function createGame(a, b, rng = Math.random) {
  const p0 = newPlayer(a.name, shuffle([...a.deck], rng), 1);
  const p1 = newPlayer(b.name, shuffle([...b.deck], rng), p0.next);
  const first = rng() < 0.5 ? 0 : 1;
  const state = {
    turn: 1,
    active: first,
    players: [p0.player, p1.player],
    winner: null,
    endReason: null,
    log: [],
    events: [],
    eventSeq: 0,
  };
  for (let i = 0; i < START_HAND; i++) {
    drawCard(state, 0);
    drawCard(state, 1);
  }
  state.events = [];
  startTurn(state, false);
  log(state, `${state.players[first].name} começa o duelo!`);
  return state;
}

function log(state, msg) {
  state.log.push({ t: state.turn, msg });
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
}

function emit(state, ev) {
  state.eventSeq = (state.eventSeq || 0) + 1;
  state.events.push({ id: state.eventSeq, ...ev });
  if (state.events.length > 30) state.events.splice(0, state.events.length - 30);
}

function drawCard(state, seat) {
  const p = state.players[seat];
  if (p.deck.length === 0) return false;
  p.hand.push(p.deck.shift());
  return true;
}

function startTurn(state, draw = true) {
  const seat = state.active;
  const p = state.players[seat];
  p.maxEnergy = Math.min(MAX_ENERGY, p.maxEnergy + 1 + (p.maxEnergy === 0 ? 1 : 0));
  p.energy = p.maxEnergy;
  for (const m of p.monsters) {
    if (m) {
      m.attacked = false;
      m.changedPos = false;
    }
  }
  if (draw) {
    if (!drawCard(state, seat)) {
      finish(state, 1 - seat, `${p.name} não tem cartas para comprar.`);
      return;
    }
  }
  emit(state, { type: "turn", seat, turn: state.turn });
}

function finish(state, winner, reason) {
  if (state.winner != null) return;
  state.winner = winner;
  state.endReason = reason;
  log(state, reason);
  emit(state, { type: "finish", winner });
}

function checkLp(state) {
  const [a, b] = state.players;
  if (a.lp <= 0 && b.lp <= 0) finish(state, "draw", "Empate! Ambos os duelistas chegaram a 0 PV.");
  else if (a.lp <= 0) finish(state, 1, `${b.name} venceu! ${a.name} chegou a 0 PV.`);
  else if (b.lp <= 0) finish(state, 0, `${a.name} venceu! ${b.name} chegou a 0 PV.`);
}

function damage(state, seat, amount) {
  if (amount <= 0) return;
  const p = state.players[seat];
  p.lp = Math.max(0, p.lp - amount);
  emit(state, { type: "damage", seat, amount });
}

export function auraBonus(player) {
  return player.supports.filter((s) => s && !s.faceDown && s.card.kind === "spell").length * SUPPORT_AURA;
}

export function effectiveAtk(player, slot) {
  if (!slot) return 0;
  return Math.max(0, slot.card.atk + (slot.bonus || 0) + auraBonus(player));
}

export function canAttackWith(state, seat, slotIndex) {
  const p = state.players[seat];
  const m = p.monsters[slotIndex];
  if (!m) return false;
  if (state.turn === 1) return false;
  return m.pos === "atk" && !m.attacked && m.summonedTurn < state.turn;
}

function findHand(p, uid) {
  const idx = p.hand.findIndex((c) => c.uid === uid);
  return idx;
}

function sendToGrave(state, seat, card) {
  const { uid, ...rest } = card;
  state.players[seat].grave.push({ ...rest, uid });
}

function destroyMonster(state, seat, index, reason) {
  const p = state.players[seat];
  const m = p.monsters[index];
  if (!m) return;
  p.monsters[index] = null;
  sendToGrave(state, seat, m.card);
  emit(state, { type: "destroy", seat, zone: "monster", index, name: m.card.name, reason });
}

// ---------- Ações ----------

/**
 * Aplica uma ação ao estado (muta o estado). Retorna { ok, error }.
 * Ações:
 *  {type:'summon', uid, pos:'atk'|'def'}
 *  {type:'spell', uid, target?: zoneIndex}
 *  {type:'setTrap', uid}
 *  {type:'position', index}
 *  {type:'attack', index, target: zoneIndex|null}
 *  {type:'end'}
 *  {type:'forfeit'}
 */
export function applyAction(state, seat, action) {
  if (!action || typeof action !== "object") return { ok: false, error: "Ação inválida." };
  if (state.winner != null) return { ok: false, error: "O duelo já terminou." };
  if (action.type === "forfeit") {
    finish(state, 1 - seat, `${state.players[seat].name} desistiu do duelo.`);
    return { ok: true };
  }
  if (state.active !== seat) return { ok: false, error: "Não é o seu turno." };
  const me = state.players[seat];
  const opp = state.players[1 - seat];

  switch (action.type) {
    case "summon": {
      const idx = findHand(me, action.uid);
      if (idx < 0) return { ok: false, error: "Carta não está na mão." };
      const card = me.hand[idx];
      if (card.kind !== "monster") return { ok: false, error: "Só monstros podem ser invocados." };
      const cost = cardCost(card);
      if (me.energy < cost) return { ok: false, error: `Energia insuficiente (custa ${cost}).` };
      const zone = me.monsters.findIndex((m) => !m);
      if (zone < 0) return { ok: false, error: "Sua zona de monstros está cheia." };
      const pos = action.pos === "def" ? "def" : "atk";
      me.energy -= cost;
      me.hand.splice(idx, 1);
      me.monsters[zone] = {
        card,
        pos,
        faceDown: pos === "def",
        summonedTurn: state.turn,
        attacked: false,
        changedPos: false,
        bonus: 0,
      };
      if (pos === "atk") log(state, `${me.name} invocou ${card.name} (ATK ${card.atk}).`);
      else log(state, `${me.name} baixou um monstro em defesa.`);
      emit(state, { type: "summon", seat, index: zone, faceDown: pos === "def" });
      return { ok: true };
    }

    case "spell": {
      const idx = findHand(me, action.uid);
      if (idx < 0) return { ok: false, error: "Carta não está na mão." };
      const card = me.hand[idx];
      if (card.kind !== "spell") return { ok: false, error: "Essa carta não é uma magia." };
      if (me.energy < 1) return { ok: false, error: "Energia insuficiente (custa 1)." };
      const sub = card.sub;
      if (sub === "Equip") {
        const t = Number(action.target);
        if (!Number.isInteger(t) || !me.monsters[t]) return { ok: false, error: "Escolha um monstro seu para equipar." };
        me.energy -= 1;
        me.hand.splice(idx, 1);
        me.monsters[t].bonus = (me.monsters[t].bonus || 0) + 600;
        sendToGrave(state, seat, card);
        log(state, `${me.name} ativou ${card.name}: ${me.monsters[t].card.name} ganhou +600 ATK.`);
        emit(state, { type: "spell", seat, name: card.name, index: t });
        return { ok: true };
      }
      if (sub === "Continuous" || sub === "Field") {
        const zone = me.supports.findIndex((s) => !s);
        if (zone < 0) return { ok: false, error: "Sua zona de suporte está cheia." };
        me.energy -= 1;
        me.hand.splice(idx, 1);
        me.supports[zone] = { card, faceDown: false, setTurn: state.turn };
        log(state, `${me.name} ativou ${card.name}: seus monstros ganham +${SUPPORT_AURA} ATK.`);
        emit(state, { type: "spell", seat, name: card.name });
        return { ok: true };
      }
      me.energy -= 1;
      me.hand.splice(idx, 1);
      sendToGrave(state, seat, card);
      if (sub === "Quick-Play") {
        damage(state, 1 - seat, 600);
        log(state, `${me.name} ativou ${card.name}: 600 de dano em ${opp.name}.`);
      } else if (sub === "Ritual") {
        me.lp += 1000;
        log(state, `${me.name} ativou ${card.name} e recuperou 1000 PV.`);
        emit(state, { type: "heal", seat, amount: 1000 });
      } else {
        const ok = drawCard(state, seat);
        log(state, `${me.name} ativou ${card.name}${ok ? " e comprou 1 carta" : ", mas o deck está vazio"}.`);
      }
      emit(state, { type: "spell", seat, name: card.name });
      checkLp(state);
      return { ok: true };
    }

    case "setTrap": {
      const idx = findHand(me, action.uid);
      if (idx < 0) return { ok: false, error: "Carta não está na mão." };
      const card = me.hand[idx];
      if (card.kind !== "trap") return { ok: false, error: "Só armadilhas podem ser baixadas." };
      if (me.energy < 1) return { ok: false, error: "Energia insuficiente (custa 1)." };
      const zone = me.supports.findIndex((s) => !s);
      if (zone < 0) return { ok: false, error: "Sua zona de suporte está cheia." };
      me.energy -= 1;
      me.hand.splice(idx, 1);
      me.supports[zone] = { card, faceDown: true, setTurn: state.turn };
      log(state, `${me.name} baixou uma carta virada para baixo.`);
      emit(state, { type: "set", seat, index: zone });
      return { ok: true };
    }

    case "position": {
      const i = Number(action.index);
      const m = me.monsters[i];
      if (!m) return { ok: false, error: "Não há monstro nessa zona." };
      if (m.summonedTurn === state.turn) return { ok: false, error: "Esse monstro acabou de entrar em campo." };
      if (m.changedPos) return { ok: false, error: "Esse monstro já mudou de posição neste turno." };
      if (m.attacked) return { ok: false, error: "Esse monstro já atacou neste turno." };
      m.pos = m.pos === "atk" ? "def" : "atk";
      if (m.pos === "atk") m.faceDown = false;
      m.changedPos = true;
      log(state, `${me.name} mudou ${m.card.name} para ${m.pos === "atk" ? "ataque" : "defesa"}.`);
      emit(state, { type: "position", seat, index: i });
      return { ok: true };
    }

    case "attack": {
      const i = Number(action.index);
      if (state.turn === 1) return { ok: false, error: "Não é possível atacar no primeiro turno do duelo." };
      const m = me.monsters[i];
      if (!m) return { ok: false, error: "Não há monstro nessa zona." };
      if (!canAttackWith(state, seat, i)) return { ok: false, error: "Esse monstro não pode atacar agora." };
      const oppHasMonsters = opp.monsters.some(Boolean);
      const direct = action.target == null;
      if (direct && oppHasMonsters) return { ok: false, error: "O oponente tem monstros: escolha um alvo." };
      const t = direct ? null : Number(action.target);
      if (!direct && !opp.monsters[t]) return { ok: false, error: "Alvo inválido." };
      m.attacked = true;
      emit(state, { type: "attack", seat, index: i, target: t });

      // Armadilha do defensor
      const trapIdx = opp.supports.findIndex((s) => s && s.faceDown && s.card.kind === "trap" && s.setTurn < state.turn);
      if (trapIdx >= 0) {
        const trap = opp.supports[trapIdx];
        opp.supports[trapIdx] = null;
        sendToGrave(state, 1 - seat, trap.card);
        emit(state, { type: "trap", seat: 1 - seat, name: trap.card.name, index: trapIdx });
        if (trap.card.sub === "Counter") {
          damage(state, seat, 500);
          log(state, `${opp.name} ativou ${trap.card.name}: ataque anulado e 500 de dano em ${me.name}!`);
          checkLp(state);
        } else if (trap.card.sub === "Continuous") {
          m.bonus = (m.bonus || 0) - 500;
          log(state, `${opp.name} ativou ${trap.card.name}: ataque anulado e ${m.card.name} perdeu 500 ATK!`);
        } else {
          log(state, `${opp.name} ativou ${trap.card.name}: ${m.card.name} foi destruído!`);
          destroyMonster(state, seat, i, "trap");
        }
        return { ok: true };
      }

      const atk = effectiveAtk(me, m);
      if (direct) {
        damage(state, 1 - seat, atk);
        log(state, `${m.card.name} atacou diretamente: ${atk} de dano!`);
        checkLp(state);
        return { ok: true };
      }
      const d = opp.monsters[t];
      if (d.faceDown) {
        d.faceDown = false;
        log(state, `O monstro virado era ${d.card.name} (DEF ${d.card.def}).`);
      }
      if (d.pos === "atk") {
        const datk = effectiveAtk(opp, d);
        if (atk > datk) {
          damage(state, 1 - seat, atk - datk);
          log(state, `${m.card.name} (${atk}) destruiu ${d.card.name} (${datk}). ${atk - datk} de dano.`);
          destroyMonster(state, 1 - seat, t, "battle");
        } else if (atk < datk) {
          damage(state, seat, datk - atk);
          log(state, `${m.card.name} (${atk}) foi destruído por ${d.card.name} (${datk}). ${datk - atk} de dano.`);
          destroyMonster(state, seat, i, "battle");
        } else {
          log(state, `${m.card.name} e ${d.card.name} se destruíram mutuamente.`);
          destroyMonster(state, seat, i, "battle");
          destroyMonster(state, 1 - seat, t, "battle");
        }
      } else {
        const ddef = d.card.def;
        if (atk > ddef) {
          log(state, `${m.card.name} (${atk}) destruiu ${d.card.name} em defesa (${ddef}).`);
          destroyMonster(state, 1 - seat, t, "battle");
        } else if (atk < ddef) {
          damage(state, seat, ddef - atk);
          log(state, `${d.card.name} (DEF ${ddef}) resistiu. ${me.name} sofreu ${ddef - atk} de dano.`);
        } else {
          log(state, `${d.card.name} resistiu ao ataque.`);
        }
      }
      checkLp(state);
      return { ok: true };
    }

    case "end": {
      while (me.hand.length > MAX_HAND) {
        const c = me.hand.shift();
        sendToGrave(state, seat, c);
        log(state, `${me.name} descartou ${c.name} (limite de ${MAX_HAND} cartas).`);
      }
      log(state, `${me.name} encerrou o turno.`);
      state.active = 1 - seat;
      state.turn += 1;
      startTurn(state, true);
      return { ok: true };
    }

    default:
      return { ok: false, error: "Ação desconhecida." };
  }
}

// ---------- Visão de cada jogador (esconde informação oculta) ----------

const HIDDEN = { hidden: true };

function hideSlot(slot) {
  if (!slot) return null;
  if (!slot.faceDown) return slot;
  return { ...slot, card: { ...HIDDEN, uid: slot.card.uid, kind: slot.card.kind === "monster" ? "monster" : "unknown" } };
}

/** Retorna uma cópia do estado do ponto de vista de `seat` (0 ou 1). */
export function viewFor(state, seat) {
  const players = state.players.map((p, i) => {
    const mine = i === seat;
    return {
      name: p.name,
      lp: p.lp,
      energy: p.energy,
      maxEnergy: p.maxEnergy,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      hand: mine ? p.hand : [],
      monsters: mine ? p.monsters : p.monsters.map(hideSlot),
      supports: mine ? p.supports : p.supports.map(hideSlot),
      grave: p.grave,
    };
  });
  return {
    turn: state.turn,
    active: state.active,
    winner: state.winner,
    endReason: state.endReason,
    log: state.log,
    events: state.events,
    eventSeq: state.eventSeq,
    me: seat,
    players,
  };
}
