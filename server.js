const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { BOARD, RAILROADS, UTILITIES } = require('./data/board');
const CARDS = require('./data/cards');

const PORT = 3000;
const rooms = new Map();
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

// ─── Static File Server ────────────────────────────────────────
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'application/javascript' };
const server = http.createServer((req, res) => {
    const fp = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not Found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
    });
});

// ─── Helpers ───────────────────────────────────────────────────
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function genCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code; do { code = ''; for (let i = 0; i < 4; i++)code += c[Math.floor(Math.random() * c.length)]; } while (rooms.has(code)); return code; }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Game Class ────────────────────────────────────────────────
class Game {
    constructor(code) {
        this.code = code; this.players = []; this.conns = new Map();
        this.started = false; this.currentPI = 0; this.props = {};
        this.dice = [0, 0]; this.doubles = 0; this.phase = 'lobby';
        this.chanceDeck = shuffle([...CARDS.chance]); this.commDeck = shuffle([...CARDS.community]);
        this.chanceI = 0; this.commI = 0; this.auction = null; this.log = []; this.lastCard = null;
        this.landedPropIdx = null; this.events = []; this.trade = null;
    }

    addPlayer(id, name, ws) {
        if (this.players.length >= 6 || this.started) return false;
        this.players.push({
            id, name, color: PLAYER_COLORS[this.players.length], position: 0, money: 1500, jailTurns: 0, jailCards: 0, bankrupt: false,
            stats: { rentPaid: 0, rentEarned: 0, highestRent: 0, taxesPaid: 0 }
        });
        this.conns.set(id, ws); return true;
    }

    broadcast(msg) {
        const s = JSON.stringify(msg);
        this.conns.forEach(ws => { try { ws.send(s); } catch (e) { } });
    }

    sendTo(pid, msg) { const ws = this.conns.get(pid); if (ws) try { ws.send(JSON.stringify(msg)); } catch (e) { } }

    getState() {
        return {
            code: this.code, started: this.started, phase: this.phase,
            board: BOARD, players: this.players, currentPI: this.currentPI,
            props: this.props, dice: this.dice, auction: this.auction,
            log: this.log.slice(-20), lastCard: this.lastCard, landedPropIdx: this.landedPropIdx,
            events: this.events, trade: this.trade
        };
    }

    sync() { this.broadcast({ type: 'state', state: this.getState() }); this.events = []; }
    addLog(m) { this.log.push(m); if (this.log.length > 50) this.log.shift(); }
    addEvent(evt) { this.events.push(evt); }
    cp() { return this.players[this.currentPI]; }

    start() {
        if (this.players.length < 2) return false;
        this.started = true; this.phase = 'roll';
        this.addLog('🎮 Oyun başladı!');
        this.addLog(`👤 ${this.cp().name} sırası`);
        this.sync(); return true;
    }

