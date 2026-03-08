// ═══════════════════════════════════════════════════════════════
//  DUOPOLY CLIENT — Mobile-First Premium Game UI v2
//  Token animations, modal notifications, enhanced visuals
// ═══════════════════════════════════════════════════════════════
let ws, myId, state, board;
let prevPositions = {}; // track previous positions for animation
let animatingPlayerIds = new Set();

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const screens = { lobby: $('#lobby'), waiting: $('#waiting'), game: $('#game') };
const isMobile = () => window.innerWidth <= 768;

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ─── MOBILE TABS ────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.game-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        $(`#${btn.dataset.tab}`).classList.add('active');
    });
});

function switchTab(tabId) {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.game-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    $(`#${tabId}`).classList.add('active');
}

// ─── GRID POSITIONS ─────────────────────────────────────────
function getGridPos(i) {
    if (i === 0) return { row: 11, col: 11, side: 'bottom' };
    if (i <= 9) return { row: 11, col: 11 - i, side: 'bottom' };
    if (i === 10) return { row: 11, col: 1, side: 'bottom' };
    if (i <= 19) return { row: 11 - (i - 10), col: 1, side: 'left' };
    if (i === 20) return { row: 1, col: 1, side: 'top' };
    if (i <= 29) return { row: 1, col: i - 20 + 1, side: 'top' };
    if (i === 30) return { row: 1, col: 11, side: 'top' };
    if (i <= 39) return { row: i - 30 + 1, col: 11, side: 'right' };
    return { row: 1, col: 1 };
}

// Get pixel center of a square on the board
function getSquareCenter(sqIdx) {
    const el = document.querySelector(`[data-idx="${sqIdx}"]`);
    if (!el) return null;
    const boardEl = $('#board');
    const boardRect = boardEl.getBoundingClientRect();
    const sqRect = el.getBoundingClientRect();
    return {
        x: sqRect.left - boardRect.left + sqRect.width / 2,
        y: sqRect.top - boardRect.top + sqRect.height / 2
    };
}

// ─── DICE PIP PATTERNS ─────────────────────────────────────
const DICE_PIPS = {
    1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    2: [0, 0, 1, 0, 0, 0, 1, 0, 0],
    3: [0, 0, 1, 0, 1, 0, 1, 0, 0],
    4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
    5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
    6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
};

function renderDie(el, value) {
    if (!value || value < 1 || value > 6) {
        el.innerHTML = Array(9).fill('<div class="pip"></div>').join('');
        return;
    }
    const pattern = DICE_PIPS[value];
    el.innerHTML = pattern.map(on => `<div class="pip${on ? ' on' : ''}"></div>`).join('');
}

// ─── WEBSOCKET ──────────────────────────────────────────────
function connect() {
    let host = location.host;
    let proto = location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Eğer direkt APK (file://) veya Capacitor içerisinden çalışıyorsa, bağlanılacak URL'yi sor:
    if (location.protocol === 'file:' || location.protocol === 'capacitor:') {
        const storedHost = localStorage.getItem('duopoly_server_host');
        host = prompt("Sunucu IP veya Adresini girin (Örn: 192.168.1.5:3000 veya duopoly.onrender.com):", storedHost || "192.168.1.x:3000");
        if (!host) return showToast("Bağlantı adresi girilmedi!", "error");
        localStorage.setItem('duopoly_server_host', host);
        proto = host.includes('render.com') ? 'wss:' : 'ws:'; // Render her zaman WSS (SSL) kullanır
    }

    // Eğer Render.com URL'niz varsa doğrudan production'da hostu zorlayabilirsiniz
    // Şu an default olarak URL'den okuyor:
    ws = new WebSocket(`${proto}//${host}`);

    // Update connection status
    const connStatus = $('#connection-status');
    if (connStatus) {
        connStatus.classList.remove('online');
        connStatus.classList.add('offline');
    }

    ws.onopen = () => {
        if (connStatus) {
            connStatus.classList.remove('offline');
            connStatus.classList.add('online');
        }
    };

    ws.onmessage = async e => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
            case 'room_created':
                myId = msg.playerId;
                $('#room-code-display').textContent = msg.code;
                $('#top-room-code').textContent = msg.code;
                showScreen('waiting');
                break;
            case 'room_joined':
                myId = msg.playerId;
                $('#room-code-display').textContent = msg.code;
                $('#top-room-code').textContent = msg.code;
                showScreen('waiting');
                break;
            case 'state':
                const oldDice = state ? [...state.dice] : [0, 0];
                const oldState = state;
                state = msg.state;
                board = state.board;
                if (!state.started) {
                    renderWaiting();
                    // The original code used showScreen('waiting') here.
                    // The instruction's snippet implies direct class manipulation.
                    // Sticking to showScreen for consistency if not explicitly changed.
                    showScreen('waiting');
                    if (state.code) $('#top-room-code').textContent = state.code;
                } else {
                    showScreen('game'); // Original code used showScreen('game')
                    if (state.code) $('#top-room-code').textContent = state.code;
                    await renderGame(oldDice, oldState);

                    if (state.events && state.events.length > 0) {
                        processEvents(state.events);
                    }

                    // Force trade check immediately after render to prevent animation block issues
                    if (state.phase === 'trade' && state.trade) {
                        const targetId = state.players[state.trade.target].id;
                        const proposerId = state.players[state.trade.proposer].id;
                        if (targetId === myId) showTradeOfferModal();
                        else if (proposerId === myId) updateCenter();
                    } else {
                        closeTradeOfferModal();
                    }
                }
                break;
            case 'error':
                if ($('#lobby-error')) $('#lobby-error').textContent = msg.msg;
                showToast(msg.msg, 'error');
                break;
        }
    };
    ws.onclose = () => {
        if (connStatus) {
            connStatus.classList.remove('online');
            connStatus.classList.add('offline');
        }
        setTimeout(connect, 2000);
    }
}

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

// ─── LOBBY EVENTS ───────────────────────────────────────────
$('#btn-create').onclick = () => {
    const name = $('#player-name').value.trim() || 'Oyuncu';
    connect();
    ws.onopen = () => send({ type: 'create_room', name });
};
$('#btn-join').onclick = () => {
    const name = $('#player-name').value.trim() || 'Oyuncu';
    const code = $('#room-code-input').value.trim().toUpperCase();
    if (!code) { $('#lobby-error').textContent = 'Oda kodu girin!'; return; }
    connect();
    ws.onopen = () => send({ type: 'join_room', name, code });
};
$('#btn-start').onclick = () => send({ type: 'start_game' });

// ─── WAITING RENDER ─────────────────────────────────────────
function renderWaiting() {
    $('#player-list').innerHTML = state.players.map((p, i) =>
        `<div class="player-item" style="animation-delay:${i * .1}s">
      <div class="player-dot" style="background:${p.color};color:${p.color}"></div>
      <span>${p.name}</span>
    </div>`
    ).join('');
}

// ─── EVENT ANIMATIONS ───────────────────────────────────────
function processFloaters(events) {
    events.forEach(e => {
        // Find the player's UI card to anchor the floating text
        const playerCards = document.querySelectorAll('.pp-card');

        if (e.type === 'rent') {
            createFloater(`-₺${e.amount}`, 'var(--red)', playerCards[e.payer]);
            createFloater(`+₺${e.amount}`, 'var(--green)', playerCards[e.owner]);
            showToast(`${state.players[e.payer].name}, ${state.players[e.owner].name} oyuncusuna ₺${e.amount} kira ödedi.`, 'info');
        } else if (e.type === 'tax') {
            createFloater(`-₺${e.amount}`, 'var(--red)', playerCards[e.player]);
        } else if (e.type === 'jail') {
            createFloater(`HAPİS!`, 'var(--red)', playerCards[e.player]);
        }
    });
}

