const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('gameOver');
const pauseMenuEl = document.getElementById('pauseMenu');
const levelTransitionEl = document.getElementById('levelTransition');
const remainingEl = document.getElementById('remaining-enemies');

// --- CARGA DE IMÁGENES ---
const imgNave = new Image();
imgNave.src = 'nave.png';

const imgEnemigo = new Image();
imgEnemigo.src = 'enemigo.png';

const imgJefe = new Image();
imgJefe.src = 'jefe.png';

// Variables globales
let score = 0;
let lives = 3;
const MAX_LIVES = 5; 
let isInvulnerable = false;
let gameOver = false;
let isPaused = false; 
let isTransitioning = false; 

// Variables del Sistema de Niveles
let currentLevel = 1;
let enemiesDefeatedInLevel = 0;
let targetKills = 30; 
let enemySpeedMin = 1.0; 
let enemySpeedMax = 2.0;
let basePowerUpChance = 0.35; 

// Variables de ventajas
let invulnerabilityTimer = null;
let autoFireTimer = null;
let autoShooterInterval = null;
let isAutoFire = false;
let spawnCountV1 = 0;
let spawnCountV3 = 0;

// Entidades principales (¡TAMAÑOS AUMENTADOS!)
const player = { x: 400, y: 550, width: 60, height: 60, speed: 6 };
const bullets = [];
const enemies = [];
const powerUps = []; 

// JEFE DEL NIVEL 4 (¡TAMAÑO AUMENTADO!)
const boss = { 
    active: false, 
    x: 400, y: 130, 
    radius: 95, // Imagen total de 190x190
    hp: 500, maxHp: 500, 
    speed: 2, dx: 1 
};

remainingEl.innerText = targetKills;

// Controles
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && !gameOver && !isPaused && !isTransitioning) shoot();
    if (e.code === 'KeyP') togglePause();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function togglePause() {
    if (gameOver || isTransitioning) return;
    isPaused = !isPaused;
    pauseMenuEl.style.display = isPaused ? 'flex' : 'none';
}

function shoot() {
    bullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        width: 4, height: 20, speed: 10,
        color: isAutoFire ? '#eab308' : '#38bdf8' 
    });
}

function showGameOver(text) {
    gameOver = true;
    gameOverEl.innerHTML = text;
    gameOverEl.style.display = 'flex';
}

// Lógica de avance de nivel
function checkLevelProgress() {
    if (enemiesDefeatedInLevel >= targetKills) {
        if (currentLevel === 4) return; 

        currentLevel++;
        enemiesDefeatedInLevel = 0;
        isTransitioning = true;
        
        bullets.length = 0;
        enemies.length = 0;
        powerUps.length = 0;

        levelTransitionEl.style.display = 'flex';
        document.getElementById('transition-text').innerText = currentLevel === 4 ? 'JEFE FINAL' : 'NIVEL ' + currentLevel;
        
        if (currentLevel === 2) {
            targetKills = 35;
            basePowerUpChance -= 0.055; 
            enemySpeedMin = 2.0; 
            enemySpeedMax = 3.5;
        } else if (currentLevel === 3) {
            targetKills = 50;
            enemySpeedMin = 3.2; 
            enemySpeedMax = 4.9;
            document.getElementById('l3-tracker').style.display = 'block';
            document.getElementById('ventaja-counter').innerText = 10;
        } else if (currentLevel === 4) {
            targetKills = Infinity;
            document.getElementById('l3-tracker').style.display = 'none';
            document.getElementById('remaining-container').style.display = 'none';
            document.getElementById('boss-ui').style.display = 'block';
            boss.active = true;
            boss.hp = 500;
        }

        if(currentLevel < 4) remainingEl.innerText = targetKills;

        let count = 3;
        document.getElementById('countdown-text').innerText = count;
        
        let countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                document.getElementById('countdown-text').innerText = count;
            } else {
                clearInterval(countdownInterval);
                levelTransitionEl.style.display = 'none';
                isTransitioning = false;
                document.getElementById('level-display').innerText = currentLevel;
            }
        }, 1000);
    }
}

