var playGame = function() {

  // Need multiple files!
  // Something like: var functionFile = require('functions.js') (?)

  // State variable - all game state is on this object!
  // Allows persistent properties between browser animation frames,
  // pausing, etc
  var state = {}

  // Shortcuts to common constants here
  var degreesToRadians = Math.PI / 180
  var radiansToDegrees = 1 / degreesToRadians

  var updateMassGameCoords = function(mass) {
    // Get state variables
    var grav = state.gravity        // Pixels per second per second
    var dT = state.control.timing.msBetweenLoops / 1000    // in seconds
    // Get mass variables
    var x = mass.x
    var y = mass.y
    var u = mass.u
    var v = mass.v
    var angVeloc = mass.angVeloc
    var massAngle = mass.angle
    // Update mass variables
    x += dT * u
    y += dT * v
    massAngle = ( massAngle + dT * angVeloc) % 360
    if (mass.affectedByGravity) {
      v += dT * grav * mass.gravityMultiple   // Multiple is usually 1!
    }
    // Save mass variables if change is possible
    if (mass.moves) {
      mass.x = x
      mass.u = u
      mass.y = y
      mass.v = v
      mass.angle = massAngle
      mass.angVeloc = angVeloc
    }
    // Deal with the game coordinates of the rotated parts
    var angle = 0
    var radius = 0
    var angleRadians = 0
    for (var i in mass.angleRadii) {
      angle = mass.angleRadii[i][0] + massAngle
      radius = mass.angleRadii[i][1]
      angleRadians = angle * degreesToRadians
      mass.gameCoords[i][0] = x + radius * Math.sin(angleRadians)
      mass.gameCoords[i][1] = y + radius * Math.cos(angleRadians)
    }
    mass.gameCoordsValid = true
  }

  var updateMassesGameCoords = function() {
    for (var mass of state.masses) {
      if (!mass.gameCoordsValid || mass.moves) {
        updateMassGameCoords(mass)
      }
    }
  }

  var mapCoordsGameToCanvas = function(gameCoordArray, canvasCoordArray, extraZoom, wrapIndep) {
    // Use gameCoordArray and current game state
    // to recalculate and overwrite the viewCoords
    // Want the two arrays to be the same size
    // which is an array of size N, of arrays of size 2

    // Use wrapIndep only if different coordinates should be wrapped independently,
    // e.g. for the stars background.

    var viewMidX = state.output.view.pos.x
    var viewMidY = state.output.view.pos.y
    var viewZoom = state.output.view.zoom
    var overallZoom = viewZoom * extraZoom

    var canvasMidX = state.output.canvasDims.centre.x
    var canvasMidY = state.output.canvasDims.centre.y

    // Wrapping coordinates
    // Need the world to have width and height
    // at least 2 (maybe 3) times as big as the screen
    // Then the canvas is wrapped around successfully
    var actualWrapX = state.world.wrapCoords.x * overallZoom
    var actualWrapY = state.world.wrapCoords.y * overallZoom
    var canvasWrapX = null
    var canvasWrapY = null

    var gameCoord = [0, 0]
    var gameX = 0
    var gameY = 0
    var canvasX = 0
    var canvasY = 0
    var canvasCoord = [0, 0]
    for (var i=0; i < gameCoordArray.length; i++) {
      gameCoord = gameCoordArray[i]
      gameX = gameCoord[0]
      gameY = gameCoord[1]
      canvasX = canvasMidX + overallZoom*(gameX-viewMidX)    // Game coords start in bottom left, but
      canvasY = canvasMidY - overallZoom*(gameY-viewMidY)    // Canvas coords start in top left

      if (i===0 || wrapIndep===true) {
        canvasWrapX = Math.round((canvasX-canvasMidX)/actualWrapX)
        canvasWrapY = Math.round((canvasY-canvasMidY)/actualWrapY)
      }

      canvasCoord = [canvasX - actualWrapX * canvasWrapX, canvasY - actualWrapY * canvasWrapY]
      // canvasCoord = [canvasX, canvasY]   // This is the unwrapped version!
      canvasCoordArray[i] = canvasCoord
    }
  }

  var updateMassesCanvasCoords = function() {
    var backZoomOut = 0
    var backZoom = 0
    for (var mass of state.masses) {
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasMainCoords, 1)
      backZoomOut = mass.graphics.back.zoomOut
      backZoomOut > 1 ? backZoom = 1/backZoomOut : backZoom = 0.9  // Sensible default
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasBackCoords, backZoom)
    }
  }

  var doTiming = function(tFrame) {
    var prevLoopStart = state.control.timing.thisLoopStart
    var thisLoopStart = tFrame
    if (state.control.comingOffPause) {
      // Reset the prevLoopStart since its going to be a long time ago!
      prevLoopStart = thisLoopStart - 16        // Deduct a single frame
      state.control.comingOffPause = false
    }
    var msBetweenLoops = thisLoopStart-prevLoopStart
    state.control.timing.prevLoopStart = prevLoopStart
    state.control.timing.thisLoopStart = thisLoopStart
    state.control.timing.msBetweenLoops = msBetweenLoops
  }

  var updateViewCoords = function() {
    var prevX = state.output.view.pos.x    // Pixels
    var prevY = state.output.view.pos.y    // Pixels
    var followX = state.player.ship.x
    var followY = state.player.ship.y
    var dX = followX-prevX
    var dY = followY-prevY
    var d2 = state.player.ship.u**2 + state.player.ship.v**2
    // Sometimes view can stay behind the player ship so far
    // it is off the screen! Fix this.
    state.output.view.pos.x = prevX + dX / 5
    state.output.view.pos.y = prevY + dY / 5
    // When the player ship stops momentarily, the screen zooms in and out
    // very fast. Fix this.
    state.output.view.zoom = 1  //0.92+0.08/(1+0.0001*d2)
  }

  var drawLineSet = function(coordsArray){
    var context = state.output.context
    context.beginPath()
    var posX = coordsArray[0][0]
    var posY = coordsArray[0][1]
    context.moveTo(posX, posY)
    for (var i=1; i<coordsArray.length; i++){
      posX = coordsArray[i][0]
      posY = coordsArray[i][1]
      // Do the bounding of the coords in the earlier calc function?
      // posX<boundLeft ? posX=boundLeft : null
      // posX>boundRight ? posX=boundRight : null
      // posY<boundUp ? posY=boundUp : null
      // posY>boundDown ? posY=boundDown : null
      context.lineTo(posX, posY)
    }
    context.stroke()
    context.fill()
    // context.closePath()
  }

  var drawMassesOntoCanvas = function() {
    var mass = null
    var context = state.output.context
    for (var i in state.masses) {
      mass = state.masses[i]
      context.strokeStyle = mass.graphics.back.strokeStyle
      context.lineWidth = mass.graphics.back.lineWidth
      context.fillStyle = mass.graphics.back.fillStyle
      drawLineSet(mass.canvasBackCoords)
    }
    for (var i in state.masses) {
      mass = state.masses[i]
      context.strokeStyle = mass.graphics.main.strokeStyle
      context.lineWidth = mass.graphics.main.lineWidth
      context.fillStyle = mass.graphics.main.fillStyle
      drawLineSet(mass.canvasMainCoords)
    }
  }

  var drawStars = function() {
    var context = state.output.context
    mapCoordsGameToCanvas(state.stars.gameCoords, state.stars.canvasCoords, 1/state.stars.zoomOut, true)
    // the 'true' on the end does the canvas wrapping independently for each star
    // unlike most objects in the game (e.g. solid masses) which wrap together.
    var starX = 0   // These to be overwritten
    var starY = 0
    var starCol = "#FFF"
    var starSize = 2
    for (var i in state.stars.canvasCoords) {
      starX = state.stars.canvasCoords[i][0]
      starY = state.stars.canvasCoords[i][1]
      starCol = state.stars.colours[i]
      starSize = state.stars.sizes[i]
      context.fillStyle = starCol
      context.fillRect(starX, starY, starSize, starSize)
    }
  }

  var drawCanvas = function(){
    // Set up drawing
    var canvasLeft = state.output.canvasDims.bounds.left
    var canvasRight = state.output.canvasDims.bounds.right
    var canvasUp = state.output.canvasDims.bounds.up
    var canvasDown = state.output.canvasDims.bounds.down
    var context = state.output.context
    // Do drawing
    // context.fillStyle="black";
    // context.fillRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    context.clearRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    drawStars()
    drawMassesOntoCanvas()
  }

  var updateDisplay = function(){
    if (state.control.loopCount % 7 === 0) {
      state.output.pageElts.fuel.innerText = Math.round(state.player.fuel)
      state.output.pageElts.ammo.innerText = Math.round(state.player.ammo)
      state.output.pageElts.x.innerText = Math.round(state.player.ship.x)
      state.output.pageElts.y.innerText = Math.round(state.player.ship.y)
      state.output.pageElts.u.innerText = Math.round(state.player.ship.u)
      state.output.pageElts.v.innerText = Math.round(state.player.ship.v)
      state.output.pageElts.anglePos.innerText = Math.round(state.player.ship.angle)
      state.output.pageElts.angleVel.innerText = Math.round(state.player.ship.angVeloc)
      state.output.pageElts.renderTimeElt.innerText = Math.round(state.control.timing.msRenderTime )
    }
  }

  var fireBullet = function() {
    var bulletMaxRadius = 7
    var bulletDeformity = Math.round((bulletMaxRadius-1)*Math.random())
    var bulletRelativeSpeed = 300
    var bulletVelocRecoil = 20
    var bulletSpinRecoil = 0.5
    var bulletSides = 3 + Math.round(30 * Math.random()**10)   // Bias towards fewer edges
    var spin = 400 * (-0.5 + Math.random())
    var bulletX = state.player.ship.x + 50 * Math.sin(degreesToRadians * state.player.ship.angle)
    var bulletY = state.player.ship.y + 50 * Math.cos(degreesToRadians * state.player.ship.angle)
    var bullet = addNewMass(bulletX, bulletY, bulletSides, bulletMaxRadius, bulletMaxRadius-bulletDeformity, 3)
    bullet.massType = "bullet"
    bullet.moves = true
    bullet.affectedByGravity = true
    bullet.gravityMultiple = 0.1
    bullet.isWall = false
    bullet.u = state.player.ship.u + bulletRelativeSpeed * Math.sin(degreesToRadians * state.player.ship.angle)
    bullet.v = state.player.ship.v + bulletRelativeSpeed * Math.cos(degreesToRadians * state.player.ship.angle)
    bullet.angVeloc = spin
    bullet.graphics.main = {}
    bullet.graphics.main.fillStyle = "#0F0"
    bullet.graphics.main.strokeStyle = "#FFF"
    bullet.graphics.main.lineWidth = 3
    bullet.graphics.back = {}
    bullet.graphics.back.zoomOut = 1.03 + 0.05 * Math.random()
    bullet.graphics.back.fillStyle = "#F0F"
    bullet.graphics.back.strokeStyle = "#888"
    bullet.graphics.back.lineWidth = 3
    if (Math.random()<0.015) {
      bullet.graphics.back.fillStyle = "#F00"
      bullet.graphics.back.strokeStyle = "#FFF"
    }
    if (Math.random()<0.004) {
      bullet.graphics.main.fillStyle = "#FF0"
      bullet.graphics.main.strokeStyle = "#00F"
    }
    state.player.ship.u -= bulletVelocRecoil * Math.sin(degreesToRadians*state.player.ship.angle)
    state.player.ship.v -= bulletVelocRecoil * Math.cos(degreesToRadians*state.player.ship.angle)
    state.player.ship.angVeloc -= bulletSpinRecoil * spin
    state.player.ammo--
  }

  var checkIfTrulyCollided = function(i, j) {
    // Maximum radii coincide
    // Might or might not be a collision
    // For now - assume there is!
    // More work needed here!
    return true
  }

  var measureModularOffset = function(coord1, coord2, wrapDistance) {
    var result = coord2 - coord1
    // If there was no wrapping, leave it here!
    // However, there is wrapping.
    // Want to measure distance between -wrapDistance/2 to +wrapDistance/2
    var halfWrapDistance = wrapDistance/2
    result += halfWrapDistance
    result = distance % wrapDistance
    result -= halfWrapDistance
    return result
  }

  var measureDistance = function(x1, y1, x2, y2) {
    var wrapX = state.world.wrapCoords.x
    var wrapY = state.world.wrapCoords.y
    var offsetX = measureModularOffset(x1, x2, wrapX)
    var offsetY = measureModularOffset(y1, y2, wrapY)
    // Offsets are from -wrap/2 to +wrap/2 in each direction
    return Math.sqrt(offsetX**2 + offsetY**2)
  }

  var measureAngleDegrees = function(x1, y1, x2, y2, wrapX, wrapY) {
    // See where mass game-coords are calculated
    // In degrees:
    // Up=0, up-right=45, right=90, right-down=135, down=180
    // Down+1 = -179, down-left=-135, left=-90, left-up = -45, up=0
    var xD = measureModularOffset(x1, x2, state.wrapX)
    var yD = measureModularOffset(y1, y2, state.wrapY)
    // Deal with case x offset = 0
    if (xD === 0) {
      // Will prevent division by zero below
      if (yD < 0) {
        return 180
      } else {
        return 0
      }
    }
    // Deal with case x offset < 1
    var resultSign = 1
    if (xD < 0) {
      resultSign = -1
      xD = -xD
    }
    // Final case: x offset > 1
    var angle = radiansToDegrees * Math.atan(yD/xD)
    // angle = 0 for 'right'
    // angle -> 90 for 'up'
    // angle -> -90 for 'down'
    return 90 - angle
  }

  var markAsCollided = function(i, j) {
    // var xi = state.masses[i].x
    // var yi = state.masses[i].y
    // var xj = state.masses[j].x
    // var yj = state.masses[j].y
    // var wrapX = state.wrapX
    // var wrapY = state.wrapY
    // var diffX = xj-xi
    // var diffY = yj-yi
    // var sign_xi = Math.
    // var angle =
    // Mark i as having collided with j
    state.masses[i].collisionWith.index = j
    state.masses[i].collisionWith.mass = state.masses[j].mass
    state.masses[i].collisionWith.u = state.masses[j].u
    state.masses[i].collisionWith.v = state.masses[j].v
    state.masses[i].collisionWith.angVeloc = state.masses[j].angVeloc
    // Mark j as having collided with i
    state.masses[j].collisionWith.index = i
    state.masses[j].collisionWith.mass = state.masses[i].mass
    state.masses[j].collisionWith.u = state.masses[i].u
    state.masses[j].collisionWith.v = state.masses[i].v
    state.masses[j].collisionWith.angVeloc = state.masses[i].angVeloc
  }

  var findCollisionsBetweenMasses = function() {
    var xi = 0
    var xj = 0
    var yi = 0
    var yj = 0
    var ri = 0
    var rj = 0
    var wrapX = state.world.wrapCoords.x
    var wrapY = state.world.wrapCoords.y
    var countMasses = state.masses.length
    for (var i=0; i<countMasses; i++) {
      if (state.masses[i].collisionWith.index === null) {
        xi = state.masses[i].x
        yi = state.masses[i].y
        ri = state.masses[i].maxRadius
        for (var j=i+1; j<countMasses; j++) {
          if (state.masses[j].collisionWith.index === null) {
            // Ignore wall-wall collisions at the moment
            if (!(state.masses[i].isWall && state.masses[j].isWall)) {
              xj = state.masses[j].x
              yj = state.masses[j].y
              rj = state.masses[j].maxRadius
              xDiff = Math.abs(xj-xi) % wrapX
              yDiff = Math.abs(yj-yi) % wrapY
              if (xDiff**2 + yDiff**2 < (ri+rj)**2) {
                if (checkIfTrulyCollided(i, j)) {
                  markAsCollided(i, j)
                  break
                }
              }
            }
          }
        }
      }
    }
  }

  var dealWithCollision = function(mass) {
    // Angular velocity currently not changed
    // Here are the relevant variables for elastic collisions
    var m1 = mass.mass
    var u1 = mass.u
    var v1 = mass.v
    var m2 = mass.collisionWith.mass
    var u2 = mass.collisionWith.u
    var v2 = mass.collisionWith.v
    var massSum = m1 + m2
    // Change the variables as appropriate
    mass.u = (u1 * (m1-m2) + 2*m2*u2 ) / (m1+m2)
    mass.v = (v1 * (m1-m2) + 2*m2*v2 ) / (m1+m2)

    // If its a bullet, mark it for removal
    if (mass.massType === "bullet") {
      // mass.toBeRemoved = true
    }
    // NOT DONE - instead want some kind of damage function which

    // Dealt with collision now. Mark it as not collided
    mass.collisionWith.index = null
    // Could also reset the other variables here,
    // but that's less important.
  }

  var dealWithCollisions = function() {
    for (var mass of state.masses) {
      if (mass.collisionWith.index !== null) {
        dealWithCollision(mass)
      }
    }
  }

  var respondReliablyToKeyUps = function(eventKeyboardCode) {
    // This runs in background, even if the main loop isn't running!
    if ( eventKeyboardCode === "KeyQ" ) {
      // Do P things on Q
      eventKeyboardCode = "KeyP"  // Extra pause button
    }
    if ( state.control.paused && eventKeyboardCode === "KeyP" ) {
      // Do pause handling on keyups, not keydowns!
      if (state.control.waitingForPauseKeyup) {
        state.control.waitingForPauseKeyup = false
      } else {
        // Restart main loop!
        state.control.paused = false
        state.control.comingOffPause = true
        window.requestAnimationFrame(mainLoop)
      }
    }
  }

  var respondReliablyToKeyDowns = function(eventKeyboardCode) {
    // This runs, even if the main loop isn't running!
    // Currently nothing extra to do, on top of what's already control off main loop
  }

  var respondToKeyboardDuringMainLoop = function() {
    // This only runs when main loop is active
    if (state.player.fuel > 0) {
      // Turn left
      if (state.input.keyboard.ArrowLeft) {
        state.player.ship.angVeloc -= 15
        state.player.fuel -= 0.001
      }
      // Turn right
      if (state.input.keyboard.ArrowRight) {
        state.player.ship.angVeloc += 15
        state.player.fuel -= 0.001
      }
      // Rotate freely
      if (!state.input.keyboard.ArrowLeft && !state.input.keyboard.ArrowRight) {
        state.player.ship.angVeloc *= 0.92
        // If deducting fuel, make it proportional to abs of angVeloc
      }
      // Stop rotating
      if (state.input.keyboard.ArrowUp) {
        state.player.ship.u += 10 * Math.sin(degreesToRadians*state.player.ship.angle)
        state.player.ship.v += 10 * Math.cos(degreesToRadians*state.player.ship.angle)
        state.player.fuel -= 0.005
      }
    }
    if (state.player.ammo > 0) {
      // Fire bullet
      if (state.input.keyboard.Space) {
        fireBullet()
        state.input.keyboard.Space = false
        // One bullet per SPACE press
        // Deal with auto-repeat keydowns in future
      }
    }
    // Pause game
    if (!state.control.paused && (state.input.keyboard.KeyP || state.input.keyboard.KeyQ)) {
      state.control.paused = true
      state.control.waitingForPauseKeyup = true
    }
  }

  var recalculatePhysicsStats = function(mass) {
    var density = mass.density
    var angleRadii = mass.angleRadii
    var calcMass = 0
    var a1 = 0
    var a2 = 0
    var r1 = 0
    var r2 = 0
    var area = 0
    var segments = angleRadii.length - 1
    var maxRadius = angleRadii[0][1]
    for (var i=0; i<segments; i++) {
      a1 = angleRadii[i][0]
      r1 = angleRadii[i][1]
      a2 = angleRadii[i+1][0]
      r2 = angleRadii[i+1][1]
      area = 0.5 * r1 * r2 * Math.sin ( degreesToRadians * (a2-a1) )  // Sine area rule
      calcMass += density * area
      maxRadius = Math.max(maxRadius, r2)
    }
    mass.mass = calcMass  // :)
    mass.maxRadius = maxRadius;
    mass.physicsStatsInvalid = false
  }

  var recalculateAllPhysicsStats = function() {
    for (var mass in state.masses) {
      if (mass.physicsStatsInvalid) {
        recalculatePhysicsStats(mass)
      }
    }
  }

  var removeMass = function(mass) {
    // Implement this here

  }

  var removeDeadMasses = function() {
    var countMasses = state.masses.length
    var counter = 0
    while (counter < countMasses) {
      if (state.masses[counter].toBeRemoved) {
        state.masses.splice(counter, 1)
        countMasses--
        counter--
      }
      counter++
    }
  }

  var addNewMass = function(x, y, points, maxRadius, minRadius, density) {
    // There is randomisation between minRadius and maxRadius
    // Set these as equal for a deterministic mass (e.g. the ship, or a round bullet)
    // points are currently evenly spread around 360 degrees.
    var newMass = {}
    newMass.massType = "wall"
    newMass.isWall = true       // Use this to ignore wall-wall collisions
    newMass.density = density   // Used to calculate mass
    newMass.mass = 1            // Recalculated later
    newMass.toBeRemoved = false   // Use this to mark masses for removal before next loop
    newMass.x = x
    newMass.y = y
    newMass.graphics = {}
    // Foreground / Main rendered at zoom = zoomOut = 1
    // Background rendered at higher zoomOut > 1  (zoomOut = 1/zoom)
    newMass.graphics.main = {}
    newMass.graphics.back = {}
    newMass.graphics.back.zoomOut = 1.1
    newMass.graphics.main.fillStyle = "#999"
    newMass.graphics.main.strokeStyle = "#AC9"
    newMass.graphics.main.lineWidth = 3
    newMass.graphics.back.fillStyle = "#444"
    newMass.graphics.back.strokeStyle = "#669"
    newMass.graphics.back.lineWidth = 2
    // Note: state.masses will be rendered in the order they are stored!
    // However, it will only look correct if the objects with
    // higher zoomOuts are rendered first
    // so there ought to be checking of order and sorting
    // perhaps every 0.25 seconds (10 frames/loops or so)
    newMass.angle = 0
    newMass.maxRadius = maxRadius        // Recalculated later
    newMass.moves = false
    newMass.u = 0    // Anything which doesn't move should have u, v, angVeloc = 0
    newMass.v = 0
    newMass.angVeloc = 0
    newMass.affectedByGravity = false  // Things should only be affected by gravity if they move!
    newMass.gravityMultiple = 1        // A gravity multiplier. Can make things less or more affected!
    newMass.angleRadii = []
    // Give some space for dealing with collisions
    newMass.collisionWith = {}
    newMass.collisionWith.index = null
    newMass.collisionWith.mass = 1
    newMass.collisionWith.angle = 0
    newMass.collisionWith.u = 0
    newMass.collisionWith.v = 0
    newMass.collisionWith.angVeloc = 0
    // First element
    var nextAngle = 0
    var nextRadius = minRadius + (maxRadius-minRadius) * Math.random()
    var nextElt = [nextAngle, nextRadius]
    newMass.angleRadii.push(nextElt)
    for (var i=1; i<points; i++) {
      // Middle elements
      nextAngle = 360 * i / points
      nextRadius = minRadius + (maxRadius-minRadius) * Math.random()
      nextElt = [nextAngle, nextRadius]
      newMass.angleRadii.push(nextElt)
    }
    // Last element
    nextAngle = 360
    nextRadius = newMass.angleRadii[0][1]
    nextElt = [nextAngle, nextRadius]
    newMass.angleRadii.push(nextElt)
    // (Re)calculate the important physics stats, such as maximum radius and mass
    newMass.physicsStatsInvalid = true
    recalculatePhysicsStats(newMass)
    // Admin fields for the mass
    !newMass.maxRadius ? newMass.maxRadius = 0 : null;
    !newMass.gameCoordsValid ? newMass.gameCoordsValid = false : null
    newMass.gameCoords = newMass.angleRadii.slice()   // Shallow copy! Need deep copy!
    newMass.canvasMainCoords = newMass.angleRadii.slice()
    newMass.canvasBackCoords = newMass.angleRadii.slice()
    for (var i in newMass.gameCoords) {
      newMass.gameCoords[i] = newMass.gameCoords[i].slice()  // Deep copy done here
      newMass.canvasMainCoords[i] = newMass.canvasMainCoords[i].slice()
      newMass.canvasBackCoords[i] = newMass.canvasBackCoords[i].slice()
    }
    // Add to game masses
    state.masses.push(newMass)
    return newMass
  }

  var setupState = function() {

    // Setup main state categories here
    state.world = {}
    state.player = {}
    state.control = {}
    state.input = {}
    state.output = {}
    state.output.pageElts = {}

    state.control.paused = false
    state.control.waitingForPauseKeyup = false
    state.control.comingOffPause = false
    state.control.loopCount = 0
    // state.control.continueLooping = true  // No longer used - previously on q key

    state.world.wrapCoords = {}
    state.world.wrapCoords.x = 5000
    state.world.wrapCoords.y = 3000
    // Currently (2017_10_22) the screen is fixed at 1200x675 px (16:9 aspect ratio)
    // Each of the dimensions for wrapCoords here needs to be significantly bigger
    // than the screen dimension
    // Also, the stars will be very near unless these dimensions are big enough!

    // Setup variables for game
    state.control.timing = {}
    state.control.timing.prevLoopStart = window.performance.now()    // dummy data
    state.control.timing.thisLoopStart = window.performance.now()
    state.control.timing.msBetweenLoops = 10
    state.control.timing.msRenderTime = 10

    // Setup canvas, context and view
    var canvasElt = document.querySelector("#main-canvas")
    var context = canvasElt.getContext('2d')
    var boundLeft = 0
    var boundRight = canvasElt.width
    var boundUp = 0
    var boundDown = canvasElt.height

    state.output.canvasDims = {}
    state.output.canvasDims.bounds = {}
    state.output.canvasDims.bounds.left = boundLeft
    state.output.canvasDims.bounds.right = boundRight
    state.output.canvasDims.bounds.up = boundUp
    state.output.canvasDims.bounds.down = boundDown
    state.output.canvasDims.centre = {}
    state.output.canvasDims.centre.x = (boundLeft+boundRight)/2
    state.output.canvasDims.centre.y = (boundUp+boundDown)/2
    state.output.canvasDims.size = {}
    state.output.canvasDims.size.x = boundRight-boundLeft
    state.output.canvasDims.size.y = boundDown-boundUp

    // state.output.canvasDims.elt

    // var canvasBounds = {left: boundLeft, right: boundRight, up: boundUp, down: boundDown}
    // var canvasCentre = {x: (boundLeft+boundRight)/2, y: (boundUp+boundDown)/2}
    // var canvasSize = {x: boundRight-boundLeft, y: boundDown-boundUp}
    // var canvas = {elt: canvasElt, bounds: canvasBounds, centre: canvasCentre, size: canvasSize}
    // state.output.canvasDims = canvas

    // var context = canvasElt.getContext('2d')
    // state.output.context = context

    state.output.view = {}
    state.output.view.zoom = 1
    state.output.view.pos = {}
    state.output.view.pos.x = state.output.canvasDims.centre.x
    state.output.view.pos.y = state.output.canvasDims.centre.y

    // x, y are positions in pixels
    // u, v are velocities in pixels per second

    // Start the game masses array.
    // This contains: the player ship, walls, bullets, enemies, etc.
    state.masses = []

    // Make some walls using the random mass
    var xMin = -100
    var xMax = 900
    var yMin = -100
    var yMax = 700
    var step = 125
    var points = 19     // Overridden randomly below
    var maxRadius = 150
    var minRadius = 40
    var density = 10
    // Make the set of points first
    // Then generate the wall elements in a random order
    var wallCoordSet = []
    for (var x=xMin; x<=xMax; x+=step) {
      wallCoordSet.push([x, yMin, Math.random()])
      wallCoordSet.push([x, yMax, Math.random()])
    }
    for (var y=yMin+step; y<=yMax-step; y+=step) {
      wallCoordSet.push([xMin, y, Math.random()])
      wallCoordSet.push([xMax, y, Math.random()])
    }
    wallCoordSet.sort(function(elt2, elt1){
      return elt2[2] - elt1[2]
    })
    var theMass = null
    for (var i in wallCoordSet) {
      points = 3 + Math.round(21*Math.random())
      maxRadius = 50 + Math.round(150*Math.random())
      minRadius = 10 + Math.round(0.9*maxRadius*Math.random())
      theMass = addNewMass(wallCoordSet[i][0], wallCoordSet[i][1], points, maxRadius, minRadius, density)
      theMass.graphics.back.zoomOut = 1.05 + 0.5*(1-wallCoordSet[i][2]**0.5)
      theMass.moves = true
    }

    var j=0
    var jMax = state.masses.length - 1

    // Make some of the game masses rotate!
    for (var i=0; i<7; i++) {
      j = Math.round(jMax * Math.random())
      state.masses[j].moves = true
      state.masses[j].angVeloc = -30 + 60 * Math.random()  // deg/s
    }

    // Make some of the game masses dark brown!
    for (var i=0; i<9; i++) {
      j = Math.round(jMax * Math.random())
      state.masses[i].graphics.main.fillStyle = "#997755"
      state.masses[i].graphics.main.strokeStyle = "#AA6655"
      state.masses[i].graphics.back.fillStyle = "#664422"
      state.masses[i].graphics.back.strokeStyle = "#999922"
    }

    // Make some of the game masses gold!
    for (var i=0; i<3; i++) {
      j = Math.round(jMax * Math.random())
      state.masses[i].graphics.main.fillStyle = "#998811"
      state.masses[i].graphics.main.strokeStyle = "#AAAAEE"
      state.masses[i].graphics.back.fillStyle = "#665511"
      state.masses[i].graphics.back.strokeStyle = "#779977"
    }

    // Make the game player
    var playerShip = addNewMass(state.output.canvasDims.centre.x, state.output.canvasDims.centre.y, 5, 41, 41, 0.3, 3)
    playerShip.massType = "ship"
    playerShip.angleRadii[1][1]=13
    playerShip.angleRadii[2][1]=23
    playerShip.angleRadii[3][1]=23
    playerShip.angleRadii[4][1]=13
    playerShip.moves = true
    playerShip.affectedByGravity = true
    playerShip.u = 40
    playerShip.v = 80
    playerShip.isWall = false
    playerShip.angVeloc = 15      // Degrees per second!
    playerShip.graphics.main = {}
    playerShip.graphics.back = {}
    playerShip.graphics.main.fillStyle = "#44F"
    playerShip.graphics.main.strokeStyle = "#ACF"
    playerShip.graphics.main.lineWidth = 2
    playerShip.graphics.back.fillStyle = "#035"
    playerShip.graphics.back.strokeStyle = "#555"
    playerShip.graphics.back.lineWidth = 2

    // Player ship related variables
    state.player.ship = playerShip
    state.player.fuel = 100
    state.player.ammo = 23
    // Note - these place the fuel and ammo on masses
    // Might want to change this to just

    // Monitor key presses
    state.input.keyboard = {}
    state.input.keyboard.ArrowLeft = false
    state.input.keyboard.ArrowRight = false
    state.input.keyboard.ArrowUp = false
    state.input.keyboard.Space = false
    state.input.keyboard.KeyP = false
    state.input.keyboard.KeyQ = false    // Currently used as an extra pause button

    // Setup output links to HTML webpage
    state.output.context = context
    // state.output.pageElts = {}    // Done earlier
    state.output.pageElts.canvas = canvasElt
    state.output.pageElts.fuel = document.querySelector("#fuel-left")
    state.output.pageElts.ammo = document.querySelector("#ammo-left")
    state.output.pageElts.x = document.querySelector("#pos-x")
    state.output.pageElts.y = document.querySelector("#pos-y")
    state.output.pageElts.u = document.querySelector("#vel-u")
    state.output.pageElts.v = document.querySelector("#vel-v")
    state.output.pageElts.anglePos = document.querySelector("#ang-pos")
    state.output.pageElts.angleVel = document.querySelector("#ang-vel")
    state.output.pageElts.renderTimeElt = document.querySelector("#render-time")

    // state.health = 100  // Future iterations!
    // state.money = 0
    state.gravity = -120    // (Pixels per second per second!)

    state.stars = []
    state.stars.gameCoords = []
    state.stars.canvasCoords = []
    state.stars.colours = []
    state.stars.sizes = []
    var minSize = 1
    var maxSize = 4
    state.stars.zoomOut = 0.75 * Math.min(
      state.world.wrapCoords.x / state.output.canvasDims.size.x,
      state.world.wrapCoords.y / state.output.canvasDims.size.y
    )
    // Note: this factor of 0.75 (3/4) means that
    // the most the view can zoom out during gameplay is 4/3
    // otherwise stars start disappearing off the sides!
    var starX = 0
    var starY = 0
    var starMaxCoordX = state.world.wrapCoords.x
    var starMaxCoordY = state.world.wrapCoords.y
    var numberOfStars = 1000
    var starColours = ["#FFF", "#999", "#FCC", "#FDB", "#FFA", "#4DF", "#AAF"]
    var colourIndex = 0
    for (var i=0; i<numberOfStars; i++) {
      starX = starMaxCoordX * (-0.5+Math.random())
      starY = starMaxCoordY * (-0.5+Math.random())
      state.stars.gameCoords.push([starX, starY])
      state.stars.canvasCoords.push([starX, starY])   // Will be overwritten!
      colourIndex = Math.round(starColours.length * Math.random())
      state.stars.colours.push(starColours[colourIndex])
      state.stars.sizes.push(minSize + (maxSize-minSize)*Math.random()**2)
    }

  }

  window.mainLoop = function(timeLoopStart) {
    // timeLoopStart is a decimal number, a time precise to 0.005ms :)
    // Can probably merge these two variables into one?
    // if (state.control.continueLooping && !state.control.paused) {
    if (!state.control.paused) {
      window.requestAnimationFrame(mainLoop)
      // Make a request for next animation frame
      // at the top of this animation frame
    } else {
      // Log the state on every pause
      console.log("State is", state)
    }
    // Using the 'requestAnimationFrame'
    // runs this loop once for every
    // frame displayed by the browser
    // i.e. browser and main loop are synchronised

    state.control.loopCount++
    doTiming(timeLoopStart)
    respondToKeyboardDuringMainLoop()
    updateViewCoords()
    recalculateAllPhysicsStats()
    updateMassesGameCoords()
    updateMassesCanvasCoords()

    // // Dealing with collisions - more work needed here!
    // // Can comment these two in and out to turn collision detection on/off
    findCollisionsBetweenMasses()
    dealWithCollisions()

    drawCanvas()
    updateDisplay()
    removeDeadMasses()
    var timeLoopEnd = window.performance.now()
    state.control.timing.msRenderTime = timeLoopEnd - timeLoopStart

  }

  // RUN THE GAME!!!!

  // Setup the initial game state
  setupState()

  // Setup monitors on the keyboard to monitor relevant keyboard presses
  window.addEventListener('keydown', function(event){
    var eventKeyboardCode = event.code
    // console.log(eventKeyboardCode)
    var monitoredCodeState = state.input.keyboard[eventKeyboardCode]
    // Undefined if not monitored, true or false if monitored
    if (monitoredCodeState===false) {
      state.input.keyboard[eventKeyboardCode] = true
    }
    respondReliablyToKeyDowns(eventKeyboardCode)
  })
  window.addEventListener('keyup', function(event){
    var eventKeyboardCode = event.code
    var monitoredCodeState = state.input.keyboard[eventKeyboardCode]
    if (monitoredCodeState===true) {
      state.input.keyboard[eventKeyboardCode] = false
    }
    respondReliablyToKeyUps(eventKeyboardCode)
  })

  // Finally... start the mainLoop
  window.requestAnimationFrame(mainLoop)

}

window.addEventListener('load', playGame)