function createFloater(text, color, anchorEl) {
    const floater = document.createElement('div');
    floater.textContent = text;
    floater.style.position = 'fixed';
    floater.style.color = color;
    floater.style.fontWeight = 'bold';
    floater.style.fontSize = '1.5rem';
    floater.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
    floater.style.pointerEvents = 'none';
    floater.style.zIndex = '9999';
    floater.style.animation = 'floatUp 2s ease-out forwards';

    // anchor to the element if exists, else center screen
    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        floater.style.left = (rect.left + rect.width / 2) + 'px';
        floater.style.top = rect.top + 'px';
    } else {
        floater.style.left = '50%';
        floater.style.top = '50%';
        floater.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(floater);
    setTimeout(() => {
        if (floater.parentNode) floater.parentNode.removeChild(floater);
    }, 2000);
}

// ─── GAME RENDER ────────────────────────────────────────────
let boardBuilt = false;

async function renderGame(oldDice, oldState) {
    if (!boardBuilt) buildBoard();

    // Modallar ve merkez dışındaki her şeyi hemen güncelle
    updateBoard();
    updatePlayerBar();
    updatePlayers();
    updateLog();
    updateMyProps();
    updatePropManager();

    // Dev Tools güncellemesi
    const dt = $('#dev-tools');
    if (dt) {
        dt.style.display = 'flex';
        const dp = $('#dev-player');
        if (dp && state.players) {
            dp.innerHTML = state.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    }

    const acts = $('#actions');
    if (acts) acts.innerHTML = '<div class="wait-text">İlerliyor...</div>';

    // 1. Zar Animasyonu (Sadece oyun aşamasındaysak ve zar değiştiyse)
    const diceChanged = oldDice && (oldDice[0] !== state.dice[0] || oldDice[1] !== state.dice[1]);
    if (diceChanged && state.dice[0] > 0 && state.phase !== 'trade') {
        await animateDice();
    } else {
        renderDie($('#die1'), state.dice[0]);
        renderDie($('#die2'), state.dice[1]);
    }

    // 2. Token animasyonları (Ticaret ekranında değilsek oynat)
    if (state.phase !== 'trade') {
        await animateTokens(oldState);
    }

    // 3. Her şey bitince merkezi ve modalları güncelle
    updateCenter();

    // Process events (modal notifications) only after finishing animation
    if (state.events && state.events.length > 0) {
        processEvents(state.events);
        processFloaters(state.events);
        state.events = []; // Clear events locally to prevent double triggers on re-render
    }

    if (isMobile() && (state.phase === 'buy' || state.phase === 'auction')) {
        switchTab('tab-board');
    }
}

// ─── EVENT NOTIFICATIONS (modal-style) ──────────────────────
let eventQueue = [];
let eventShowing = false;

function processEvents(events) {
    events.forEach(evt => eventQueue.push(evt));
    if (!eventShowing) showNextEvent();
}

function showNextEvent() {
    if (eventQueue.length === 0) { eventShowing = false; return; }
    eventShowing = true;
    const evt = eventQueue.shift();
    const html = buildEventHTML(evt);
    if (!html) { showNextEvent(); return; }
    showEventModal(html, evt.type);
}

function buildEventHTML(evt) {
    const p = (i) => state.players[i];
    switch (evt.type) {
        case 'rent': {
            const payer = p(evt.payer);
            const owner = p(evt.owner);
            return `
            <div class="evt-icon">💸</div>
            <div class="evt-title">Kira Ödendi!</div>
            <div class="evt-body">
                <span style="color:${payer?.color}">${payer?.name}</span>
                <span class="evt-arrow">→</span>
                <span style="color:${owner?.color}">${owner?.name}</span>
            </div>
            <div class="evt-amount">₺${evt.amount}</div>
            <div class="evt-prop" ${evt.propColor ? `style="border-left:4px solid ${evt.propColor}"` : ''}>${evt.propName}</div>`;
        }
        case 'tax':
            return `
            <div class="evt-icon">💰</div>
            <div class="evt-title">Vergi!</div>
            <div class="evt-body"><span style="color:${p(evt.player)?.color}">${p(evt.player)?.name}</span> vergi ödedi</div>
            <div class="evt-amount evt-negative">−₺${evt.amount}</div>`;
        case 'buy':
            return `
            <div class="evt-icon">🏠</div>
            <div class="evt-title">Mülk Satın Alındı!</div>
            <div class="evt-body"><span style="color:${p(evt.player)?.color}">${p(evt.player)?.name}</span></div>
            <div class="evt-prop" ${evt.propColor ? `style="border-left:4px solid ${evt.propColor}"` : ''}>${evt.propName}</div>
            <div class="evt-amount">₺${evt.price}</div>`;
        case 'auction_win':
            return `
            <div class="evt-icon">⚡</div>
            <div class="evt-title">Açık Artırma Kazanıldı!</div>
            <div class="evt-body"><span style="color:${p(evt.player)?.color}">${p(evt.player)?.name}</span></div>
            <div class="evt-prop" ${evt.propColor ? `style="border-left:4px solid ${evt.propColor}"` : ''}>${evt.propName}</div>
            <div class="evt-amount">₺${evt.price}</div>`;
        case 'jail':
            return `
            <div class="evt-icon">🔒</div>
            <div class="evt-title">Hapishane!</div>
            <div class="evt-body"><span style="color:${p(evt.player)?.color}">${p(evt.player)?.name}</span> hapishaneye gitti!</div>`;
        case 'go_money':
            return `
            <div class="evt-icon">🏁</div>
            <div class="evt-title">BAŞLA'yı Geçtin!</div>
            <div class="evt-body"><span style="color:${p(evt.player)?.color}">${p(evt.player)?.name}</span> <b>₺${evt.amount}</b> maaş aldı!</div>`;
        default: return null;
    }
}

function showEventModal(html, evtType) {
    const overlay = document.createElement('div');
    overlay.className = 'event-overlay';
    const colors = { rent: '#e85454', tax: '#f39c12', buy: '#3ecf8e', auction_win: '#a855f7', jail: '#e85454', go_money: '#2ecc71' };
    overlay.innerHTML = `<div class="event-card" style="--evt-color: ${colors[evtType] || 'var(--gold)'}">
        ${html}
    </div>`;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('show'));

    const dismiss = () => {
        overlay.classList.add('out');
        setTimeout(() => { overlay.remove(); showNextEvent(); }, 400);
    };

    overlay.onclick = dismiss;
    setTimeout(dismiss, 2200);
}

// ─── DICE ANIMATION ─────────────────────────────────────────
function animateDice() {
    return new Promise(resolve => {
        const die1 = $('#die1'), die2 = $('#die2');
        die1.classList.add('rolling'); die2.classList.add('rolling');

        setTimeout(() => {
            renderDie(die1, state.dice[0]); renderDie(die2, state.dice[1]);
            die1.classList.remove('rolling'); die2.classList.remove('rolling');
            setTimeout(resolve, 300); // Zarı gördükten sonra piyon hareketine başlamadan azıcık bekle
        }, 500);
    });
}