// Generador de Enemigos / Disparos del Jefe
setInterval(() => {
    if (!gameOver && !isPaused && !isTransitioning) {
        if (currentLevel === 4 && boss.active) {
            // Balas del jefe (Tamaño aumentado a 50x50)
            enemies.push({ x: boss.x - 40, y: boss.y + boss.radius, width: 50, height: 50, speed: 3.2 + Math.random() * 1.7 });
            enemies.push({ x: boss.x + 40, y: boss.y + boss.radius, width: 50, height: 50, speed: 3.2 + Math.random() * 1.7 });
        } else if (currentLevel < 4) {
            let eSize = 45; // Enemigo normal aumentado
            if (currentLevel === 3 && Math.random() < 0.3) eSize = 25; // Enemigo pequeño aumentado

            enemies.push({
                x: Math.random() * (canvas.width - 60) + 30, // Ajuste para que no se salgan del borde
                y: -50,
                width: eSize, height: eSize,
                speed: enemySpeedMin + Math.random() * (enemySpeedMax - enemySpeedMin)
            });
        }
    }
}, 1200); 

function applyRandomPowerUpDirectly() {
    let rand = Math.random() * 100;
    let tipo;
    
    if (rand < 5) { 
        tipo = 2; 
    } else if (rand < 50) { 
        tipo = 1; 
    } else { 
        tipo = 3; 
    }
    aplicarVentaja(tipo); 
}

// Generador Base de Ventajas
setInterval(() => {
    if (!gameOver && !isPaused && !isTransitioning && currentLevel < 4 && Math.random() < basePowerUpChance) { 
        let tipo, color;
        let rand = Math.random() * 100;
        
        if (rand < 54) { 
            tipo = 1; color = '#eab308'; spawnCountV1++; 
        } else { 
            tipo = 3; color = '#a855f7'; spawnCountV3++; 
        }
        
        if (spawnCountV1 >= 4 || spawnCountV3 >= 2) {
            tipo = 2; color = '#22c55e';
            spawnCountV1 = 0; spawnCountV3 = 0;
        }

        powerUps.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30, radius: 12, speed: 1.5, type: tipo, color: color
        });
    }
}, 3000); 

function aplicarVentaja(tipo) {
    if (tipo === 1) {
        isAutoFire = true;
        player.speed = 11; 
        
        if (autoFireTimer) clearTimeout(autoFireTimer);
        if (autoShooterInterval) clearInterval(autoShooterInterval);

        autoShooterInterval = setInterval(() => {
            if (!gameOver && !isPaused && !isTransitioning) shoot();
        }, 150);

        autoFireTimer = setTimeout(() => {
            isAutoFire = false;
            player.speed = 6; 
            clearInterval(autoShooterInterval);
        }, 5000); 

    } else if (tipo === 2) {
        if (lives < MAX_LIVES) {
            lives++;
            livesEl.innerText = lives;
        } else {
            score += 50; 
            scoreEl.innerText = score;
        }
    } else if (tipo === 3) {
        isInvulnerable = true;
        if (invulnerabilityTimer) clearTimeout(invulnerabilityTimer);
        invulnerabilityTimer = setTimeout(() => {
            isInvulnerable = false;
        }, 6000); 
    }
}

function takeDamage() {
    if (!isInvulnerable) {
        lives--;
        livesEl.innerText = lives;
        
        if (lives <= 0) {
            showGameOver("FIN DEL JUEGO<br><span class='action-btn' onclick='location.reload()'>Reiniciar</span>");
            if (autoShooterInterval) clearInterval(autoShooterInterval); 
        } else {
            isInvulnerable = true;
            if (invulnerabilityTimer) clearTimeout(invulnerabilityTimer);
            invulnerabilityTimer = setTimeout(() => {
                isInvulnerable = false;
            }, 2000);
        }
    }
}

