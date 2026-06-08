const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('gameOver');
const pauseMenuEl = document.getElementById('pauseMenu');
const levelTransitionEl = document.getElementById('levelTransition');
const remainingEl = document.getElementById('remaining-enemies');

const imgNave = new Image(); imgNave.src = 'nave.png';
const imgEnemigo = new Image(); imgEnemigo.src = 'enemigo.png';
const imgJefe = new Image(); imgJefe.src = 'jefe.png';

let score = 0, lives = 3, isInvulnerable = false, gameOver = false, isPaused = false, isTransitioning = false;
const MAX_LIVES = 5;

let currentLevel = 1, enemiesDefeatedInLevel = 0, targetKills = 30, enemySpeedMin = 1.0, enemySpeedMax = 2.0, basePowerUpChance = 0.35;
let invulnerabilityTimer = null, autoFireTimer = null, autoShooterInterval = null, isAutoFire = false, spawnCountV1 = 0, spawnCountV3 = 0;

const player = { x: 400, y: 550, width: 80, height: 80, speed: 6 };
const bullets = [], enemies = [], powerUps = []; 
const boss = { active: false, x: 400, y: 150, radius: 130, hp: 500, maxHp: 500, speed: 2.5, dx: 1 };
const bossBullets = []; 
let bossAttackInterval = null; 

remainingEl.innerText = targetKills;

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && !gameOver && !isPaused && !isTransitioning) shoot();
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyK' && !gameOver && !isPaused && !isTransitioning) {
        if (currentLevel < 4) { enemiesDefeatedInLevel = targetKills; checkLevelProgress(); }
        else if (currentLevel === 4 && boss.active) boss.hp = 0;
    }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function togglePause() { if (gameOver || isTransitioning) return; isPaused = !isPaused; pauseMenuEl.style.display = isPaused ? 'flex' : 'none'; }
function shoot() { bullets.push({ x: player.x, y: player.y - player.height / 2, width: 4, height: 20, speed: 10, color: isAutoFire ? '#eab308' : '#38bdf8' }); }
function showGameOver(text) { gameOver = true; gameOverEl.innerHTML = text; gameOverEl.style.display = 'flex'; }

function checkLevelProgress() {
    if (enemiesDefeatedInLevel >= targetKills) {
        if (currentLevel === 4) return; 
        currentLevel++; enemiesDefeatedInLevel = 0; isTransitioning = true;
        bullets.length = 0; enemies.length = 0; powerUps.length = 0; bossBullets.length = 0; 
        levelTransitionEl.style.display = 'flex';
        document.getElementById('transition-text').innerText = currentLevel === 4 ? 'JEFE FINAL' : 'NIVEL ' + currentLevel;
        if (currentLevel === 2) { targetKills = 35; basePowerUpChance -= 0.055; enemySpeedMin = 2.0; enemySpeedMax = 3.5; }
        else if (currentLevel === 3) { targetKills = 50; enemySpeedMin = 3.2; enemySpeedMax = 4.9; document.getElementById('l3-tracker').style.display = 'block'; document.getElementById('ventaja-counter').innerText = 10; }
        else if (currentLevel === 4) {
            targetKills = Infinity; document.getElementById('l3-tracker').style.display = 'none'; document.getElementById('remaining-container').style.display = 'none'; document.getElementById('boss-ui').style.display = 'block'; boss.active = true; boss.hp = 500;
            bossAttackInterval = setInterval(() => {
                if (!gameOver && !isPaused && boss.active && !isTransitioning) {
                    bossBullets.push({ x: boss.x + (Math.random() * boss.radius - boss.radius / 2), y: boss.y + boss.radius * 0.8, width: 8, height: 35, speed: 7 + Math.random() * 5, color: '#ef4444' });
                }
            }, 450); 
        }
        if(currentLevel < 4) remainingEl.innerText = targetKills;
        let count = 3; document.getElementById('countdown-text').innerText = count;
        let countdownInterval = setInterval(() => { count--; if (count > 0) document.getElementById('countdown-text').innerText = count; else { clearInterval(countdownInterval); levelTransitionEl.style.display = 'none'; isTransitioning = false; document.getElementById('level-display').innerText = currentLevel; } }, 1000);
    }
}