// ─── TOKEN ANIMATION ────────────────────────────────────────
function animateTokens(oldState) {
    if (!oldState || !oldState.players) return Promise.resolve();
    const boardEl = $('#board');
    const promises = [];

    state.players.forEach((player, pi) => {
        const oldPlayer = oldState.players[pi];
        if (!oldPlayer || player.bankrupt) return;
        const oldPos = oldPlayer.position;
        const newPos = player.position;

        if (oldPos === newPos) return;

        // Calculate path through squares
        const path = [];
        let pos = oldPos;
        const steps = (newPos - oldPos + 40) % 40;
        for (let s = 1; s <= steps; s++) {
            path.push((oldPos + s) % 40);
        }

        promises.push(new Promise(resolve => {
            // Create a floating token for the animation
            const floater = document.createElement('div');
            floater.className = 'token-floater';
            floater.style.background = player.color;
            floater.textContent = player.name[0];
            boardEl.appendChild(floater);

            animatingPlayerIds.add(player.id);

            // Animate through each step
            const startCenter = getSquareCenter(oldPos);
            if (startCenter) {
                floater.style.left = startCenter.x + 'px';
                floater.style.top = startCenter.y + 'px';
            }

            const stepDuration = 250; // Daha yavaş, kare kare belirgin geçiş
            let stepIdx = 0;

            function animateStep() {
                if (stepIdx >= path.length) {
                    floater.remove();
                    animatingPlayerIds.delete(player.id);
                    updateBoard(); // Animasyon bittiğinde asıl token'ı göster
                    resolve();
                    return;
                }
                const center = getSquareCenter(path[stepIdx]);
                if (center) {
                    floater.style.transition = `left ${stepDuration}ms linear, top ${stepDuration}ms linear`;
                    floater.style.left = center.x + 'px';
                    floater.style.top = center.y + 'px';
                }
                stepIdx++;
                setTimeout(animateStep, stepDuration);
            }

            // Animasyonun ilk adımını biraz gecikmeli başlat ki render tamamlansın
            setTimeout(animateStep, 100);
        }));
    });

    return Promise.all(promises);
}

// ─── BOARD BUILD ────────────────────────────────────────────
const SQ_ICONS = {
    go: '➤', jail: '🔒', free_parking: '🅿️', go_to_jail: '👮',
    chance: '❓', community: '📦', tax: '💰', railroad: '🚂', utility: '⚡',
};

function buildBoard() {
    const boardEl = $('#board');
    boardEl.querySelectorAll('.sq').forEach(el => el.remove());

    board.forEach((sq, i) => {
        const pos = getGridPos(i);
        const div = document.createElement('div');
        const isCorner = [0, 10, 20, 30].includes(i);
        div.className = `sq side-${pos.side}${isCorner ? ' corner' : ''}`;
        div.style.gridRow = pos.row;
        div.style.gridColumn = pos.col;
        div.dataset.idx = i;

        let inner = '';
        if (sq.colorHex) {
            inner += `<div class="color-bar" style="background:linear-gradient(135deg,${sq.colorHex},${adjustColor(sq.colorHex, -20)})"></div>`;
        }

        // Shorten long city names for better mobile display
        const shortName = sq.name.split(' ')[0];

        if (['property', 'railroad', 'utility'].includes(sq.type)) {
            if (sq.type !== 'property') inner += `<span class="sq-icon">${SQ_ICONS[sq.type] || ''}</span>`;
            inner += `<span class="sq-name">${shortName}</span>`;
            if (!isMobile()) inner += `<span class="sq-price">₺${sq.price}</span>`; // Hide price on mobile board entirely
        } else {
            inner += `<span class="sq-icon large-icon">${SQ_ICONS[sq.type] || ''}</span>`;
            // Only show name for text-heavy special squares on desktop or skip entirely if corner
            if (!isCorner) {
                inner += `<span class="sq-name">${shortName}</span>`;
            }
        }
        inner += '<div class="tokens"></div>';
        div.innerHTML = inner;
        div.onclick = () => showPropertyInfo(i);
        boardEl.appendChild(div);
    });
    boardBuilt = true;
}

function adjustColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + amount)); g = Math.max(0, Math.min(255, g + amount)); b = Math.max(0, Math.min(255, b + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── BOARD UPDATE ───────────────────────────────────────────
function updateBoard() {
    board.forEach((sq, i) => {
        const div = document.querySelector(`[data-idx="${i}"]`);
        if (!div) return;

        // Enhanced Tokens
        const tokensEl = div.querySelector('.tokens');
        const playersHere = state.players.filter(p => p.position === i && !p.bankrupt && !animatingPlayerIds.has(p.id));

        // Add a class based on count to help CSS arrange them
        tokensEl.className = `tokens count-${Math.min(playersHere.length, 4)}`;

        tokensEl.innerHTML = playersHere.map((p, j) => {
            const isCurrent = (p.id === state.players[state.currentPI]?.id);
            return `<div class="token ${isCurrent ? 'current-player-token' : ''}" style="background:${p.color};--tok-color:${p.color};animation-delay:${j * .08}s" title="${p.name}">
                <span class="tok-letter">${p.name[0]}</span>
            </div>`;
        }).join('');

        const prop = state.props[i];

        // Active Square Highlight
        const isActiveSquare = state.players[state.currentPI] && state.players[state.currentPI].position === i;
        div.classList.toggle('active-sq', !!isActiveSquare);

        div.classList.toggle('mortgaged', !!(prop && prop.mortgaged));

        const existingH = div.querySelector('.houses-display');
        if (existingH) existingH.remove();
        if (prop && prop.houses > 0) {
            const hDiv = document.createElement('div');
            hDiv.className = 'houses-display';
            if (prop.houses === 5) {
                hDiv.innerHTML = '<div class="hotel-dot"></div>';
            } else {
                for (let h = 0; h < prop.houses; h++) hDiv.innerHTML += `<div class="house-dot" style="animation-delay:${h * .05}s"></div>`;
            }
            div.appendChild(hDiv);
        }

        const existingOwner = div.querySelector('.owner-strip');
        if (existingOwner) existingOwner.remove();
        div.classList.remove('own-prop', 'enemy-prop');
        if (prop && prop.owner !== undefined) {
            const strip = document.createElement('div');
            strip.className = 'owner-strip';
            const ownerObj = state.players[prop.owner];
            const c = ownerObj?.color || '#333';
            strip.style.cssText = `background:${c};color:${c};`;
            div.appendChild(strip);

            if (ownerObj) {
                if (ownerObj.id === myId) div.classList.add('own-prop');
                else div.classList.add('enemy-prop');
            }
        }
    });
}

// ─── MOBILE PLAYER BAR ──────────────────────────────────────
function updatePlayerBar() {
    const bar = $('#player-bar');
    if (!bar) return;
    bar.innerHTML = state.players.map((p, i) => {
        const isActive = i === state.currentPI;
        const isMe = p.id === myId;
        return `<div class="pbar-item${isActive ? ' pbar-active' : ''}${p.bankrupt ? ' pbar-dead' : ''}" title="${p.name}">
      <div class="pbar-dot" style="background:${p.color}"></div>
      <div style="display:flex; flex-direction:column; align-items:flex-start; margin-left: 4px;">
          <span class="pbar-name" style="font-size:0.65rem; line-height:1;">${isMe ? 'Sen' : p.name.slice(0, 6)}</span>
          <span class="pbar-money" style="font-size:0.8rem; line-height:1; font-weight:700; color:var(--gold);">₺${p.money >= 1000 ? (p.money / 1000).toFixed(1) + 'K' : p.money}</span>
      </div>
      ${p.jailTurns > 0 ? '<span class="pbar-jail">🔒</span>' : ''}
    </div>`;
    }).join('');
}

// ─── PLAYERS PANEL ──────────────────────────────────────────
function updatePlayers() {
    const render = (panel) => {
        if (!panel) return;
        panel.innerHTML = state.players.map((p, i) => {
            const isActive = i === state.currentPI;
            const props = Object.entries(state.props).filter(([, v]) => v.owner === i);

            // Calculate Total Assets (Money + Properties/Houses/Hotels value)
            let totalAssets = p.money;
            let totalHouses = 0;
            let totalHotels = 0;
            props.forEach(([idx, prop]) => {
                const sq = board[idx];
                if (!prop.mortgaged) totalAssets += sq.price;
                if (prop.houses > 0 && prop.houses < 5) {
                    totalAssets += (prop.houses * sq.houseCost);
                    totalHouses += prop.houses;
                }
                if (prop.houses === 5) {
                    totalAssets += (5 * sq.houseCost);
                    totalHotels++;
                }
            });

            const riskClass = p.money < 100 && !p.bankrupt ? 'high-risk' : '';
            const riskBadge = p.money < 100 && !p.bankrupt ? '<span class="risk-badge">⚠️ Risk</span>' : '';

            return `<div class="pp-card${isActive ? ' active-player' : ''}${p.bankrupt ? ' bankrupt' : ''} ${riskClass}">
          <div class="pp-header">
            <div class="player-dot" style="background:${p.color};color:${p.color}"></div>
            <div class="pp-name-col">
                <span class="pp-name">${p.name}${p.id === myId ? ' (Sen)' : ''}</span>
                <span class="pp-assets">Varlık: ₺${totalAssets.toLocaleString()}</span>
            </div>
            ${p.jailTurns > 0 ? '<span class="pp-jail">🔒 HAPİS</span>' : ''}
            ${riskBadge}
            <span class="pp-money">₺${p.money.toLocaleString()}</span>
          </div>
          ${props.length ? `<div class="pp-props">${props.map(([k]) => {
                const sq = board[k]; return `<div class="pp-prop-dot" style="background:${sq.colorHex || '#666'}" title="${sq.name}"></div>`;
            }).join('')}</div>` : ''}
          ${(totalHouses > 0 || totalHotels > 0) ? `<div style="font-size:0.75rem; color:var(--text3); margin-top:4px;">Bina: ${totalHouses} Ev, ${totalHotels} Otel</div>` : ''}
        </div>`;
        }).join('');
    };
    render($('#players-panel'));
    render($('#players-panel-desktop'));
}

// ─── CENTER UI & MOBILE ACTIONS ──────────────────────────────────────────────
function updateCenter() {
    const cp = state.players[state.currentPI];
    const isMyTurn = cp && cp.id === myId;

    // --- Update Top Bar ---
    const topTurnInfo = $('#top-turn-info');
    if (topTurnInfo) {
        topTurnInfo.style.color = cp?.color || '#fff';
        topTurnInfo.innerHTML = `Sıra: ${cp?.name || '?'}`;
    }

    const topLastEvent = $('#top-last-event');
    if (topLastEvent && state.log && state.log.length > 0) {
        // Find the last actual event, maybe strip some HTML if needed, but for now just take the last log entry
        topLastEvent.innerHTML = state.log[state.log.length - 1];
    } else if (topLastEvent) {
        topLastEvent.innerHTML = 'Oyun Başladı';
    }

    // --- Update Center Desktop Text ---
    const turnInfo = $('#turn-info');
    if (turnInfo) {
        turnInfo.innerHTML = `
        <div class="player-turn-name" style="color:${cp?.color || '#fff'}">
          ${cp?.name || '?'}${cp?.id === myId ? ' — Senin Sıran!' : ''}
        </div>
        <div class="phase-text">${getPhaseText()}</div>`;
    }

    // Handle buy/auction modals
    if (state.phase === 'buy' && isMyTurn) { showBuyModal(); } else { closeBuyModal(); }
    if (state.phase === 'auction') { showAuctionModal(); } else { closeAuctionModal(); }

    const acts = $('#actions'); // Desktop fallback
    const mobileActs = $('#mobile-actions'); // Mobile primary

    if (acts) acts.innerHTML = '';
    if (mobileActs) mobileActs.innerHTML = '';

    const renderWaitText = (html) => {
        if (acts) acts.innerHTML = html;
        if (mobileActs) mobileActs.innerHTML = html;
    };

    if (!isMyTurn && state.phase !== 'auction' && state.phase !== 'buy') {
        const idleHints = [
            "📢 İpucu: Tahtadaki herhangi bir mülke tıklayarak kira detaylarını görebilirsin.",
            "📢 İpucu: Rakiplerinin parasına sağ/üst menüden dikkat et, iflas sınırına yaklaşanlar fırsat olabilir.",
            "📢 İpucu: Aynı renkteki tüm mülkleri topladığında kiralar 2 katına çıkar!",
            "📢 İpucu: Kendi sıran geldiğinde diğer oyunculara Takas teklifi gönderebilirsin."
        ];
        // Use the turn player's ID to keep the hint somewhat stable but changing every turn
        const randomHint = idleHints[state.currentPI % idleHints.length];

        renderWaitText(`<div class="wait-text">
            Sıranızı bekleyin...
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border2); font-size:0.75rem; color:var(--text3); text-align:left;">
                ${randomHint}
            </div>
        </div>`);
        showCard(); return;
    }

    const btns = [];
    switch (state.phase) {
        case 'roll':
            btns.push({ label: '🎲 Zar At', cls: 'btn-primary btn-large', action: "send({type:'roll_dice'})", context: "Sıran sende. Hamleni tamamlamak için zar at." });
            break;
        case 'jail':
            btns.push({ label: '🎲 Çift Dene', cls: 'btn-primary', action: "send({type:'roll_jail_dice'})", context: "Hapistesin. Çıkmak için çift atmalı ya da ödeme yapmalısın." });
            btns.push({ label: '₺50 Öde', cls: 'btn-secondary', action: "send({type:'pay_jail_fine'})" });
            if (cp.jailCards > 0) btns.push({ label: '🃏 Kart Kullan', cls: 'btn-secondary', action: "send({type:'use_jail_card'})" });
            break;
        case 'buy':
            if (!isMyTurn) renderWaitText(`<div class="wait-text">${cp?.name} satın alma kararı veriyor...</div>`);
            break;
        case 'auction': break;
        case 'post_roll':
            btns.push({ label: 'Turu Bitir ✓', cls: 'btn-primary', action: "send({type:'end_turn'})", context: "Hamleni yaptın. Turu bitirebilir veya istersen takas başlatabilirsin." });
            btns.push({ label: '🤝 Takas', cls: 'btn-secondary', action: "openTradeModal()" });
            break;
        case 'trade':
            if (state.trade) {
                const targetId = state.players[state.trade.target].id;
                const proposerId = state.players[state.trade.proposer].id;

                if (proposerId === myId) {
                    renderWaitText(`<div class="wait-text">
                        Teklifiniz karşı tarafa iletildi, cevap bekleniyor...<br/>
                        <button class="btn btn-secondary" style="margin-top:10px" onclick="send({type:'cancel_trade'})">Teklifi İptal Et</button>
                    </div>`);
                } else if (targetId === myId) {
                    showTradeOfferModal();
                } else {
                    renderWaitText(`<div class="wait-text">Oyuncular arası ticaret yapılıyor...</div>`);
                }
            }
            break;
        case 'game_over': {
            const winner = state.players.find(p => !p.bankrupt);

            let statsHtml = `<div class="end-stats" style="font-size:0.85rem; color:var(--text2); margin-top:20px; text-align:left; width:100%; max-width:400px; margin-left:auto; margin-right:auto;">
                <h4 style="color:var(--gold); border-bottom:1px solid var(--border2); padding-bottom:5px; margin-bottom:10px;">Oyun Sonu İstatistikleri</h4>`;

            state.players.forEach(p => {
                const s = p.stats || { rentEarned: 0, rentPaid: 0, highestRent: 0, taxesPaid: 0 };
                statsHtml += `<div style="margin-bottom:10px; padding:10px; background:var(--bg3); border-radius:8px; border-left: 4px solid ${p.color};">
                    <strong style="color:${p.color}">${p.name}</strong> ${p.bankrupt ? '<span style="color:var(--red);font-size:0.75rem;">(İflas Etti)</span>' : '<span style="color:var(--green);font-size:0.75rem;">(Kazandı)</span>'}
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px; font-size:0.8rem; color:var(--text);">
                        <div>Kira Geliri: <b style="color:var(--green)">₺${s.rentEarned || 0}</b></div>
                        <div>Kira Gideri: <b style="color:var(--red)">₺${s.rentPaid || 0}</b></div>
                        <div>En Yüksek Kira: <b>₺${s.highestRent || 0}</b></div>
                        <div>Ödenen Vergi: <b>₺${s.taxesPaid || 0}</b></div>
                    </div>
                </div>`;
            });
            statsHtml += `</div>`;

            renderWaitText(`<div style="text-align:center; width:100%;">
        <div style="font-size:3rem;margin-bottom:8px">🏆</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.6rem;color:var(--gold);margin-bottom:10px;">${winner?.name || '?'} Kazandı!</div>
        ${statsHtml}
      </div>`);
            return;
        }
    }

    btns.forEach((b, i) => {
        const contextHtml = b.context ? `<div class="action-context">${b.context}</div>` : '';
        const btnHtml = `${contextHtml}<button class="btn ${b.cls}" style="animation-delay:${i * .08}s" onclick="${b.action}">
            ${b.label}
            ${b.reason ? `<span class="btn-reason">${b.reason}</span>` : ''}
        </button>`;
        if (acts) acts.innerHTML += btnHtml;
        if (mobileActs) mobileActs.innerHTML += btnHtml;
    });
    showCard();
}

function showCard() {
    const cd = $('#card-display');
    if (state.lastCard) {
        const icon = state.lastCard.deckType === 'chance' ? '❓' : '📦';
        cd.innerHTML = `<div class="card-icon">${icon}</div><div class="card-text">${state.lastCard.text}</div>`;
        cd.classList.add('show');
    } else { cd.classList.remove('show'); }
}

// ─── BUY MODAL ──────────────────────────────────────────────
function showBuyModal() {
    const sq = board[state.landedPropIdx];
    if (!sq) return;
    const overlay = $('#buy-modal-overlay');
    const modal = $('#buy-modal');
    const me = state.players.find(p => p.id === myId);
    const canAfford = me && me.money >= sq.price;

    let rentInfo = '';
    if (sq.type === 'property') {
        rentInfo = `<div class="buy-rents">
      <div class="rent-row"><span>Boş arsa</span><span>₺${sq.rent[0]}</span></div>
      <div class="rent-row"><span>🏠 ×1</span><span>₺${sq.rent[1]}</span></div>
      <div class="rent-row"><span>🏠 ×2</span><span>₺${sq.rent[2]}</span></div>
      <div class="rent-row"><span>🏠 ×3</span><span>₺${sq.rent[3]}</span></div>
      <div class="rent-row"><span>🏠 ×4</span><span>₺${sq.rent[4]}</span></div>
      <div class="rent-row highlight"><span>🏨 Otel</span><span>₺${sq.rent[5]}</span></div>
    </div>`;
    } else if (sq.type === 'railroad') {
        rentInfo = `<div class="buy-rents">
      <div class="rent-row"><span>1 D.Yolu</span><span>₺25</span></div>
      <div class="rent-row"><span>2 D.Yolu</span><span>₺50</span></div>
      <div class="rent-row"><span>3 D.Yolu</span><span>₺100</span></div>
      <div class="rent-row highlight"><span>4 D.Yolu</span><span>₺200</span></div>
    </div>`;
    } else {
        rentInfo = `<div class="buy-rents">
      <div class="rent-row"><span>1 Altyapı</span><span>Zar × 4</span></div>
      <div class="rent-row highlight"><span>2 Altyapı</span><span>Zar × 10</span></div>
    </div>`;
    }

    modal.innerHTML = `
    ${sq.colorHex ? `<div class="buy-color-strip" style="background:linear-gradient(135deg,${sq.colorHex},${adjustColor(sq.colorHex, -30)})"></div>` : ''}
    <div class="buy-icon">${SQ_ICONS[sq.type] || '🏠'}</div>
    <h2 class="buy-title">${sq.name}</h2>
    <div class="buy-price">₺${sq.price}</div>
    <div class="buy-subtitle">Satın almak ister misiniz?</div>
    ${rentInfo}
    <div class="buy-balance">Bakiyeniz: <b>₺${me?.money?.toLocaleString() || 0}</b></div>
    <div class="buy-actions">
      <button class="btn btn-primary btn-large" ${!canAfford ? 'disabled' : ''} onclick="send({type:'buy_property'}); closeBuyModal()">
        💰 Satın Al — ₺${sq.price}
      </button>
      <button class="btn btn-secondary" onclick="send({type:'decline_property'}); closeBuyModal()">
        Reddet → Açık Artırma
      </button>
    </div>`;
    overlay.classList.add('show');
}

function closeBuyModal() { $('#buy-modal-overlay').classList.remove('show'); }

// ─── AUCTION MODAL ──────────────────────────────────────────
function showAuctionModal() {
    const a = state.auction; if (!a) return;
    const sq = board[a.propIdx];
    const myPI = state.players.findIndex(p => p.id === myId);
    const isMyBid = a.currentBidder === myPI;
    const bidder = state.players[a.currentBidder];
    const me = state.players[myPI];
    const isPassed = a.passed && a.passed.includes(myPI);

    const overlay = $('#auction-modal-overlay');
    const modal = $('#auction-modal');

    modal.innerHTML = `
    ${sq.colorHex ? `<div class="buy-color-strip" style="background:linear-gradient(135deg,${sq.colorHex},${adjustColor(sq.colorHex, -30)})"></div>` : ''}
    <div class="auction-badge">⚡ AÇIK ARTIRMA</div>
    <h2 class="buy-title">${sq.name}</h2>
    <div class="buy-price">₺${sq.price}</div>
    <div class="auction-status">
      <div class="auction-stat">
        <span class="auction-stat-label">En Yüksek Teklif</span>
        <span class="auction-stat-value">₺${a.highBid}</span>
        ${a.highBidder !== null ? `<span class="auction-stat-who" style="color:${state.players[a.highBidder]?.color}">${state.players[a.highBidder]?.name}</span>` : '<span class="auction-stat-who">—</span>'}
      </div>
      <div class="auction-stat">
        <span class="auction-stat-label">Sıra</span>
        <span class="auction-stat-value" style="color:${bidder?.color || '#fff'}">${bidder?.name || '?'}</span>
      </div>
    </div>
    ${isPassed ? `<div class="auction-passed">Pas geçtiniz ⏳</div>` :
            isMyBid ? `
      <div class="auction-bid-section">
        <div class="auction-bid-info">Bakiyeniz: <b>₺${me?.money?.toLocaleString() || 0}</b></div>
        <div class="auction-bid-row">
          <button class="bid-adj" onclick="adjustBidAmount(-10)">−10</button>
          <input type="number" id="bid-input" value="${Math.min(a.highBid + 10, me?.money || 0)}" min="${a.highBid + 1}" max="${me?.money || 0}">
          <button class="bid-adj" onclick="adjustBidAmount(10)">+10</button>
        </div>
        <div class="auction-bid-actions">
          <button class="btn btn-primary" onclick="submitBid()">Teklif Ver</button>
          <button class="btn btn-secondary" onclick="send({type:'auction_pass'})">Pas Geç</button>
        </div>
      </div>` :
                `<div class="auction-waiting">Teklif sırasını bekleyin...</div>`}`;
    overlay.classList.add('show');
}

function closeAuctionModal() { $('#auction-modal-overlay').classList.remove('show'); }
function adjustBidAmount(delta) {
    const input = $('#bid-input');
    if (!input) return;
    const val = parseInt(input.value) || 0;
    input.value = Math.max(parseInt(input.min) || 1, Math.min(parseInt(input.max) || 9999, val + delta));
}
function submitBid() {
    const input = $('#bid-input');
    if (input) send({ type: 'auction_bid', amount: parseInt(input.value) || 0 });
}

function getPhaseText() {
    return { roll: 'Zar Atılacak', jail: 'Hapishanede', buy: 'Satın Alma Kararı', auction: 'Açık Artırma', post_roll: 'Tur Sonu', game_over: 'Oyun Bitti' }[state.phase] || '';
}

// ─── LOG ────────────────────────────────────────────────────
function updateLog() {
    const render = (el) => {
        if (!el) return;
        el.innerHTML = state.log.map(l => `<div class="log-entry">${l}</div>`).join('');
        el.scrollTop = el.scrollHeight;
    };
    render($('#log-list'));
    render($('#log-list-desktop'));
}

// ─── MY PROPERTIES PANEL ────────────────────────────────────
function updateMyProps() {
    const list = $('#my-props-list');
    const empty = $('#my-props-empty');
    if (!list) return;

    const myPI = state.players.findIndex(p => p.id === myId);
    const isMyTurn = myPI === state.currentPI;
    const myProps = Object.entries(state.props).filter(([, v]) => v.owner === myPI);

    if (myProps.length === 0) {
        list.innerHTML = ''; if (empty) empty.style.display = 'block';
        const tabBtn = document.querySelector('.tab-btn[data-tab="tab-props"]');
        if (tabBtn) tabBtn.textContent = '🏠 Mülklerim';
        return;
    }

    if (empty) empty.style.display = 'none';
    const tabBtn = document.querySelector('.tab-btn[data-tab="tab-props"]');
    if (tabBtn) tabBtn.textContent = `🏠 Mülklerim (${myProps.length})`;

    const groups = {};
    myProps.forEach(([idx, prop]) => {
        const sq = board[idx];
        const group = sq.colorHex || sq.type;
        if (!groups[group]) groups[group] = [];
        groups[group].push({ idx: parseInt(idx), prop, sq });
    });

    list.innerHTML = Object.entries(groups).map(([group, items]) => {
        const groupColor = items[0].sq.colorHex;
        const fullGroup = items[0].sq.type === 'property' && items[0].sq.group && items[0].sq.group.every(g => state.props[g] && state.props[g].owner === myPI);

        return `<div class="prop-group">
        ${groupColor ? `<div class="prop-group-bar" style="background:${groupColor}"></div>` : ''}
        ${fullGroup ? '<div class="monopoly-badge">TEKEL ✨</div>' : ''}
        ${items.map(({ idx, prop, sq }) => {
            const canBuild = isMyTurn && fullGroup && !prop.mortgaged && prop.houses < 5;
            const canSell = isMyTurn && prop.houses > 0;
            const canMortgage = isMyTurn && !prop.mortgaged && prop.houses === 0;
            const canUnmortgage = isMyTurn && prop.mortgaged;
            const housesText = prop.houses === 5 ? '🏨' : prop.houses > 0 ? '🏠'.repeat(prop.houses) : '';
            return `<div class="prop-card ${prop.mortgaged ? 'prop-mortgaged' : ''}">
            <div class="prop-card-header">
              <div class="prop-card-color-dot" style="background:${sq.colorHex || '#666'}"></div>
              <div class="prop-card-info">
                <div class="prop-card-name">${sq.name}</div>
                <div class="prop-card-meta">${housesText}${prop.mortgaged ? '<span class="prop-badge-mortgage">İPOTEKLİ</span>' : ''}</div>
              </div>
              <div class="prop-card-rent">₺${getCurrentRent(idx, prop)}</div>
            </div>
            ${(canBuild || canSell || canMortgage || canUnmortgage) ? `<div class="prop-card-actions">
              ${canBuild ? `<button class="prop-act-btn act-build" onclick="send({type:'build_house',propIdx:${idx}})">+🏠 ₺${sq.houseCost}</button>` : ''}
              ${canSell ? `<button class="prop-act-btn act-sell" onclick="send({type:'sell_house',propIdx:${idx}})">−🏠 +₺${Math.floor(sq.houseCost / 2)}</button>` : ''}
              ${canMortgage ? `<button class="prop-act-btn act-mortgage" onclick="send({type:'mortgage',propIdx:${idx}})">İpotek +₺${sq.mortgage}</button>` : ''}
              ${canUnmortgage ? `<button class="prop-act-btn act-unmortgage" onclick="send({type:'unmortgage',propIdx:${idx}})">Kaldır −₺${Math.ceil(sq.mortgage * 1.1)}</button>` : ''}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
}

function getCurrentRent(idx, prop) {
    const sq = board[idx];
    if (prop.mortgaged) return 0;
    if (sq.type === 'railroad') {
        const myPI = state.players.findIndex(p => p.id === myId);
        const count = [5, 15, 25, 35].filter(r => state.props[r] && state.props[r].owner === myPI).length;
        return 25 * Math.pow(2, count - 1);
    }
    if (sq.type === 'utility') return '~';
    if (prop.houses > 0) return sq.rent[prop.houses];
    const myPI = state.players.findIndex(p => p.id === myId);
    const fullGroup = sq.group && sq.group.every(g => state.props[g] && state.props[g].owner === myPI);
    if (fullGroup) return sq.rent[0] * 2;
    return sq.rent[0];
}

// ─── PROP MANAGER (desktop sidebar) ─────────────────────────
function updatePropManager() {
    const mgr = $('#property-manager');
    if (!mgr) return;
    const myPI = state.players.findIndex(p => p.id === myId);
    const isMyTurn = myPI === state.currentPI;
    const myProps = Object.entries(state.props).filter(([, v]) => v.owner === myPI);

    if (myProps.length === 0 || !isMyTurn || state.phase === 'auction') {
        mgr.classList.remove('show'); return;
    }

    mgr.classList.add('show');
    mgr.innerHTML = `<h3>🏠 Mülklerim</h3>` + myProps.map(([idx, prop]) => {
        const sq = board[idx];
        const fullGroup = sq.type === 'property' && sq.group && sq.group.every(g => state.props[g] && state.props[g].owner === myPI);
        const canBuild = fullGroup && !prop.mortgaged && prop.houses < 5;
        const canSell = prop.houses > 0;
        const canMortgage = !prop.mortgaged && prop.houses === 0;
        const canUnmortgage = prop.mortgaged;
        const housesText = prop.houses === 5 ? '🏨' : prop.houses > 0 ? '🏠'.repeat(prop.houses) : '';
        return `<div class="pm-item">
      <div class="pp-prop-dot" style="background:${sq.colorHex || '#666'}"></div>
      <span>${sq.name}</span>
      <span class="pm-houses">${housesText}${prop.mortgaged ? '📌' : ''}</span>
      <div class="pm-actions">
        ${canBuild ? `<button class="pm-build" onclick="send({type:'build_house',propIdx:${idx}})">+🏠</button>` : ''}
        ${canSell ? `<button class="pm-sell" onclick="send({type:'sell_house',propIdx:${idx}})">-🏠</button>` : ''}
        ${canMortgage ? `<button class="pm-mortgage" onclick="send({type:'mortgage',propIdx:${idx}})">İpotek</button>` : ''}
        ${canUnmortgage ? `<button class="pm-mortgage" onclick="send({type:'unmortgage',propIdx:${idx}})">Kaldır</button>` : ''}
      </div>
    </div>`;
    }).join('');
}

// ─── PROPERTY INFO MODAL ────────────────────────────────────
function showPropertyInfo(idx) {
    const sq = board[idx];
    if (!sq || !['property', 'railroad', 'utility'].includes(sq.type)) return;
    const prop = state.props[idx];
    const owner = prop ? state.players[prop.owner] : null;
    const modal = $('#modal');

    let details = '';
    if (sq.type === 'property') {
        const isMonopoly = sq.group && state.props && sq.group.every(g => state.props[g] && state.props[g].owner === prop?.owner);
        const currentRent = prop ? (prop.mortgaged ? 0 : (prop.houses > 0 ? sq.rent[prop.houses] : (isMonopoly ? sq.rent[0] * 2 : sq.rent[0]))) : sq.rent[0];

        // Calculate next upgrade info
        let nextUpgradeText = '';
        if (!prop || !prop.owner) {
            nextUpgradeText = `<div style="color:var(--text2);margin-top:8px;">Satın alınabilir: <b>₺${sq.price}</b></div>`;
        } else if (prop.mortgaged) {
            nextUpgradeText = `<div style="color:var(--text2);margin-top:8px;">İpoteği Kaldırma: <b>₺${Math.ceil(sq.mortgage * 1.1)}</b></div>`;
        } else if (prop.houses < 5) {
            const nextRent = sq.rent[prop.houses + 1];
            const upgradeType = prop.houses === 4 ? 'Otel' : 'Ev';
            nextUpgradeText = `
                <div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border2); color:var(--text2);">
                    <div style="font-size:0.8rem; margin-bottom:4px;">Sonraki Geliştirme (+1 ${upgradeType}): <b>₺${sq.houseCost}</b></div>
                    <div style="color:var(--green); font-weight:bold;">Kira Artışı: ₺${currentRent} ➔ ₺${nextRent}</div>
                </div>`;
        } else {
            nextUpgradeText = `<div style="color:var(--gold);margin-top:8px;font-weight:bold;">Maksimum Geliştirme (Otel)</div>`;
        }

        details = `
      <div class="prop-card-color" style="background:linear-gradient(135deg,${sq.colorHex},${adjustColor(sq.colorHex, -30)})"></div>
      <h2>${sq.name}</h2>
      <div class="prop-details">
        <div style="font-size:1.1rem; color:var(--gold); font-weight:bold; margin-bottom: 5px;">Mevcut Kira: ₺${currentRent}</div>
        ${owner ? `<div>Sahip: <b style="color:${owner.color}">${owner.name}</b></div>
        <div>Durum: ${prop.houses === 5 ? '🏨 Otel' : prop.houses > 0 ? prop.houses + ' Ev' : 'Bina Yok'} ${prop.mortgaged ? '(📌 İpotekli)' : isMonopoly ? '(Tekel)' : ''}</div>` :
                '<div style="color:var(--text3)">Sahipsiz</div>'}
        
        ${nextUpgradeText}
        
        <div style="margin-top:15px; text-align:left; font-size:0.75rem; color:var(--text3); display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
           <div>Fiyat: ₺${sq.price}</div>
           <div>İpotek Değeri: ₺${sq.mortgage}</div>
           <div>Boş Kira: ₺${sq.rent[0]}</div>
           <div>Tekel Kira: ₺${sq.rent[0] * 2}</div>
           <div>1 Ev: ₺${sq.rent[1]}</div>
           <div>2 Ev: ₺${sq.rent[2]}</div>
           <div>3 Ev: ₺${sq.rent[3]}</div>
           <div>4 Ev: ₺${sq.rent[4]}</div>
           <div style="grid-column: 1 / -1; color:var(--text2);">Otel: ₺${sq.rent[5]}</div>
        </div>
      </div>`;
    } else if (sq.type === 'railroad') {
        const rrCount = owner ? [5, 15, 25, 35].filter(r => state.props[r] && state.props[r].owner === prop.owner).length : 0;
        const currentRent = prop && !prop.mortgaged ? 25 * Math.pow(2, rrCount - 1) : 25;

        details = `<h2>🚂 ${sq.name}</h2><div class="prop-details">
      <div style="font-size:1.1rem; color:var(--gold); font-weight:bold; margin-bottom: 5px;">Mevcut Kira: ₺${owner && rrCount > 0 ? currentRent : '?'}</div>
      ${owner ? `<div>Sahip: <b style="color:${owner.color}">${owner.name}</b> (${rrCount} İstasyon)</div>` : '<div style="color:var(--text3)">Sahipsiz</div>'}
      
      <div style="margin-top:15px; text-align:left; font-size:0.75rem; color:var(--text3); display:flex; flex-direction:column; gap:4px;">
           <div>Satın Alma Fiyatı: ₺${sq.price}</div>
           <div>1 İstasyon: ₺25</div>
           <div>2 İstasyon: ₺50</div>
           <div>3 İstasyon: ₺100</div>
           <div>4 İstasyon: ₺200</div>
      </div>
    </div>`;
    } else {
        const utCount = owner ? [12, 28].filter(u => state.props[u] && state.props[u].owner === prop.owner).length : 0;
        const currentMult = utCount === 2 ? 10 : 4;

        details = `<h2>⚡ ${sq.name}</h2><div class="prop-details">
      <div style="font-size:1.1rem; color:var(--gold); font-weight:bold; margin-bottom: 5px;">Mevcut Çarpan: Zar × ${owner && utCount > 0 ? currentMult : '?'}</div>
      ${owner ? `<div>Sahip: <b style="color:${owner.color}">${owner.name}</b> (${utCount} Tesis)</div>` : '<div style="color:var(--text3)">Sahipsiz</div>'}
      
      <div style="margin-top:15px; text-align:left; font-size:0.75rem; color:var(--text3); display:flex; flex-direction:column; gap:4px;">
           <div>Satın Alma Fiyatı: ₺${sq.price}</div>
           <div>1 Konum: Zar × 4</div>
           <div>2 Konum: Zar × 10</div>
      </div>
    </div>`;
    }

    const isMobileDevice = isMobile();
    const sheetContent = isMobileDevice ? $('#property-sheet-content') : modal;

    const actionHtml = isMobileDevice ? '' : '<button class="btn btn-secondary" onclick="closeModal()" style="margin-top:12px">Kapat</button>';

    sheetContent.innerHTML = details + actionHtml;

    if (isMobileDevice) {
        $('#property-sheet-overlay').classList.add('active');
    } else {
        $('#modal-overlay').classList.add('show');
    }
}

function closePropertySheet() {
    $('#property-sheet-overlay').classList.remove('active');
}

function closeModal() { $('#modal-overlay').classList.remove('show'); }
$('#modal-overlay').onclick = e => { if (e.target === $('#modal-overlay')) closeModal(); };
$('#buy-modal-overlay').onclick = e => { if (e.target === $('#buy-modal-overlay')) closeBuyModal(); };

// ─── TOAST ──────────────────────────────────────────────────
function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast';
    if (type === 'error') t.style.borderColor = 'var(--red)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── TRADE SYSTEM ───────────────────────────────────────────
function closeTradeModal() { $('#trade-modal-overlay').classList.remove('show'); }
function closeTradeOfferModal() { $('#trade-offer-overlay').classList.remove('show'); }

function openTradeModal() {
    const cp = state.players[state.currentPI];
    if (cp.id !== myId || state.phase !== 'post_roll') return;

    let targetOptions = state.players.map((p, i) => {
        if (i === state.currentPI || p.bankrupt) return '';
        return `<option value="${p.id}">${p.name}</option>`;
    }).join('');

    if (!targetOptions) {
        showToast('Ticaret yapılabilecek oyuncu yok!', 'error');
        return;
    }

    const modal = $('#trade-modal');
    modal.innerHTML = `
        <div class="trade-header">Takas Teklifi</div>
        <select id="trade-target" class="trade-target-select" onchange="renderTradeProps()">
            ${targetOptions}
        </select>
        <div class="trade-sections">
            <div class="trade-section">
                <h3>Sen Veriyorsun</h3>
                <div id="trade-my-props" class="trade-props-list"></div>
                <div class="trade-money-input">
                    <span class="currency">₺</span><input type="number" id="trade-my-money" value="0" min="0" max="${cp.money}">
                </div>
            </div>
            <div class="trade-section">
                <h3>Sen Alıyorsun</h3>
                <div id="trade-target-props" class="trade-props-list"></div>
                <div class="trade-money-input">
                    <span class="currency">₺</span><input type="number" id="trade-target-money" value="0" min="0">
                </div>
            </div>
        </div>
        <div class="trade-actions">
            <button class="btn btn-secondary" onclick="closeTradeModal()">İptal</button>
            <button class="btn btn-primary" onclick="submitTrade()">Teklif Sun</button>
        </div>
    `;

    $('#trade-modal-overlay').classList.add('show');
    renderTradeProps();
}

function renderTradeProps() {
    const targetId = $('#trade-target').value;
    const targetPI = state.players.findIndex(p => p.id === targetId);

    const buildList = (ownerPI, containerId) => {
        const props = Object.entries(state.props).filter(([, v]) => v.owner === ownerPI && v.houses === 0);
        const html = props.map(([k]) => {
            const sq = board[k];
            return `
            <label class="trade-prop-item">
                <input type="checkbox" value="${k}" data-owner="${ownerPI}">
                <div style="width:12px;height:12px;border-radius:2px;background:${sq.colorHex || '#bbb'}"></div>
                ${sq.name}
            </label>`;
        }).join('');
        $(containerId).innerHTML = html || '<div style="color:var(--text3);font-size:0.8rem;text-align:center">Binasız mülk yok</div>';
    };

    buildList(state.currentPI, '#trade-my-props');
    if (targetPI !== -1) buildList(targetPI, '#trade-target-props');
}

function submitTrade() {
    const targetId = $('#trade-target').value;
    const myMoney = parseInt($('#trade-my-money').value) || 0;
    const targetMoney = parseInt($('#trade-target-money').value) || 0;

    const getChecked = id => Array.from(document.querySelectorAll(`${id} input:checked`)).map(e => parseInt(e.value));
    const offerProps = getChecked('#trade-my-props');
    const requestProps = getChecked('#trade-target-props');

    if (myMoney === 0 && targetMoney === 0 && offerProps.length === 0 && requestProps.length === 0) {
        showToast('Lütfen bir ticaret teklifi oluşturun.', 'error');
        return;
    }

    send({
        type: 'propose_trade',
        targetPlayerId: targetId,
        offerProps,
        requestProps,
        offerMoney: myMoney,
        requestMoney: targetMoney
    });
    closeTradeModal();
}

function showTradeOfferModal() {
    const tr = state.trade;
    const modal = $('#trade-offer-modal');
    const proposer = state.players[tr.proposer];

    const getPropList = (arr) => arr.map(idx => {
        const sq = board[idx];
        return `<div class="trade-prop-item" style="pointer-events:none;">
            <div style="width:12px;height:12px;border-radius:2px;background:${sq.colorHex || '#bbb'}"></div>
            ${sq.name}
        </div>`;
    }).join('') || '<div style="color:var(--text3);font-size:0.8rem;text-align:center">Mülk yok</div>';

    modal.innerHTML = `
        <div class="trade-header" style="color:var(--green)">Yeni Takas Teklifi!</div>
        <div style="text-align:center;margin-bottom:10px;font-size:0.9rem;color:var(--text2)">
            <b style="color:${proposer.color}">${proposer.name}</b> sizinle takas yapmak istiyor.
        </div>
        
        <div class="trade-diff-summary" style="text-align:center; padding:10px; background:var(--bg3); border-radius:8px; margin-bottom:15px;">
           <div style="font-size:1.1rem; color:var(--text); font-weight:bold;">
              Net Para Farkı: ${tr.offerMoney === tr.requestMoney ? 'Yok' :
            tr.offerMoney > tr.requestMoney ? `<span style="color:var(--green)">+₺${tr.offerMoney - tr.requestMoney} Sana</span>` :
                `<span style="color:var(--red)">-₺${tr.requestMoney - tr.offerMoney} Senden</span>`}
           </div>
        </div>

        <div class="trade-sections">
            <div class="trade-section">
                <h3>Sana Verilenler</h3>
                <div class="trade-props-list">${getPropList(tr.offerProps)}</div>
                <div style="margin-top:auto;text-align:center;font-size:1.1rem;color:var(--green);font-weight:bold;">
                    + ₺${tr.offerMoney}
                </div>
            </div>
            <div class="trade-section">
                <h3>Senden İstenenler</h3>
                <div class="trade-props-list">${getPropList(tr.requestProps)}</div>
                <div style="margin-top:auto;text-align:center;font-size:1.1rem;color:var(--red);font-weight:bold;">
                    - ₺${tr.requestMoney}
                </div>
            </div>
        </div>
        <div class="trade-actions" style="margin-top:20px;">
            <button class="btn btn-secondary" onclick="send({type:'decline_trade'});closeTradeOfferModal()">Reddet</button>
            <button class="btn btn-primary" onclick="send({type:'accept_trade'});closeTradeOfferModal()">Kabul Et</button>
        </div>
    `;
    $('#trade-offer-overlay').classList.add('show');
}

// ─── KEYBOARD ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBuyModal(); closeAuctionModal(); }
    if (e.key === ' ' && state) {
        e.preventDefault();
        const cp = state.players[state.currentPI];
        if (cp?.id === myId) {
            if (state.phase === 'roll') send({ type: 'roll_dice' });
            else if (state.phase === 'post_roll') send({ type: 'end_turn' });
        }
    }
});

// ─── DEV TOOLS ──────────────────────────────────────────────
window.giveColorGroup = function () {
    const pid = $('#dev-player').value;
    const col = $('#dev-color').value;
    if (pid && col) {
        send({ type: 'dev_give_group', targetPlayerId: pid, colorHex: col });
    }
};
