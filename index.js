const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1024;
canvas.height = 576;

const collisionsMap = []
for(let i = 0; i < collisions.length; i += 70) {
    collisionsMap.push(collisions.slice(i, i + 70));
}

const battleZonesMap = []
for(let i = 0; i < battleZonesData.length; i += 70) {
    battleZonesMap.push(battleZonesData.slice(i, i + 70));
}

class Boundary {
    static width = 48;
    static height = 48;
    constructor({position}) {
        this.position = position;
        this.width = 48;
        this.height = 48;
    }
    
    draw() {
        c.fillStyle = "rgba(255, 0, 0, 0)";
        c.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
}

const battleZones = []
const boundaries = []

const offset = {
    x: -735,
    y: -650
}

collisionsMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if(symbol === 1025) {
            boundaries.push(
                new Boundary({
                    position: {
                        x: j * Boundary.width + offset.x,
                        y: i * Boundary.height + offset.y
                    }
                })
            )
        }
    })
})

battleZonesMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if(symbol === 1025) {
            battleZones.push(
                new Boundary({
                    position: {
                        x: j * Boundary.width + offset.x,
                        y: i * Boundary.height + offset.y
                    }
                })
            )
        }
    })
})

class Sprite {
    constructor({position, image, frames = { max: 1, hold: 10 }, sprites, animate = false, rotation = 0 }) {
        this.position = position;
        this.image = new Image();
        this.frames = {...frames, val: 0, elapsed: 0 };
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max;
            this.height = this.image.height;
        }

        this.image.src = image.src
        this.animate = animate;
        this.sprites = sprites;
        this.opacity = 1;
        this.rotation = rotation
    }

    
    draw() {
        c.save()
        c.translate(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        )
        c.rotate(this.rotation)
        c.translate(
            -this.position.x - this.width / 2,
            -this.position.y - this.height / 2
        )
        c.globalAlpha = this.opacity;
        c.drawImage(
            this.image,
            this.frames.val * this.width,
            0,
            this.image.width / this.frames.max,
            this.image.height,
            this.position.x,
            this.position.y,
            this.image.width / this.frames.max,
            this.image.height
        )
        c.restore();

        if(!this.animate) return

        if(this.frames.max > 1) this.frames.elapsed++;
        
        if(this.frames.elapsed % this.frames.hold === 0) {
            if(this.frames.val < this.frames.max - 1) this.frames.val++;
            else this.frames.val = 0;
        }
    }
}

class Monster extends Sprite {
    constructor({
        position, image, frames = { max: 1, hold: 10 }, sprites, animate = false, rotation = 0,
        isEnemy = false, 
        name,
        attacks
    }) {
        super({position, image, frames, sprites, animate, rotation})
        this.health = 100;
        this.isEnemy = isEnemy;
        this.name = name
        this.attacks = attacks
    }

    faint() {
        document.querySelector("#dialogueBox").innerHTML = this.name + " fainted!"

        gsap.to(this.position, {
            y: this.position.y + 20
        })

        gsap.to(this, {
            opacity: 0
        })

        audio.Battle.stop()
        audio.victory.play()

    }