    // ─── DICE ──────────────────────────────────────────────────
    rollDice(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'roll') return;
        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
        this.dice = [d1, d2]; const isDouble = d1 === d2;
        if (isDouble) this.doubles++; else this.doubles = 0;
        this.addLog(`🎲 ${p.name} zar attı: ${d1 + d2} ${isDouble ? '(Çift)' : ''}`);
        if (this.doubles >= 3) { this.addLog(`🚔 ${p.name} 3 çift atarak hapse girdi!`); this.goToJail(this.currentPI); this.endTurn(); return; }
        this.movePlayer(this.currentPI, d1 + d2);
    }

    rollJailDice(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'jail') return;
        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
        this.dice = [d1, d2];
        if (d1 === d2) { this.addLog(`🚪 ${p.name} çift attı, hapisten çıktı!`); p.jailTurns = 0; this.movePlayer(this.currentPI, d1 + d2); }
        else {
            p.jailTurns++;
            if (p.jailTurns >= 3) { this.addLog(`💸 ${p.name} ₺50 ile hapisten çıktı`); this.payBank(this.currentPI, 50); p.jailTurns = 0; this.movePlayer(this.currentPI, d1 + d2); }
            else { this.addLog(`🔒 ${p.name} çift atamadı`); this.phase = 'post_roll'; this.sync(); }
        }
    }

    payJailFine(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'jail') return;
        if (p.money < 50) { this.sendTo(pid, { type: 'error', msg: 'Yeterli paranız yok!' }); return; }
        this.payBank(this.currentPI, 50); p.jailTurns = 0;
        this.addLog(`💸 ${p.name} ₺50 ile hapisten çıktı`);
        this.phase = 'roll'; this.sync();
    }

    useJailCard(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'jail' || p.jailCards <= 0) return;
        p.jailCards--; p.jailTurns = 0;
        this.addLog(`🃏 ${p.name} kart ile hapisten çıktı!`);
        this.phase = 'roll'; this.sync();
    }

    // ─── MOVEMENT ──────────────────────────────────────────────
    movePlayer(pi, steps) {
        const p = this.players[pi]; const oldPos = p.position;
        p.position = (p.position + steps) % 40;
        if (p.position < oldPos && steps > 0) {
            p.money += 200;
            this.addLog(`${p.name} BAŞLA'yı geçti → ₺200 aldı!`);
            this.addEvent({ type: 'go_money', player: pi, amount: 200 });
        }
        this.processSquare(pi);
    }

    movePlayerTo(pi, target) {
        const p = this.players[pi]; const oldPos = p.position;
        p.position = target;
        if (target < oldPos && target !== 10) {
            p.money += 200;
            this.addLog(`${p.name} BAŞLA'yı geçti → ₺200 aldı!`);
            this.addEvent({ type: 'go_money', player: pi, amount: 200 });
        }
        this.processSquare(pi);
    }

    goToJail(pi) {
        this.players[pi].position = 10; this.players[pi].jailTurns = 1; this.doubles = 0;
    }

    // ─── SQUARE PROCESSING ────────────────────────────────────
    processSquare(pi) {
        const p = this.players[pi]; const sq = BOARD[p.position]; const idx = p.position;
        this.lastCard = null; this.landedPropIdx = null;
        switch (sq.type) {
            case 'go': break;
            case 'property': case 'railroad': case 'utility':
                if (!this.props[idx]) { this.landedPropIdx = idx; this.phase = 'buy'; this.sync(); return; }
                else if (this.props[idx].owner !== pi && !this.props[idx].mortgaged) {
                    const rent = this.calcRent(idx); const owner = this.props[idx].owner;
                    if (!this.players[pi].stats) this.players[pi].stats = { rentPaid: 0, rentEarned: 0, highestRent: 0, taxesPaid: 0 };
                    if (!this.players[owner].stats) this.players[owner].stats = { rentPaid: 0, rentEarned: 0, highestRent: 0, taxesPaid: 0 };
                    this.players[pi].stats.rentPaid += rent;
                    this.players[owner].stats.rentEarned += rent;
                    if (rent > this.players[owner].stats.highestRent) this.players[owner].stats.highestRent = rent;

                    this.addLog(`💸 ${p.name}, ₺${rent} kira ödedi (${sq.name})`);
                    this.addEvent({ type: 'rent', payer: pi, owner, amount: rent, propName: sq.name, propColor: sq.colorHex });
                    this.transfer(pi, owner, rent);
                } break;
            case 'tax':
                if (!this.players[pi].stats) this.players[pi].stats = { rentPaid: 0, rentEarned: 0, highestRent: 0, taxesPaid: 0 };
                this.players[pi].stats.taxesPaid += sq.amount;
                this.addLog(`📉 ${p.name}, ₺${sq.amount} vergi ödedi`);
                this.addEvent({ type: 'tax', player: pi, amount: sq.amount });
                this.payBank(pi, sq.amount); break;
            case 'chance': this.drawCard(pi, 'chance'); return;
            case 'community': this.drawCard(pi, 'community'); return;
            case 'go_to_jail':
                this.addLog(`🚔 ${p.name} hapse girdi!`);
                this.addEvent({ type: 'jail', player: pi });
                this.goToJail(pi); break;
            case 'jail': case 'free_parking': break;
        }
        this.afterLanding();
    }

    afterLanding() {
        if (this.checkGameOver()) return;
        if (this.phase === 'buy') return; // waiting for buy decision
        if (this.doubles > 0 && this.cp().jailTurns === 0) { this.phase = 'roll'; this.addLog(`Çift geldi, ${this.cp().name} tekrar atıyor!`); }
        else { this.phase = 'post_roll'; }
        this.sync();
    }

    // ─── RENT CALCULATION ─────────────────────────────────────
    calcRent(idx) {
        const sq = BOARD[idx]; const prop = this.props[idx]; if (!prop || prop.mortgaged) return 0;
        if (sq.type === 'railroad') {
            let count = RAILROADS.filter(r => this.props[r] && this.props[r].owner === prop.owner).length;
            return 25 * Math.pow(2, count - 1);
        }
        if (sq.type === 'utility') {
            let count = UTILITIES.filter(u => this.props[u] && this.props[u].owner === prop.owner).length;
            return (this.dice[0] + this.dice[1]) * (count === 2 ? 10 : 4);
        }
        if (prop.houses > 0) return sq.rent[prop.houses]; // houses 1-4 or 5=hotel
        if (this.ownsGroup(prop.owner, idx)) return sq.rent[0] * 2; // monopoly double
        return sq.rent[0];
    }

    ownsGroup(pi, idx) {
        const sq = BOARD[idx]; if (!sq.group) return false;
        return sq.group.every(g => this.props[g] && this.props[g].owner === pi);
    }

    // ─── BUY / AUCTION ────────────────────────────────────────
    devGiveGroup(requesterId, targetPlayerId, colorHex) {
        // Find player
        const pi = this.players.findIndex(p => p.id === targetPlayerId);
        if (pi === -1) return;

        // Find all properties with this color
        for (let i = 0; i < BOARD.length; i++) {
            const sq = BOARD[i];
            if (sq.type === 'property' && sq.colorHex === colorHex && (!this.props[i] || this.props[i].owner === undefined)) {
                this.props[i] = { owner: pi, houses: 0, mortgaged: false };
            }
        }
        this.addLog(`[DEV] ${this.players[pi].name}'e ${colorHex} renk grubu verildi.`);
        this.sync();
    }

    buyProperty(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'buy') return;
        const idx = this.landedPropIdx; const sq = BOARD[idx];
        if (p.money < sq.price) { this.sendTo(pid, { type: 'error', msg: 'Yeterli paranız yok!' }); return; }
        p.money -= sq.price;
        this.props[idx] = { owner: this.currentPI, houses: 0, mortgaged: false };
        this.addLog(`🏠 ${p.name}, ${sq.name} aldı (₺${sq.price})`);
        this.addEvent({ type: 'buy', player: this.currentPI, propName: sq.name, propColor: sq.colorHex, price: sq.price });
        this.landedPropIdx = null;
        this.phase = 'post_roll';
        this.afterLanding();
    }

    declineProperty(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'buy') return;
        const idx = this.landedPropIdx;
        this.addLog(`⚡ ${BOARD[idx].name} açık artırmada!`);
        this.startAuction(idx);
    }

    startAuction(idx) {
        const active = this.players.map((_, i) => i).filter(i => !this.players[i].bankrupt);
        this.auction = { propIdx: idx, bids: {}, currentBidder: 0, active, highBid: 0, highBidder: null, passed: [] };
        this.phase = 'auction';
        this.advanceAuctionBidder();
        this.sync();
    }

    advanceAuctionBidder() {
        const a = this.auction;
        const remaining = a.active.filter(i => !a.passed.includes(i));
        if (remaining.length <= 1) { this.resolveAuction(); return; }
        let next = a.currentBidder;
        do { next = (next + 1) % this.players.length; } while (this.players[next].bankrupt || a.passed.includes(next));
        a.currentBidder = next;
    }

    auctionBid(pid, amount) {
        if (this.phase !== 'auction' || !this.auction) return;
        const pi = this.players.findIndex(p => p.id === pid);
        if (pi !== this.auction.currentBidder) return;
        amount = parseInt(amount);
        if (amount <= this.auction.highBid || amount > this.players[pi].money) {
            this.sendTo(pid, { type: 'error', msg: 'Geçersiz teklif!' }); return;
        }
        this.auction.highBid = amount; this.auction.highBidder = pi;
        this.addLog(`${this.players[pi].name} ₺${amount} teklif etti.`);
        this.advanceAuctionBidder(); this.sync();
    }

    auctionPass(pid) {
        if (this.phase !== 'auction' || !this.auction) return;
        const pi = this.players.findIndex(p => p.id === pid);
        if (pi !== this.auction.currentBidder) return;
        this.auction.passed.push(pi);
        this.addLog(`${this.players[pi].name} pas geçti.`);
        const remaining = this.auction.active.filter(i => !this.auction.passed.includes(i));
        if (remaining.length <= 1) { this.resolveAuction(); return; }
        this.advanceAuctionBidder(); this.sync();
    }

    resolveAuction() {
        const a = this.auction; const idx = a.propIdx;
        if (a.highBidder !== null) {
            this.players[a.highBidder].money -= a.highBid;
            this.props[idx] = { owner: a.highBidder, houses: 0, mortgaged: false };
            this.addLog(`🎉 ${this.players[a.highBidder].name}, ${BOARD[idx].name} kazandı (₺${a.highBid})`);
            this.addEvent({ type: 'auction_win', player: a.highBidder, propName: BOARD[idx].name, propColor: BOARD[idx].colorHex, price: a.highBid });
        } else { this.addLog(`💨 ${BOARD[idx].name} kimseye satılmadı`); }
        this.auction = null; this.landedPropIdx = null; this.afterLanding();
    }

    // ─── CARDS ─────────────────────────────────────────────────
    drawCard(pi, type) {
        const deck = type === 'chance' ? this.chanceDeck : this.commDeck;
        const iKey = type === 'chance' ? 'chanceI' : 'commI';
        const card = deck[this[iKey]]; this[iKey] = (this[iKey] + 1) % deck.length;
        this.lastCard = { ...card, deckType: type };
        this.addLog(`${this.players[pi].name} ${type === 'chance' ? 'Şans' : 'Topluluk Sandığı'} kartı çekti: ${card.text}`);
        this.applyCard(pi, card);
    }

    applyCard(pi, card) {
        const p = this.players[pi];
        switch (card.effect) {
            case 'move_to': this.movePlayerTo(pi, card.target); return;
            case 'move_back': { const newPos = (p.position - card.steps + 40) % 40; p.position = newPos; this.processSquare(pi); return; }
            case 'go_to_jail': this.addLog(`🚔 ${p.name} hapse gitti`); this.goToJail(pi); break;
            case 'collect': p.money += card.amount; this.addLog(`💵 ${p.name} ₺${card.amount} aldı`); break;
            case 'pay': this.payBank(pi, card.amount); break;
            case 'jail_free': p.jailCards++; this.addLog(`🃏 ${p.name} kurtulma kartı aldı`); break;
            case 'collect_from_each':
                this.players.forEach((op, i) => { if (i !== pi && !op.bankrupt) { this.transfer(i, pi, card.amount); } });
                this.addLog(`${p.name} her oyuncudan ₺${card.amount} aldı.`); break;
            case 'pay_each':
                this.players.forEach((op, i) => { if (i !== pi && !op.bankrupt) { this.transfer(pi, i, card.amount); } });
                this.addLog(`${p.name} her oyuncuya ₺${card.amount} ödedi.`); break;
            case 'repairs': {
                let total = 0;
                for (const k in this.props) {
                    if (this.props[k].owner === pi) {
                        const h = this.props[k].houses;
                        if (h === 5) total += card.perHotel; else total += h * card.perHouse;
                    }
                }
                if (total > 0) { this.addLog(`${p.name} tamir için ₺${total} ödedi.`); this.payBank(pi, total); }
                break;
            }
            case 'nearest_railroad': {
                const rr = RAILROADS.find(r => r > p.position) || RAILROADS[0];
                this.movePlayerTo(pi, rr); return;
            } // rent handled in processSquare (TODO: 2x)
            case 'nearest_utility': {
                const ut = UTILITIES.find(u => u > p.position) || UTILITIES[0];
                this.movePlayerTo(pi, ut); return;
            }
        }
        this.afterLanding();
    }

    // ─── BUILDING ──────────────────────────────────────────────
    ownsGroup(pi, propIdx) {
        const sq = BOARD[propIdx];
        if (!sq.group) return false;
        return sq.group.every(g => this.props[g] && this.props[g].owner === pi);
    }

    buildHouse(pid, propIdx) {
        const pi = this.players.findIndex(p => p.id === pid);
        if (pi !== this.currentPI) return;
        propIdx = parseInt(propIdx); const prop = this.props[propIdx]; const sq = BOARD[propIdx];
        if (!prop || prop.owner !== pi || sq.type !== 'property') return;
        if (!this.ownsGroup(pi, propIdx)) { this.sendTo(pid, { type: 'error', msg: 'Tüm gruba sahip olmalısınız!' }); return; }
        if (sq.group.some(g => this.props[g] && this.props[g].mortgaged)) { this.sendTo(pid, { type: 'error', msg: 'Grupta ipotekli arsa var!' }); return; }
        if (prop.houses >= 5) { this.sendTo(pid, { type: 'error', msg: 'Daha fazla bina yapılamaz!' }); return; }
        // Even building rule
        const minH = Math.min(...sq.group.map(g => (this.props[g] ? this.props[g].houses : 0)));
        if (prop.houses > minH) { this.sendTo(pid, { type: 'error', msg: 'Önce diğer arsalara ev yapın!' }); return; }
        if (this.players[pi].money < sq.houseCost) { this.sendTo(pid, { type: 'error', msg: 'Yeterli para yok!' }); return; }
        this.players[pi].money -= sq.houseCost; prop.houses++;
        const bType = prop.houses === 5 ? 'otel' : 'ev';
        this.addLog(`🏗️ ${this.players[pi].name}, ${sq.name}'e ${bType} yaptı`);
        this.sync();
    }

    sellHouse(pid, propIdx) {
        const pi = this.players.findIndex(p => p.id === pid);
        if (pi !== this.currentPI) return;
        propIdx = parseInt(propIdx); const prop = this.props[propIdx]; const sq = BOARD[propIdx];
        if (!prop || prop.owner !== pi || prop.houses <= 0) return;
        // Even selling rule
        const maxH = Math.max(...sq.group.map(g => (this.props[g] ? this.props[g].houses : 0)));
        if (prop.houses < maxH) { this.sendTo(pid, { type: 'error', msg: 'Önce diğer arsalardan satın!' }); return; }
        prop.houses--; this.players[pi].money += Math.floor(sq.houseCost / 2);
        this.addLog(`🧱 ${this.players[pi].name}, ${sq.name}'den bina sattı`);
        this.sync();
    }

    mortgage(pid, propIdx) {
        const pi = this.players.findIndex(p => p.id === pid);
        propIdx = parseInt(propIdx); const prop = this.props[propIdx]; const sq = BOARD[propIdx];
        if (!prop || prop.owner !== pi || prop.mortgaged || prop.houses > 0) return;
        prop.mortgaged = true; this.players[pi].money += sq.mortgage;
        this.addLog(`🏦 ${this.players[pi].name}, ${sq.name} ipotekledi (+₺${sq.mortgage})`);
        this.sync();
    }

    unmortgage(pid, propIdx) {
        const pi = this.players.findIndex(p => p.id === pid);
        propIdx = parseInt(propIdx); const prop = this.props[propIdx]; const sq = BOARD[propIdx];
        if (!prop || prop.owner !== pi || !prop.mortgaged) return;
        const cost = Math.ceil(sq.mortgage * 1.1);
        if (this.players[pi].money < cost) { this.sendTo(pid, { type: 'error', msg: 'Yeterli para yok!' }); return; }
        prop.mortgaged = false; this.players[pi].money -= cost;
        this.addLog(`🔓 ${this.players[pi].name}, ${sq.name} ipotek açtı (-₺${cost})`);
        this.sync();
    }

    // ─── MONEY ─────────────────────────────────────────────────
    payBank(pi, amount) {
        this.players[pi].money -= amount;
        if (this.players[pi].money < 0) this.goBankrupt(pi, null);
    }

    transfer(from, to, amount) {
        if (this.players[from].money < amount) {
            this.payBank(from, this.players[from].money);
            return;
        }
        this.players[from].money -= amount;
        this.players[to].money += amount;
    }

    // ─── TRADE ─────────────────────────────────────────────────
    proposeTrade(pid, targetId, offerProps, requestProps, offerMoney, requestMoney) {
        const p = this.cp();
        if (p.id !== pid || this.phase !== 'post_roll') return;
        const targetPI = this.players.findIndex(pl => pl.id === targetId);
        if (targetPI === -1 || targetPI === this.currentPI || this.players[targetPI].bankrupt) return;

        // Basic validations
        if (p.money < offerMoney) { this.sendTo(pid, { type: 'error', msg: 'Teklif ettiğiniz para sizde yok!' }); return; }

        // Property checks (can't trade properties with houses)
        for (let propIdx of offerProps) {
            const prop = this.props[propIdx];
            if (!prop || prop.owner !== this.currentPI || prop.houses > 0) {
                this.sendTo(pid, { type: 'error', msg: 'Üzerinde ev/otel olan arsalar takas edilemez!' }); return;
            }
        }
        for (let propIdx of requestProps) {
            const prop = this.props[propIdx];
            if (!prop || prop.owner !== targetPI || prop.houses > 0) {
                this.sendTo(pid, { type: 'error', msg: 'Üzerinde ev/otel olan arsalar takas edilemez!' }); return;
            }
        }

        this.trade = {
            proposer: this.currentPI,
            target: targetPI,
            offerProps: offerProps || [],
            requestProps: requestProps || [],
            offerMoney: parseInt(offerMoney) || 0,
            requestMoney: parseInt(requestMoney) || 0
        };
        this.phase = 'trade';
        this.addLog(`🤝 ${p.name}, ${this.players[targetPI].name}'e takas teklif etti`);
        this.sync();
    }

    acceptTrade(pid) {
        if (this.phase !== 'trade' || !this.trade) return;
        const targetP = this.players[this.trade.target];
        if (targetP.id !== pid) return;

        const proposerP = this.players[this.trade.proposer];

        // Double check money
        if (proposerP.money < this.trade.offerMoney || targetP.money < this.trade.requestMoney) {
            this.sendTo(pid, { type: 'error', msg: 'Bir tarafın parası yetersiz!' }); return;
        }

        // Execute Money Transfer
        if (this.trade.offerMoney > 0) {
            proposerP.money -= this.trade.offerMoney;
            targetP.money += this.trade.offerMoney;
        }
        if (this.trade.requestMoney > 0) {
            targetP.money -= this.trade.requestMoney;
            proposerP.money += this.trade.requestMoney;
        }

        // Execute Property Transfer
        this.trade.offerProps.forEach(idx => {
            if (this.props[idx]) this.props[idx].owner = this.trade.target;
        });
        this.trade.requestProps.forEach(idx => {
            if (this.props[idx]) this.props[idx].owner = this.trade.proposer;
        });

        this.addLog(`✅ ${targetP.name} takası kabul etti`);
        this.trade = null;
        this.phase = 'post_roll';
        this.sync();
    }

    declineTrade(pid) {
        if (this.phase !== 'trade' || !this.trade) return;
        const p = this.players.findIndex(x => x.id === pid);
        if (p !== this.trade.target) return;

        this.addLog(`❌ ${this.players[p].name} takası reddetti`);
        this.trade = null;
        this.phase = 'post_roll';
        this.sync();
    }

    cancelTrade(pid) {
        if (this.phase !== 'trade' || !this.trade) return;
        const p = this.players.findIndex(x => x.id === pid);
        if (p !== this.trade.proposer) return;

        this.addLog(`🗑️ ${this.players[p].name} takası iptal etti`);
        this.trade = null;
        this.phase = 'post_roll';
        this.sync();
    }

    autoLiquidate(pi, needed) {
        // Sell houses first
        while (this.players[pi].money < needed) {
            let sold = false;
            for (const k in this.props) {
                const pr = this.props[k];
                if (pr.owner === pi && pr.houses > 0) {
                    const sq = BOARD[parseInt(k)];
                    const maxH = Math.max(...sq.group.map(g => (this.props[g] ? this.props[g].houses : 0)));
                    if (pr.houses >= maxH) { pr.houses--; this.players[pi].money += Math.floor(sq.houseCost / 2); sold = true; break; }
                }
            }
            if (!sold) break;
        }
        // Mortgage properties
        while (this.players[pi].money < needed) {
            let mortgaged = false;
            for (const k in this.props) {
                const pr = this.props[k];
                if (pr.owner === pi && !pr.mortgaged && pr.houses === 0) {
                    const sq = BOARD[parseInt(k)]; pr.mortgaged = true; this.players[pi].money += sq.mortgage; mortgaged = true; break;
                }
            }
            if (!mortgaged) break;
        }
    }

    goBankrupt(pi, creditor) {
        this.players[pi].bankrupt = true; this.players[pi].money = 0;
        this.addLog(`💀 ${this.players[pi].name} iflas etti!`);
        // Release all properties
        for (const k in this.props) {
            if (this.props[k].owner === pi) delete this.props[k];
        }
        this.checkGameOver();
    }

    checkGameOver() {
        const alive = this.players.filter(p => !p.bankrupt);
        if (alive.length <= 1) {
            this.phase = 'game_over';
            this.addLog(`🏆 ${alive[0]?.name || '?'} oyunu kazandı!`);
            this.sync(); return true;
        }
        return false;
    }

    // ─── TURN MANAGEMENT ──────────────────────────────────────
    endTurn(pid) {
        const p = this.cp(); if (p.id !== pid || this.phase !== 'post_roll') return;
        this.nextTurn();
    }

    nextTurn() {
        this.doubles = 0; this.lastCard = null; this.landedPropIdx = null;
        let next = this.currentPI;
        do { next = (next + 1) % this.players.length; } while (this.players[next].bankrupt && !this.checkGameOver());
        this.currentPI = next;
        const p = this.cp();
        if (p.jailTurns > 0) { this.phase = 'jail'; this.addLog(`👤 ${p.name} sırası (Hapiste)`); }
        else { this.phase = 'roll'; this.addLog(`👤 ${p.name} sırası`); }
        this.sync();
    }

    // ─── DISCONNECT ────────────────────────────────────────────
    removePlayer(id) {
        const idx = this.players.findIndex(p => p.id === id); if (idx === -1) return;
        this.conns.delete(id);
        if (!this.started) { this.players.splice(idx, 1); this.sync(); return; }
        this.players[idx].bankrupt = true;
        for (const k in this.props) { if (this.props[k].owner === idx) delete this.props[k]; }
        this.addLog(`${this.players[idx].name} oyundan ayrıldı.`);
        if (this.currentPI === idx) this.nextTurn();
        else this.sync();
    }
}

