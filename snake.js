  ////////////////
 // Prep Stuff //
////////////////

// Canvas stuff
var c = document.getElementById('field');
var ctx = c.getContext('2d');

var pause = false;

// Gotta have
class Vector {
	constructor(x,y) {
		this.x = x;
		this.y = y;
	}
};

// Each entry is a food type (really should be FOOD_PROPERTIES but idc)
const foodProperties = [
	/*
	{
		color:'#xxx',
		eatCode() {
			doStuff();
		},
		enabled:true,
		name:'Example'
	},
	*/
	{
		color:'#0f0',
		eatCode() {},
		enabled:true,
		name:'Normal'
	},
	{
		color:'#ff0',
		eatCode() {
			gameUpdateSpeed *= .75;
		},
		enabled:true,
		name:'Speed Up'
	},
	{
		color:'#33f',
		eatCode() {
			gameUpdateSpeed *= 1.5;
		},
		enabled:true,
		name:'Slow Down'
	},
	{
		color:'#f80',
		eatCode() {
			tailLength += 3;
		},
		enabled:true,
		name:'Mega'
	},
	{
		color:'#111',
		eatCode() {
			tailLength -= 3;

			// Have to have this BS because I just KNOW someone's gonna eat a ton of poisons
			if (tailLength < 1) {
				lose()
			};
		},
		enabled:true,
		name:'Poison'
	},
	{
		color:'#f7e',
		eatCode() {
			head.pos.x = Math.floor(Math.random() * c.width);
			head.pos.y = Math.floor(Math.random() * c.height);
		},
		enabled:true,
		name:'Teleport'
	},
	{
		color:'rainbow',
		eatCode() {
			// I'm quite proud of this piece of work
			foodProperties[Math.floor(Math.random() * foodProperties.length)].eatCode()
		},
		enabled:true,
		name:'<span class="rainbow">Random Effect</span>'
	}
];

  //////////////////////////
 // User Intitialisation //
//////////////////////////

// It'd probably be smarter to make this an external HTML but I adore JS
var init = document.getElementById('init');
init.innerHTML += 'Food Amount: <input type="number" value="3" min="1" max="40" id="foodAmount"><br>'
init.innerHTML += 'Enable/Disable food types<br>';
for (var i = 0; i < foodProperties.length; i++) {
	init.innerHTML += '<input type="checkbox" id="toggle' + i + '" checked="true"><label for="toggle' + i + '" style="color:' + foodProperties[i].color + '">' + foodProperties[i].name + '</label><br>';
};
init.innerHTML += 'WARNING: Leaving all boxes unchecked will cause the game to crash!<br><br>';
init.innerHTML += '<br><button onclick="begin()">Begin</button>';


// These guys go in the "food" array
class Food extends Vector {
	constructor(x,y) {
		super(x,y);

		this.propertyID = Math.floor(Math.random() * foodProperties.length);
		while (foodProperties[this.propertyID].enabled == false) {
			this.propertyID = Math.floor(Math.random() * foodProperties.length);
		};

		this.color = foodProperties[this.propertyID].color;

		this.eatCode = foodProperties[this.propertyID].eatCode;
	}
};

// This is where I get the amount of food to vbe generated each time the player eats one
var foodAmount = document.getElementById('foodAmount').value;

  //////////////////////
 // Render Functions //
//////////////////////

class EatParticle extends Vector {
	constructor(x,y,color) {
		super(x,y)
		this.color = color;

		this.velX = (Math.random() - .5) * 1.5;
		this.velY = (Math.random() - .5) * 1.5;
	}
	render() {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x,this.y,3,3);
	}
	update() {
		this.x += this.velX;
		this.y += this.velY;
		this.velY += .4;
	}
}
var particles = [];

// Maximize the size of the field for both horizontal and vertical displays (yet it's not supported on mobile ¯\_(ツ)_/¯)
if (window.innerWidth < window.innerHeight) { // Vertical

	c.width = window.innerWidth;
	c.height = c.width;

} else { // Horizontal

	c.height = window.innerHeight;
	c.width = c.height;
	
};

// The playing field will always be 80 tiles tall and wide
var tileSize = c.height / 80;





// Chock full o' vectors representing tail segments
var tail = [];