setInterval(() => {
    if (!gameOver && !isPaused && !isTransitioning && currentLevel < 4) {
        let eSize = 70; if (currentLevel === 3 && Math.random() < 0.3) eSize = 50;
        enemies.push({ x: Math.random() * (canvas.width - 80) + 40, y: -80, width: eSize, height: eSize, speed: enemySpeedMin + Math.random() * (enemySpeedMax - enemySpeedMin) });
    }
}, 1200); 

function applyRandomPowerUpDirectly() {
    let rand = Math.random() * 100;
    let tipo = (rand < 5) ? 2 : (rand < 50) ? 1 : 3;
    aplicarVentaja(tipo); 
}

setInterval(() => {
    if (!gameOver && !isPaused && !isTransitioning && Math.random() < basePowerUpChance) { 
        let rand = Math.random() * 100;
        let tipo = (rand < 54) ? 1 : 3; 
        if (spawnCountV1 >= 4 || spawnCountV3 >= 2) { tipo = 2; spawnCountV1 = 0; spawnCountV3 = 0; }
        powerUps.push({ x: Math.random() * (canvas.width - 40) + 20, y: -30, radius: 12, speed: 1.5, type: tipo, color: (tipo==1?'#eab308':tipo==2?'#22c55e':'#a855f7') });
    }
}, 3000); 

function aplicarVentaja(tipo) {
    if (tipo === 1) { isAutoFire = true; player.speed = 11; if (autoFireTimer) clearTimeout(autoFireTimer); if (autoShooterInterval) clearInterval(autoShooterInterval); autoShooterInterval = setInterval(() => { if (!gameOver && !isPaused && !isTransitioning) shoot(); }, 150); autoFireTimer = setTimeout(() => { isAutoFire = false; player.speed = 6; clearInterval(autoShooterInterval); }, 5000); }
    else if (tipo === 2) { if (lives < MAX_LIVES) { lives++; livesEl.innerText = lives; } else { score += 50; scoreEl.innerText = score; } }
    else if (tipo === 3) { isInvulnerable = true; if (invulnerabilityTimer) clearTimeout(invulnerabilityTimer); invulnerabilityTimer = setTimeout(() => { isInvulnerable = false; }, 6000); }
}

function takeDamage() { if (!isInvulnerable) { lives--; livesEl.innerText = lives; if (lives <= 0) { if (bossAttackInterval) clearInterval(bossAttackInterval); showGameOver("FIN DEL JUEGO<br><span class='action-btn' onclick='location.reload()'>Reiniciar</span>"); if (autoShooterInterval) clearInterval(autoShooterInterval); } else { isInvulnerable = true; if (invulnerabilityTimer) clearTimeout(invulnerabilityTimer); invulnerabilityTimer = setTimeout(() => { isInvulnerable = false; }, 2000); } } }