// Físicas y colisiones
function update() {
    if (gameOver || isPaused || isTransitioning) return;

    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x - player.width / 2 > 0) player.x -= player.speed;
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x + player.width / 2 < canvas.width) player.x += player.speed;

    if (boss.active) {
        boss.x += boss.speed * boss.dx;
        if (boss.x - boss.radius < 0 || boss.x + boss.radius > canvas.width) {
            boss.dx *= -1;
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        let b = bullets[i];
        
        if (boss.active) {
            let dist = Math.hypot(b.x - boss.x, b.y - boss.y);
            if (dist < boss.radius) {
                bullets.splice(i, 1);
                boss.hp -= 5;
                document.getElementById('boss-hp').innerText = boss.hp;
                score += 5; 
                scoreEl.innerText = score;
                
                if (boss.hp <= 0) {
                    boss.active = false;
                    showGameOver("<span style='font-size: 60px; color: #22c55e; text-shadow: 0 0 20px #22c55e;'>Ganaste ver spiderman conmigo</span><br><span style='font-size:24px; color:#fff;'>(pasame capturaa)</span><br><br><span class='action-btn' onclick='location.reload()'>Jugar de nuevo</span>");
                }
                continue; 
            }
        }

        if (b.y < 0) bullets.splice(i, 1);
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].y += powerUps[i].speed;
        if (powerUps[i].y > canvas.height) { powerUps.splice(i, 1); continue; }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let p = powerUps[i];

            if (p && b.x < p.x + p.radius && b.x + b.width > p.x - p.radius && 
                b.y < p.y + p.radius && b.y + b.height > p.y - p.radius) {
                aplicarVentaja(p.type);
                bullets.splice(j, 1);
                powerUps.splice(i, 1);
                score += 5; scoreEl.innerText = score;
                break; 
            }
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i]) continue; 

        enemies[i].y += enemies[i].speed;
        
        if (enemies[i].y + enemies[i].height / 2 > canvas.height) {
            enemies.splice(i, 1);
            takeDamage();
            if (gameOver) return; 
            continue; 
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let e = enemies[i];

            if (b.x < e.x + e.width/2 && b.x + b.width > e.x - e.width/2 && 
                b.y < e.y + e.height/2 && b.y + b.height > e.y - e.height/2) {
                
                bullets.splice(j, 1);
                enemies.splice(i, 1);
                
                score += 10;
                scoreEl.innerText = score;
                
                if (currentLevel < 4) {
                    enemiesDefeatedInLevel++;
                    remainingEl.innerText = targetKills - enemiesDefeatedInLevel;
                    
                    if (currentLevel === 3) {
                        let restantes = 10 - (enemiesDefeatedInLevel % 10);
                        if (restantes === 10 && enemiesDefeatedInLevel !== 0) {
                            applyRandomPowerUpDirectly(); 
                        }
                        document.getElementById('ventaja-counter').innerText = restantes;
                    }
                    checkLevelProgress();
                    if (isTransitioning) return; 
                }
                break; 
            }
        }
    }
}

// Renderizado de gráficos
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar al Jugador (Nave)
    ctx.save();
    ctx.translate(player.x, player.y);
    
    if (isInvulnerable) {
        if (Math.floor(Date.now() / 150) % 2 === 0) ctx.globalAlpha = 0.4; 
        if (invulnerabilityTimer && invulnerabilityTimer > 2000) {
            ctx.shadowBlur = 15; ctx.shadowColor = '#a855f7';
        }
    }
    
    if (isAutoFire) {
        ctx.shadowBlur = 10; ctx.shadowColor = '#eab308';
    }

    if (imgNave.complete && imgNave.naturalHeight !== 0) {
        ctx.drawImage(imgNave, -player.width / 2, -player.height / 2, player.width, player.height);
    } else {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    }
    ctx.restore();

    // Dibujar Balas
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.fillRect(b.x - b.width/2, b.y, b.width, b.height);
        ctx.shadowBlur = 0; 
    });

    // Dibujar Jefe (Nivel 4)
    if (boss.active) {
        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        
        if (imgJefe.complete && imgJefe.naturalHeight !== 0) {
            ctx.drawImage(imgJefe, -boss.radius, -boss.radius, boss.radius * 2, boss.radius * 2);
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Barra de Vida
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(boss.x - 50, boss.y - boss.radius - 25, 100, 10); 
        ctx.fillStyle = '#22c55e'; 
        if (boss.hp < 150) ctx.fillStyle = '#eab308'; 
        if (boss.hp < 50) ctx.fillStyle = '#ef4444'; 
        ctx.fillRect(boss.x - 50, boss.y - boss.radius - 25, (boss.hp / boss.maxHp) * 100, 10);
    }

    // Dibujar Ventajas
    powerUps.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15; ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        if(p.type === 1) ctx.fillText('⚡', 0, 0);
        if(p.type === 2) ctx.fillText('❤', 0, 0);
        if(p.type === 3) ctx.fillText('🛡', 0, 0);
        ctx.restore();
    });

    // Dibujar Enemigos
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        
        if (currentLevel === 4 && e.color) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (imgEnemigo.complete && imgEnemigo.naturalHeight !== 0) {
            ctx.drawImage(imgEnemigo, -e.width / 2, -e.height / 2, e.width, e.height);
        } 
        else {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
        }
        ctx.restore();
    });
    
    // Zona Segura
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 2);
    ctx.lineTo(canvas.width, canvas.height - 2);
    ctx.stroke();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();