// This is where food goes (duh)
var food = [];

//
var head = {pos:new Vector(1,1),vel:new Vector(1,0)};

// Default tail length!
var tailLength = 4;

// Is set to false when the player has made an input, so they can only input once per update
var moveCheck = true;

// The number is the minimum value to get the specific death message
var deathMessages = {
	'4':'Ok, its takes some serious skill to actually <i>die</i> that early',
	'10':'Put some more effort into it!',
	'15':'... mediocre',
	'25':'Heyyyy, not bad!',
	'40':'You are a true gamer!',
	'100':'HOW 	&#x1F633', // Haha big funy
	'2500':'I\'m pretty sure you\'re hacking'
};

function deathMessage() {
	
	let final = '';
	
	if (tailLength < 0) { // Had to add this special case -_-
		return 'Did... you only enable poison?!';
	};


	// Absolute spaghetti for loop, probably shoulda used a while loop, but it works ¯\_(ツ)_/¯
	// This gets the appropriate death message btw
	for (var i = tailLength; i > 0; i--) {
		if (deathMessages[i] != undefined) {
			final = deathMessages[i];
			return final;
		};
	};

};

// Clear canvas
function clear() {
	ctx.fillStyle = "#eee";
	ctx.fillRect(0,0,9999,9999);
};

// ... draws a tile
function drawTile(x,y,color) {
	ctx.fillStyle = color;
	ctx.fillRect(tileSize * x,tileSize * y,tileSize-1,tileSize-1);
};

// Draws a tail segment
function drawSegment(x,y) {
	drawTile(x,y,"#f00");
};

// Draws the whole tail
function drawTail() {
	for (var i = 0; i < tail.length; i++) {
		drawSegment(tail[i].x,tail[i].y)
	};
};

// Draws one food
function drawOneFood(x,y,color) {
	drawTile(x,y,color);
};

// Draws the grid
function grid() {
	ctx.strokeStyle = '#d7d7d7';
	for (var i = 0; i < (c.width / tileSize); i++) {
		ctx.beginPath();
		ctx.moveTo(i * tileSize,0);
		ctx.lineTo(i * tileSize,c.height);
		ctx.stroke();
	};
	for (var i = 0; i < (c.height / tileSize); i++) {
		ctx.beginPath();
		ctx.moveTo(0,i * tileSize);
		ctx.lineTo(c.width,i * tileSize);
		ctx.stroke();
	};
};

// ALL THE FOOD
function drawAllFood() {
	for (var i = 0; i < food.length; i++) {
		if (food[i].color == 'rainbow') {
			drawOneFood(food[i].x,food[i].y,'hsl(' + Math.random() * 360 + ', 100%, 50%)')
		} else {
			drawOneFood(food[i].x,food[i].y,food[i].color);
		};
	};
};

  ////////////////////////
 // Gameplay Functions //
////////////////////////

function makeNewFood() {

	food = [];

	for (var i = 0; i < foodAmount; i++) {

		let randX = Math.floor(Math.random() * c.height / tileSize);
		let randY = Math.floor(Math.random() * c.width / tileSize);

		// I tried to make it so food couldn't show up on the tail, but it didn't work. If you can help, please do!
		while (tail.includes({x:randX,y:randY})) {
			randX = Math.floor(Math.random() * c.height / tileSize);
			randY = Math.floor(Math.random() * c.width / tileSize);
		};

		// Make a new food
		food.push(new Food(randX,randY));
	};
};

// Kinda misleading. This actually changes the snake's direction (please only use 0, 1, or -1)
function move(x,y) {
	pause = false;
	if (x != -head.vel.x && y != -head.vel.y && moveCheck) {
		head.vel.x = x;
		head.vel.y = y;
		moveCheck = false;
	};
};


function lose() {

	// Makes the play field the death message!
	c.outerHTML = '<div id="dead"></div>'

	// Score & death message
	document.getElementById('dead').innerHTML += "Final length: " + tailLength + '<br>Note: ' + deathMessage() + '<br><br><br>';
	
	// Show which food types were enabled and which were disabled
	for (var i = 0; i < foodProperties.length; i++) {
		document.getElementById('dead').innerHTML += '<span style="color:' + foodProperties[i].color + '">' + foodProperties[i].name + '</span>: ';
		if (foodProperties[i].enabled) {
			document.getElementById('dead').innerHTML += 'Enabled<br>';
		} else {
			document.getElementById('dead').innerHTML += 'Disabled<br>';
		};
		document.getElementById('dead').innerHTML += '<br>'
	};
};