    attack({ attack, recipient, renderedSprites }) {
        let dialogueBox = document.querySelector("#dialogueBox")
        dialogueBox.style.display = "block";
        dialogueBox.innerHTML = this.name + " used " + attack.name
        recipient.health -= attack.damage;
        let hpbar = "#enemyHealthBar";
        if(this.isEnemy) hpbar = "#playerHealthBar";
        let rotation = 1
        if(this.isEnemy) rotation = -2.2;

        switch (attack.name) {
            case "Fireball":
                audio.initFireball.play()
                const fireballImage = new Image()
                fireballImage.src = "./img/fireball.png"
                const fireball = new Sprite({
                    position: {
                        x: this.position.x,
                        y: this.position.y
                    },
                    image: fireballImage,
                    frames: {
                        max: 4,
                        hold: 10
                    },
                    animate: true,
                    rotation
                })

                renderedSprites.splice(1, 0, fireball)

                gsap.to(fireball.position, {
                    x: recipient.position.x,
                    y: recipient.position.y,
                    onComplete: () => {
                        audio.fireballHit.play()
                        gsap.to(hpbar, {
                            width: recipient.health + "%"
                        })
                        gsap.to(recipient.position, {
                            x: recipient.position.x + 10,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.08
                        })
        
                        gsap.to(recipient, {
                            opacity: 0,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.08
                        })
                        renderedSprites.splice(1,1);
                    }
                })

                break;
            case "Tackle":
                const tl = gsap.timeline()
        
                let movement = 20;
                if(this.isEnemy) movement = -20;
        
                tl.to(this.position, {
                    x: this.position.x - movement
                }).to(this.position, {
                    x: this.position.x + movement * 2,
                    duration: 0.1,
                    onComplete() {
                        audio.tackleHit.play()
                        gsap.to(hpbar, {
                            width: recipient.health + "%"
                        })
                        gsap.to(recipient.position, {
                            x: recipient.position.x + 10,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.08
                        })
        
                        gsap.to(recipient, {
                            opacity: 0,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.08
                        })
                    }
                }).to(this.position, {
                    x: this.position.x
                })
                break;
        }
    }
}

const image = new Image();
image.src = "./img/PelletTown.png";

const foregroundImg = new Image();
foregroundImg.src = "./img/Foreground Objects.png";

const playerDownImage = new Image();
playerDownImage.src = "./img/playerDown.png"

const playerUpImage = new Image();
playerUpImage.src = "./img/playerUp.png"

const playerLeftImage = new Image();
playerLeftImage.src = "./img/playerLeft.png"

const playerRightImage = new Image();
playerRightImage.src = "./img/playerRight.png"

const player = new Sprite({
    position: {
        x: canvas.width / 2 - 192 / 4 / 2,
        y: canvas.height / 2 - 68 / 2
    },
    image: playerDownImage,
    frames: {
        max: 4,
        hold: 10
    },
    sprites: {
        up: playerUpImage,
        left: playerLeftImage,
        down: playerDownImage,
        right: playerRightImage
    }
})

const background = new Sprite({
    position: {
        x: offset.x,
        y: offset.y
    },
    image: image
});

const foreground = new Sprite({
    position: {
        x: offset.x,
        y: offset.y
    },
    image: foregroundImg
});

const keys = {
    w: { 
        pressed: false
    },
    a: { 
        pressed: false
    },
    s: { 
        pressed: false
    },
    d: { 
        pressed: false
    }
}

const movables = [background, ...boundaries, foreground, ...battleZones] //... "unpacks" the array?

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.position.y <= rectangle2.position.y + rectangle2.height &&
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y
    )
}

const battle = {
    initiated: false
}