// ─── WebSocket Server ──────────────────────────────────────────
const wss = new WebSocketServer({ server });
const wsData = new WeakMap();

wss.on('connection', ws => {
    ws.on('message', raw => {
        let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
        const data = wsData.get(ws) || {};

        switch (msg.type) {
            case 'create_room': {
                const code = genCode(); const id = uid();
                const game = new Game(code);
                game.addPlayer(id, msg.name || 'Oyuncu', ws);
                rooms.set(code, game); wsData.set(ws, { roomCode: code, playerId: id });
                ws.send(JSON.stringify({ type: 'room_created', code, playerId: id }));
                game.sync(); break;
            }

            case 'join_room': {
                const code = (msg.code || '').toUpperCase(); const game = rooms.get(code);
                if (!game) { ws.send(JSON.stringify({ type: 'error', msg: 'Oda bulunamadı!' })); return; }
                if (game.started) { ws.send(JSON.stringify({ type: 'error', msg: 'Oyun başlamış!' })); return; }
                const id = uid();
                if (!game.addPlayer(id, msg.name || 'Oyuncu', ws)) { ws.send(JSON.stringify({ type: 'error', msg: 'Oda dolu!' })); return; }
                wsData.set(ws, { roomCode: code, playerId: id });
                ws.send(JSON.stringify({ type: 'room_joined', code, playerId: id }));
                game.sync(); break;
            }

            case 'start_game': {
                const game = rooms.get(data.roomCode); if (!game) return;
                if (!game.start()) ws.send(JSON.stringify({ type: 'error', msg: 'En az 2 oyuncu gerekli!' }));
                break;
            }

            case 'roll_dice': { const g = rooms.get(data.roomCode); if (g) g.rollDice(data.playerId); break; }
            case 'roll_jail_dice': { const g = rooms.get(data.roomCode); if (g) g.rollJailDice(data.playerId); break; }
            case 'pay_jail_fine': { const g = rooms.get(data.roomCode); if (g) g.payJailFine(data.playerId); break; }
            case 'use_jail_card': { const g = rooms.get(data.roomCode); if (g) g.useJailCard(data.playerId); break; }
            case 'buy_property': { const g = rooms.get(data.roomCode); if (g) g.buyProperty(data.playerId); break; }
            case 'decline_property': { const g = rooms.get(data.roomCode); if (g) g.declineProperty(data.playerId); break; }
            case 'auction_bid': { const g = rooms.get(data.roomCode); if (g) g.auctionBid(data.playerId, msg.amount); break; }
            case 'auction_pass': { const g = rooms.get(data.roomCode); if (g) g.auctionPass(data.playerId); break; }
            case 'build_house': { const g = rooms.get(data.roomCode); if (g) g.buildHouse(data.playerId, msg.propIdx); break; }
            case 'sell_house': { const g = rooms.get(data.roomCode); if (g) g.sellHouse(data.playerId, msg.propIdx); break; }
            case 'mortgage': { const g = rooms.get(data.roomCode); if (g) g.mortgage(data.playerId, msg.propIdx); break; }
            case 'unmortgage': { const g = rooms.get(data.roomCode); if (g) g.unmortgage(data.playerId, msg.propIdx); break; }
            case 'end_turn': { const g = rooms.get(data.roomCode); if (g) g.endTurn(data.playerId); break; }
            case 'dev_give_group': { const g = rooms.get(data.roomCode); if (g) g.devGiveGroup(data.playerId, msg.targetPlayerId, msg.colorHex); break; }

            // Trade
            case 'propose_trade': { const g = rooms.get(data.roomCode); if (g) g.proposeTrade(data.playerId, msg.targetPlayerId, msg.offerProps, msg.requestProps, msg.offerMoney, msg.requestMoney); break; }
            case 'accept_trade': { const g = rooms.get(data.roomCode); if (g) g.acceptTrade(data.playerId); break; }
            case 'decline_trade': { const g = rooms.get(data.roomCode); if (g) g.declineTrade(data.playerId); break; }
            case 'cancel_trade': { const g = rooms.get(data.roomCode); if (g) g.cancelTrade(data.playerId); break; }
        }
    });

    ws.on('close', () => {
        const data = wsData.get(ws); if (!data) return;
        const game = rooms.get(data.roomCode);
        if (game) {
            game.removePlayer(data.playerId);
            if (game.players.every(p => p.bankrupt) || game.conns.size === 0) rooms.delete(data.roomCode);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const nets = require('os').networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(nets)) { for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; } } }
    console.log(`\n🎲 Duopoly Sunucusu Çalışıyor!`);
    console.log(`   Yerel:  http://localhost:${PORT}`);
    console.log(`   Ağ:     http://${ip}:${PORT}\n`);
});