// Update all particles using built in function of the Particle class
function doParticles() {
	for (var i = 0; i < particles.length; i++) { // Run thru particles

		// Render & update!
		particles[i].render();
		particles[i].update();
		
		// Kill at bottom of screen
		if (particles[i].y > c.height) {
			particles.splice(i,1);
		};

	};
};


document.addEventListener("keydown",(event) => {
	switch (event.key) {
		case 'ArrowUp':
		case 'w':
			move(0,-1);
		break;
		case 'ArrowDown':
		case 's':
			move(0,1);
		break;
		case 'ArrowLeft':
		case 'a':
			move(-1,0);
		break;
		case 'ArrowRight':
		case 'd':
			move(1,0);
		break;
		case 'Escape':
			if (pause) {
				pause = false;
			} else {
				pause = true;
			};
		break;

		case 'p':
			alert('Debug/Nerd Fun: Activated Wii Balance Board Mode!');
			const BBCID = Number.parseInt(prompt('Use which controller?'));
			setInterval(() => {
			    if (navigator.getGamepads()[BBCID].axes[0] > .25) {
			        move(1,0)
			    };
			    if (navigator.getGamepads()[BBCID].axes[0] < -.25) {
			        move(-1,0)
			    };
			    if (navigator.getGamepads()[BBCID].axes[1] > .25) {
			        move(0,1)
			    };
			    if (navigator.getGamepads()[BBCID].axes[1] < -.25) {
			        move(0,-1)
			    };
			},10)
		break;
	};
});

// Rendery stuff, mostly self-explanatory
var renderUpdates = setInterval(() => {
	clear();
	drawAllFood();
	drawTail();
	doParticles();

	grid();
},10);

// This is changed to modify snake speed
var gameUpdateSpeed = 50;

var gameTimer = 0;

// Actual game
function begin() {
	foodAmount = document.getElementById('foodAmount').value

	// Set food types as enabled or disabled
	for (var i = 0; i < foodProperties.length; i++) {
		foodProperties[i].enabled = document.getElementById('toggle' + i).checked;
	};

	// Show game
	document.getElementById('init').style.display = 'none';
	document.getElementById('field').style.display = 'block';

	// Kickstart food	
	makeNewFood();

	// So it begins...
	var gameUpdates = setInterval(() => {
		gameTimer += 10;
		if (gameTimer >= gameUpdateSpeed && pause == false) { // When gameTimer reaches 0, run the game update
			gameTimer = 0;

			// Move head
			head.pos.x += head.vel.x;
			head.pos.y += head.vel.y;
			moveCheck = true;

			// Screen wrap
			head.pos.x = (head.pos.x + c.width / tileSize) % (c.width / tileSize);
			head.pos.y = (head.pos.y + c.height / tileSize) % (c.height / tileSize);


			// Delete oldest segment
			while (tailLength < tail.length) {
				tail.shift();
			};
			
			// Check if head intersects with tail
			for (var i = 0; i < tail.length; i++) {
				if (head.pos.x == tail[i].x && head.pos.y == tail[i].y) {
					clearInterval(gameUpdates);
					lose();
					break;
				};
			};

			// Check for food at head
			for (var i = 0; i < food.length; i++) {

				if (head.pos.x == food[i].x && head.pos.y == food[i].y) {
					// Run special food effects
					food[i].eatCode();
					
					// MUNCH
					for (var j = 0; j < 8; j++) {
						particles.push(new EatParticle(food[i].x * tileSize,food[i].y * tileSize,food[i].color))
					};

					// Kill the food
					food.splice(i,1);
					food = [];

					// Extend the snake
					tailLength++;

					// Make the new foods
					makeNewFood();
				};

			};

			// Make new segment at head
			tail.push({x:head.pos.x,y:head.pos.y});
		};

	},10);
};






//////////////////////
// Virgin Rectangle //
//////////////////////

  ////////////////////////
 // Chad Parallelogram //
////////////////////////