function animate() {
    const animationId = window.requestAnimationFrame(animate);
    background.draw();
    boundaries.forEach(boundary => {
        boundary.draw();
    })
    battleZones.forEach(battleZone => {
        battleZone.draw();
    })
    player.draw();
    foreground.draw();

    let moving = true;
    player.animate = false;

    if(battle.initiated) return

    //activate Battle
    if(keys.w.pressed || keys.a.pressed || keys.s.pressed || keys.d.pressed) {
        for(let i = 0; i < battleZones.length; i++) {
            const battleZone = battleZones[i];
            const overlappingArea = 
            (Math.min(
                player.position.x + player.width,
                battleZone.position.x + battleZone.width
            ) - Math.max(
                player.position.x, battleZone.position.x
            )) * (Math.min(
                player.position.y + player.height,
                battleZone.position.y + battleZone.height
            ) - Math.max(player.position.y, battleZone.position.y))
            if (rectangularCollision({
                rectangle1: player,
                rectangle2: battleZone
            }) && overlappingArea > (player.width * player.height) / 2 && Math.random() < 0.01 )
            {
                console.log("Battle activated")

                //deactivate current animation loop
                window.cancelAnimationFrame(animationId);

                audio.Map.stop()
                audio.InitBattle.play()
                audio.Battle.play()

                battle.initiated = true
                gsap.to("#overlappingDiv", {
                    opacity: 1,
                    repeat: 5,
                    yoyo: true,
                    duration: 0.4,
                    onComplete() {
                        gsap.to("#overlappingDiv", {
                            opacity: 1,
                            duration: 0.4,
                            onComplete() {
                                initBattle()
                                animateBattle()
                                gsap.to("#overlappingDiv", {
                                    opacity: 0,
                                    duration: 0.4
                                })
                        }})
                    }
                })
                break;
            }
        }
    }

    if (keys.w.pressed && lastKey === "w") {
        player.animate = true;
        player.image = player.sprites.up
        for(let i = 0; i < boundaries.length; i++) {
            const boundary = boundaries[i];
            if (rectangularCollision({
                rectangle1: player,
                rectangle2: {...boundary, position: {
                    x: boundary.position.x,
                    y: boundary.position.y + 3
                }}
            }))
            {
                moving = false;
                break;
            }
        }
        
        if(moving)
            movables.forEach((movable) => {
                movable.position.y += 3;
            })
    }
    else if (keys.a.pressed && lastKey === "a") {
        player.animate = true;
        player.image = player.sprites.left
        for(let i = 0; i < boundaries.length; i++) {
            const boundary = boundaries[i];
            if (rectangularCollision({
                rectangle1: player,
                rectangle2: {...boundary, position: {
                    x: boundary.position.x + 3,
                    y: boundary.position.y
                }}
            }))
            {
                moving = false;
                break;
            }
        }
        
        if(moving)
            movables.forEach((movable) => {
                movable.position.x += 3;
            })
    }
    else if (keys.s.pressed && lastKey === "s") {
        player.animate = true;
        player.image = player.sprites.down
        for(let i = 0; i < boundaries.length; i++) {
            const boundary = boundaries[i];
            if (rectangularCollision({
                rectangle1: player,
                rectangle2: {...boundary, position: {
                    x: boundary.position.x,
                    y: boundary.position.y - 3
                }}
            }))
            {
                moving = false;
                break;
            }
        }
        
        if(moving)
            movables.forEach((movable) => {
                movable.position.y -= 3;
            })
        } 
    else if (keys.d.pressed && lastKey === "d") {
        player.animate = true;
        player.image = player.sprites.right
        for(let i = 0; i < boundaries.length; i++) {
            const boundary = boundaries[i];
            if (rectangularCollision({
                rectangle1: player,
                rectangle2: {...boundary, position: {
                    x: boundary.position.x - 3,
                    y: boundary.position.y
                }}
            }))
            {
                moving = false;
                break;
            }
        }
        
        if(moving)
            movables.forEach((movable) => {
                movable.position.x -= 3;
            })
    }
}



let lastKey = "";
window.addEventListener("keydown", (e) => {
    switch(e.key) {
        case "w":
            keys.w.pressed = true;
            lastKey = "w";
            break;
        case "a":
            keys.a.pressed = true;
            lastKey = "a";
            break;
        case "s":
            keys.s.pressed = true;
            lastKey = "s";
            break;
        case "d":
            keys.d.pressed = true;
            lastKey = "d";
            break;
    }
})

window.addEventListener("keyup", (e) => {
    switch(e.key) {
        case "w":
            keys.w.pressed = false;
            break;
        case "a":
            keys.a.pressed = false;
            break;
        case "s":
            keys.s.pressed = false;
            break;
        case "d":
            keys.d.pressed = false;
            break;
    }
})

let clicked = false
addEventListener("click", () => {
    if(!clicked) {
        audio.Map.play()
        clicked = true
    }
})