function update() {
    if (gameOver || isPaused || isTransitioning) return;
    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x - player.width / 2 > 0) player.x -= player.speed;
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x + player.width / 2 < canvas.width) player.x += player.speed;
    if (boss.active) { boss.x += boss.speed * boss.dx; if (boss.x - boss.radius < 0 || boss.x + boss.radius > canvas.width) boss.dx *= -1; if (boss.hp <= 0) { boss.active = false; if (bossAttackInterval) clearInterval(bossAttackInterval); showGameOver("<span style='font-size: 60px; color: #22c55e; text-shadow: 0 0 20px #22c55e;'>Ganaste ver spiderman conmigo</span><br><span style='font-size:24px; color:#fff;'>(pasame capturaa)</span><br><br><span class='action-btn' onclick='location.reload()'>Jugar de nuevo</span>"); return; } }
    for (let i = bullets.length - 1; i >= 0; i--) { bullets[i].y -= bullets[i].speed; let b = bullets[i]; if (boss.active && Math.hypot(b.x - boss.x, b.y - boss.y) < boss.radius) { bullets.splice(i, 1); boss.hp -= 5; document.getElementById('boss-hp').innerText = boss.hp; score += 5; scoreEl.innerText = score; continue; } if (b.y < 0) bullets.splice(i, 1); }
    for (let i = bossBullets.length - 1; i >= 0; i--) { let bb = bossBullets[i]; bb.y += bb.speed; if (bb.x < player.x + player.width/2 && bb.x + bb.width > player.x - player.width/2 && bb.y < player.y + player.height/2 && bb.y + bb.height > player.y - player.height/2) { bossBullets.splice(i, 1); takeDamage(); continue; } if (bb.y > canvas.height) bossBullets.splice(i, 1); }
    for (let i = powerUps.length - 1; i >= 0; i--) { powerUps[i].y += powerUps[i].speed; if (powerUps[i].y > canvas.height) { powerUps.splice(i, 1); continue; } for (let j = bullets.length - 1; j >= 0; j--) { let b = bullets[j]; let p = powerUps[i]; if (p && b.x < p.x + p.radius && b.x + b.width > p.x - p.radius && b.y < p.y + p.radius && b.y + b.height > p.y - p.radius) { aplicarVentaja(p.type); bullets.splice(j, 1); powerUps.splice(i, 1); score += 5; scoreEl.innerText = score; break; } } }
    for (let i = enemies.length - 1; i >= 0; i--) { if (!enemies[i]) continue; enemies[i].y += enemies[i].speed; if (enemies[i].y + enemies[i].height / 2 > canvas.height) { enemies.splice(i, 1); takeDamage(); if (gameOver) return; continue; } for (let j = bullets.length - 1; j >= 0; j--) { let b = bullets[j]; let e = enemies[i]; if (b.x < e.x + e.width/2 && b.x + b.width > e.x - e.width/2 && b.y < e.y + e.height/2 && b.y + b.height > e.y - e.height/2) { bullets.splice(j, 1); enemies.splice(i, 1); score += 10; scoreEl.innerText = score; if (currentLevel < 4) { enemiesDefeatedInLevel++; remainingEl.innerText = targetKills - enemiesDefeatedInLevel; if (currentLevel === 3) { let restantes = 10 - (enemiesDefeatedInLevel % 10); if (restantes === 10 && enemiesDefeatedInLevel !== 0) applyRandomPowerUpDirectly(); document.getElementById('ventaja-counter').innerText = restantes; } checkLevelProgress(); if (isTransitioning) return; } break; } } }
}

function draw() { ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(player.x, player.y); if (isInvulnerable && Math.floor(Date.now() / 150) % 2 === 0) ctx.globalAlpha = 0.4; if (isAutoFire) { ctx.shadowBlur = 10; ctx.shadowColor = '#eab308'; } const rec = 12; if (imgNave.complete && imgNave.naturalWidth > 24) ctx.drawImage(imgNave, rec, rec, imgNave.naturalWidth - 24, imgNave.naturalHeight - 24, -player.width/2, -player.height/2, player.width, player.height); else ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height); ctx.restore(); bullets.forEach(b => { ctx.fillStyle = b.color; ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fillRect(b.x - b.width/2, b.y, b.width, b.height); }); bossBullets.forEach(bb => { ctx.fillStyle = bb.color; ctx.roundRect(bb.x - bb.width/2, bb.y - bb.height/2, bb.width, bb.height, 5); ctx.fill(); }); if (boss.active) { ctx.save(); ctx.translate(boss.x, boss.y); if (imgJefe.complete && imgJefe.naturalWidth > 24) ctx.drawImage(imgJefe, rec, rec, imgJefe.naturalWidth - 24, imgJefe.naturalHeight - 24, -boss.radius, -boss.radius, boss.radius * 2, boss.radius * 2); else { ctx.beginPath(); ctx.arc(0, 0, boss.radius, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; ctx.fillRect(boss.x - 75, boss.y - boss.radius - 30, 150, 12); ctx.fillStyle = boss.hp < 50 ? '#ef4444' : boss.hp < 150 ? '#eab308' : '#22c55e'; ctx.fillRect(boss.x - 75, boss.y - boss.radius - 30, (boss.hp / boss.maxHp) * 150, 12); } powerUps.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.fillStyle = '#000'; ctx.fillText(p.type === 1 ? '⚡' : p.type === 2 ? '❤' : '🛡', p.x, p.y); }); enemies.forEach(e => { ctx.save(); ctx.translate(e.x, e.y); if (imgEnemigo.complete && imgEnemigo.naturalWidth > 24) ctx.drawImage(imgEnemigo, rec, rec, imgEnemigo.naturalWidth - 24, imgEnemigo.naturalHeight - 24, -e.width/2, -e.height/2, e.width, e.height); else { ctx.fillStyle = '#ef4444'; ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height); } ctx.restore(); }); if (currentLevel < 4) { ctx.beginPath(); ctx.moveTo(0, canvas.height - 2); ctx.lineTo(canvas.width, canvas.height - 2); ctx.stroke(); } }
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();