var findIntersections = require("red-blue-line-segment-intersect")

var elasticCentredCollision = require('./models/elastic_centred_collision')

var playGame = function() {

  // State variable - all game state is on this object!
  // Allows persistent properties between browser animation frames,
  // pausing, etc.
  var state = {}
  state.version = {}
  state.version.number = "0.0.1"
  state.version.description = "Webpack use started"

  // Shortcuts to common constants here
  var degreesToRadians = Math.PI / 180
  var radiansToDegrees = 1 / degreesToRadians

  var developerTestFunction = function() {
    // Developer tool
    // When 'Z' is pressed, run this function
    // Typical use: log a calculation which is to be tested

    // var calc = testFunction()
    console.log("This (outer)", this)
    var calc = elasticCentredCollision(1)
    console.log("Result", calc)
  }

  var updateMassGameCoords = function(mass) {
    // Get state variables
    var grav = state.world.gravity        // Pixels per second per second
    var dT = 0.001 * state.control.timing.msBetweenLoops    // in seconds
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
    for (var mass of state.world.masses) {
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

    // extraZoom can be:
    // 1) A number
    // 2) An array of numbers, same size as other arrays
    var useZoomArray = Array.isArray(extraZoom)

    var canvasMidX = state.output.canvasDims.centre.x
    var canvasMidY = state.output.canvasDims.centre.y
    var viewMidX = state.output.view.pos.x
    var viewMidY = state.output.view.pos.y
    var viewZoom = state.output.view.zoom
    var overallZoom = null

    // Wrapping coordinates
    // Need the world to have width and height
    // bigger than the screen otherwise objects start
    // disappearing at the side of the screen, and
    // reappearing on the other side.
    var wrapX = state.world.wrapCoords.x
    var wrapY = state.world.wrapCoords.y
    var actualWrapX = null
    var actualWrapY = null
    var canvasWrapX = null
    var canvasWrapY = null

    var gameCoord = [0, 0]
    var gameX = 0
    var gameY = 0
    var canvasX = 0
    var canvasY = 0
    var canvasCoord = [0, 0]
    for (var i=0; i < gameCoordArray.length; i++) {
      if (useZoomArray) {
        overallZoom = viewZoom * extraZoom[i]
      } else {
        overallZoom = viewZoom * extraZoom
      }
      actualWrapX = wrapX * overallZoom
      actualWrapY = wrapY * overallZoom
      gameCoord = gameCoordArray[i]
      gameX = gameCoord[0]
      gameY = gameCoord[1]
      canvasX = canvasMidX + overallZoom * (gameX - viewMidX)    // Game coords start in bottom left, but
      canvasY = canvasMidY - overallZoom * (gameY - viewMidY)    // Canvas coords start in top left

      if (i===0 || wrapIndep===true) {
        canvasWrapX = Math.round((canvasX - canvasMidX) / actualWrapX)
        canvasWrapY = Math.round((canvasY - canvasMidY) / actualWrapY)
      }

      canvasCoord = [canvasX - actualWrapX * canvasWrapX, canvasY - actualWrapY * canvasWrapY]
      // canvasCoord = [canvasX, canvasY]   // This is the unwrapped version!
      canvasCoordArray[i] = canvasCoord
    }
  }

  var updateMassesCanvasCoords = function() {
    var backZoomOut = 0
    var backZoom = 0
    for (var mass of state.world.masses) {
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasMainCoords, 1)
      backZoomOut = mass.graphics.back.zoomOut
      backZoomOut > 1 ? backZoom = 1/backZoomOut : backZoom = 1 //0.9  // Sensible default
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasBackCoords, backZoom)
    }
  }

  var doTiming = function(tFrame) {
    var prevLoopStart = state.control.timing.thisLoopStart
    var thisLoopStart = tFrame
    if (state.control.pausing.timingNeedsResetting) {
      // Reset the prevLoopStart since its going to be a long time ago!
      prevLoopStart = thisLoopStart - 8        // Between 0 and 16. 8 smooth.
      state.control.pausing.timingNeedsResetting = false
    }
    var msBetweenLoops = thisLoopStart-prevLoopStart
    state.control.timing.prevLoopStart = prevLoopStart
    state.control.timing.thisLoopStart = thisLoopStart
    state.control.timing.msBetweenLoops = msBetweenLoops
    state.player.time += 0.001 * msBetweenLoops
  }

  var updateViewCoords = function() {
    // var prevX = state.output.view.pos.x    // Pixels
    // var prevY = state.output.view.pos.y    // Pixels
    var followX = state.player.ship.x
    var followY = state.player.ship.y
    var followU = state.player.ship.u
    var followV = state.player.ship.v
    // Two constants controlling how swiftly view responds to velocity
    var velConst = state.constants.view.velFactor
    var radiusConst = state.constants.view.radiusFactor
    // Get a magnitude and angle from velocity
    // which will determine how view relates to ship
    var shipVelMagSq = followU ** 2 + followV ** 2      // Leave this squared so low speeds not much happens
    var shipVelAng = radiansToDegrees * Math.atan(followU/followV)
    if (followV<0) {
      shipVelAng += 180
    }
    // Use the atan function
    // Smooth movement around the ship
    var viewMoveDistance = radiusConst * 0.6366 * Math.atan(velConst * shipVelMagSq)
    // Factor of 0.6366 is 1/arctan(Inf)

    // var dX = followX-prevX
    // var dY = followY-prevY
    // var d2 = state.player.ship.u**2 + state.player.ship.v**2
    // Sometimes view can stay behind the player ship so far
    // it is off the screen! Fix this.
    state.output.view.pos.x = followX + viewMoveDistance * (
      Math.sin(degreesToRadians * shipVelAng)
    )
    state.output.view.pos.y = followY + viewMoveDistance * (
      Math.cos(degreesToRadians * shipVelAng)
    )
    // state.output.view.pos.y = followY + radiusConst * followV
    // When the player ship stops momentarily, the screen zooms in and out
    // very fast. Fix this.
    // Note - changing the zoom will make stars go off
    // the side of the screen, if the constants aren't
    // calibrated... more work needed here.
    state.output.view.zoom = 1  //0.92+0.08/(1+0.0001*d2)
  }

  var drawLineSet = function(coordsArray, drawLine){
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
    if (drawLine) context.stroke()
    context.fill()
    // context.closePath()
  }

  var drawMassCentresAsPoints = function() {
    // Draw a dot on the centre of mass for each mass
    var context = state.output.context
    var canvasCoords = [[0, 0]]
    var dotSize = 2
    for (var i in state.world.masses) {
      massGameX = state.world.masses[i].x
      massGameY = state.world.masses[i].y
      mapCoordsGameToCanvas([[massGameX, massGameY]], canvasCoords, 1)
      context.fillStyle = "#FFF"
      context.fillRect(canvasCoords[0][0], canvasCoords[0][1], dotSize, dotSize)
    }
  }

  var drawMassesOntoCanvas = function() {
    var mass = null
    var context = state.output.context
    for (var i in state.world.masses) {
      mass = state.world.masses[i]
      if (mass.graphics.back.isDrawn) {
        context.strokeStyle = mass.graphics.back.strokeStyle
        context.lineWidth = mass.graphics.back.lineWidth
        context.fillStyle = mass.graphics.back.fillStyle
        drawLineSet(mass.canvasBackCoords, mass.graphics.back.drawLine)
      }
    }
    for (var i in state.world.masses) {
      mass = state.world.masses[i]
      context.strokeStyle = mass.graphics.main.strokeStyle
      context.lineWidth = mass.graphics.main.lineWidth
      context.fillStyle = mass.graphics.main.fillStyle
      drawLineSet(mass.canvasMainCoords, mass.graphics.main.drawLine)
    }
    if (state.output.view.markCentreOfMass) {
      drawMassCentresAsPoints()
    }
  }

  var drawStarsOntoCanvas = function() {
    var context = state.output.context
    mapCoordsGameToCanvas(
      state.world.stars.gameCoords,
      state.world.stars.canvasCoords,
      state.world.stars.zoomIns,
      true
    )
    // the 'true' on the end does the canvas wrapping independently for each star
    // unlike most objects in the game (e.g. solid masses) which wrap together.
    var starX = 0   // These to be overwritten
    var starY = 0
    var starCol = "#FFF"
    var starSize = 2
    for (var i in state.world.stars.canvasCoords) {
      starX = state.world.stars.canvasCoords[i][0]
      starY = state.world.stars.canvasCoords[i][1]
      starCol = state.world.stars.colours[i]
      starSize = state.world.stars.sizes[i]
      context.fillStyle = starCol
      context.fillRect(starX, starY, starSize, starSize)
    }
  }

  var clearCanvas = function(){
    // Set up drawing
    var canvasLeft = state.output.canvasDims.bounds.left
    var canvasRight = state.output.canvasDims.bounds.right
    var canvasUp = state.output.canvasDims.bounds.up
    var canvasDown = state.output.canvasDims.bounds.down
    var context = state.output.context
    // Do drawing
    context.clearRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    // context.fillStyle="black";
    // context.fillRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
  }

  var drawCanvas = function(){
    clearCanvas()
    drawStarsOntoCanvas()
    drawMassesOntoCanvas()
  }

  var updateTextInHtml = function(){
    if (state.control.loopCount % 7 === 0) {
      state.output.pageElts.time.innerText = Math.round(state.player.time)
      state.output.pageElts.fuel.innerText = Math.round(state.player.fuel)
      state.output.pageElts.ammo.innerText = Math.round(state.player.ammo)
      state.output.pageElts.health.innerText = Math.round(state.player.health)
      state.output.pageElts.coin.innerText = Math.round(state.player.coin)
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
    bullet.graphics.main.fillStyle = "#0F0"
    bullet.graphics.main.strokeStyle = "#FFF"
    bullet.graphics.main.lineWidth = 3
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

  var measureModularOffset = function(coord1, coord2, wrapDistance) {
    // var halfDistance = 0.5 * wrapDistance    // Slower
    var halfDistance = wrapDistance >> 1        // Faster!
    var result = (coord2-coord1) % wrapDistance
    // For positive result, between 0 and wrapDistance
    // For negative result, between -wrapDistance and 0
    // If abs value greater than halfDistance, find a number closer to 0
    if (halfDistance < result) {
      result -= wrapDistance
    } else if (result < -halfDistance) {
      result += wrapDistance
    }
    return result
  }

  var measureDistance = function(x1, y1, x2, y2) {
    var offsetX = measureModularOffset(x1, x2, state.world.wrapCoords.x)
    var offsetY = measureModularOffset(y1, y2, state.world.wrapCoords.y)
    // Offsets are from -wrap/2 to +wrap/2 in each direction
    return Math.sqrt(offsetX**2 + offsetY**2)
  }

  var measureAngleDegrees = function(x1, y1, x2, y2) {
    // See where mass game-coords are calculated
    // In degrees:
    // Up=0, up-right=45, right=90, right-down=135, down=180
    // Down+1 = -179, down-left=-135, left=-90, left-up = -45, up=0
    var xD = measureModularOffset(x1, x2, state.world.wrapCoords.x)
    var yD = measureModularOffset(y1, y2, state.world.wrapCoords.y)
    // Deal with case x offset = 0
    if (xD === 0) {
      // Will prevent division by zero below
      if (yD < 0) {
        return 180    // (0, -1) returns 180 degrees
      } else {
        return 0      // (0, 0) and (0, 1) returns 0 degrees
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
    return resultSign * (90 - angle)
  }

  var calcGameLineSegments = function(mass) {
    // These are only needed upon collision
    // so calculate them separately from coords here
    var gameCoords = mass.gameCoords
    var lineSegments = mass.gameLineSegments
    var len = gameCoords.length
    var k1 = 0
    for (var k=0; k<len; k++) {
      k1 = (k+1) % len
      lineSegments[k][0][0] = gameCoords[k][0]
      lineSegments[k][0][1] = gameCoords[k][1]
      lineSegments[k][1][0] = gameCoords[k1][0]
      lineSegments[k][1][1] = gameCoords[k1][1]
    }
  }

  var checkIfTrulyCollided = function(mass_i, mass_j) {

    var collided = false

    calcGameLineSegments(mass_i)
    calcGameLineSegments(mass_j)

    // // Use red-blue-line-segment-intersect
    // // Here's an example
    var segments_i = mass_i.gameLineSegments
    var segments_j = mass_j.gameLineSegments

    findIntersections(segments_i, segments_j, function(seg_i, seg_j) {
      // Iterates over pairs i, j that have collided
      collided = true

      // This exits the iteration
      // IMPROVE: calculate point of intersection
      return true
    })

    return collided
  }

  var findAndDealWithCollisions = function() {
    // Currently checking almost all pairs of masses
    // This could be done smarter when there are a lot of masses!
    var mass_i = null
    var mass_j = null
    var xi = 0
    var xj = 0
    var yi = 0
    var yj = 0
    var ri = 0
    var rj = 0
    var distance = 0
    var radiusSum = 0
    var countMasses = state.world.masses.length
    for (var i=0; i<countMasses; i++) {
      mass_i = state.world.masses[i]
      // Only allow one collision per mass per frame
      if (mass_i.collisionWith.index === null) {
        xi = mass_i.x
        yi = mass_i.y
        ri = mass_i.maxRadius
        for (var j=i+1; j<countMasses; j++) {
          mass_j = state.world.masses[j]
          if (mass_j.collisionWith.index === null) {
            // Ignore wall-wall collisions at the moment
            if (!(mass_i.isWall && mass_j.isWall)) {
              xj = mass_j.x
              yj = mass_j.y
              rj = mass_j.maxRadius
              distance = measureDistance(xi, yi, xj, yj)
              radiusSum = ri+rj
              if (distance < radiusSum) {
                if (checkIfTrulyCollided(mass_i, mass_j)) {
                  // Mark both as collided
                  // (This could be changed to a simple true/false)
                  mass_i.collisionWith.index = j
                  mass_j.collisionWith.index = i
                  // Get info for the collision calculation
                  var m1 = mass_i.mass
                  var m2 = mass_j.mass
                  var massSum = m1+m2
                  var movementRatio1 = m2/massSum
                  var movementRatio2 = m1/massSum
                  var angleM1M2 = measureAngleDegrees(xi, yi, xj, yj)
                  var cos = Math.cos(degreesToRadians * angleM1M2)
                  var sin = Math.sin(degreesToRadians * angleM1M2)
                  var repelPx = state.constants.collisions.repelPx
                  // Feed relevant info into calculation
                  newVelocityArray = elasticCentredCollision (
                    angleM1M2,
                    m1,
                    mass_i.u,
                    mass_i.v,
                    m2,
                    mass_j.u,
                    mass_j.v,
                    state.constants.collisions.dampingFactor
                  )
                  // Put the amended velocity components back
                  mass_i.u = newVelocityArray[0]
                  mass_i.v = newVelocityArray[1]
                  mass_j.u = newVelocityArray[2]
                  mass_j.v = newVelocityArray[3]
                  // Move the masses a small distance apart
                  mass_i.x -= movementRatio1 * repelPx * sin
                  mass_i.y -= movementRatio1 * repelPx * cos
                  mass_j.x += movementRatio2 * repelPx * sin
                  mass_j.y += movementRatio2 * repelPx * cos
                  break
                }
              }
            }
          }
        }
      }
      // Finished dealing with mass i
      // Can reset its marker now
      mass_i.collisionWith.index = null
    }
  }

  var respondReliablyToKeyUps = function(eventKeyboardCode) {
    // This runs in background, even if the main loop isn't running!
    if ( eventKeyboardCode === "KeyP" || eventKeyboardCode === "KeyQ" ) {
      // P is pause button. Q is extra pause button, easier positioning
      // Done on key-up, since keydown was more complicated and unreliable
      if (state.control.pausing.isPaused) {
        // Restart main loop!
        state.control.pausing.isPaused = false
        state.control.pausing.timingNeedsResetting = true
        window.requestAnimationFrame(mainLoop)
      } else {
        state.control.pausing.isPaused = true
        // This will stop the next animation frame
      }
    }
    if (eventKeyboardCode==="KeyZ") {
      // Developer function
      // Run a test function from within the game
      // This function can be switched to do whatever you want to measure.
      // Typically, console log the output of another function to test
      developerTestFunction()
    }
    if (eventKeyboardCode==="KeyX") {
      // Developer function
      // Turn COM dots off/on
      if (state.output.view.markCentreOfMass) {
        state.output.view.markCentreOfMass = false
      } else {
        state.output.view.markCentreOfMass = true
      }
    }
  }

  var respondReliablyToKeyDowns = function(eventKeyboardCode) {
    // This runs, even if the main loop isn't running!
    // Currently nothing extra to do,
    // on top of what's already controlled by main loop
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
    mass.mass = calcMass**1.5  // Pseudo-3D calculation here - turn 2D mass into 3D
    mass.maxRadius = maxRadius;
    mass.physicsStatsInvalid = false
  }

  var recalculateAllPhysicsStats = function() {
    for (var mass in state.world.masses) {
      if (mass.physicsStatsInvalid) {
        recalculatePhysicsStats(mass)
      }
    }
  }

  var removeDeadMasses = function() {
    var countMasses = state.world.masses.length
    var counter = 0
    while (counter < countMasses) {
      if (state.world.masses[counter].toBeRemoved) {
        state.world.masses.splice(counter, 1)
        countMasses--
        counter--
      }
      counter++
    }
  }

  var wrapCoordsOptional = function(){
    // Use this to map game coordinates to +/- half of the
    // wrapping distance in each direction.
    // Doesn't absolutely have to be done, but
    // its neater to do it.

    // Could, for example, allow coords to be +/- whole wrapping distance,
    // but map to within half the wrapping distance.
    // That way the modular arithmetic will still be put to some use!
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
    newMass.graphics.back.isDrawn = true
    newMass.graphics.main.fillStyle = "#999"
    newMass.graphics.main.strokeStyle = "#AC9"
    newMass.graphics.main.drawLine = true
    newMass.graphics.main.lineWidth = 3
    newMass.graphics.back.fillStyle = "#444"
    newMass.graphics.back.strokeStyle = "#669"
    newMass.graphics.back.drawLine = true
    newMass.graphics.back.lineWidth = 2
    // Note: state.world.masses will be rendered in the order they are stored!
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
    newMass.collisionWith.u = 0
    newMass.collisionWith.v = 0
    newMass.collisionWith.angVeloc = 0
    newMass.collisionWith.angle = 0
    newMass.collisionWith.massRatio = 0
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
    newMass.gameLineSegments = []
    newMass.canvasMainCoords = newMass.angleRadii.slice()
    newMass.canvasBackCoords = newMass.angleRadii.slice()
    for (var i in newMass.gameCoords) {
      newMass.gameCoords[i] = newMass.gameCoords[i].slice()  // Deep copy done here
      newMass.gameLineSegments[i] = [[0,0],[0,0]]
      newMass.canvasMainCoords[i] = newMass.canvasMainCoords[i].slice()
      newMass.canvasBackCoords[i] = newMass.canvasBackCoords[i].slice()
    }
    // Add to game masses
    state.world.masses.push(newMass)
    return newMass
  }

  var setupState = function() {

    // Setup main state categories here
    state.constants = {}
    // state.world = {}
    state.worlds = {}      // World will point to one of the worlds!
    state.player = {}
    state.control = {}
    state.input = {}
    state.output = {}
    state.output.pageElts = {}

    state.constants.collisions = {}
    state.constants.collisions.dampingFactor = 0.98     // Retain between 0 and 1 of momentum
    state.constants.collisions.repelPx = 1              // Move each mass slightly further away
    // state.constants.collisions.lastCollisionTime = 0
    // state.constants.collisions.timeBeforeNextCollision = 0.1  // Multiple collisions disallowed
    // // since that leads to objects sticking together!
    state.constants.view = {}
    state.constants.view.velFactor = 10 ** -6.2
    state.constants.view.radiusFactor = 300

    // state.rockTypes = []
    // var fullerene = {
    //   type: "fullerene",
    //   density: 0.5,
    //   rgbInfo: "too complicated"
    // }
    // state.rockTypes.push(fullerene)
    // state.rockTypes.fullerene = {}
    // state.rockTypes.fullerene.density =
    // state.rockTypes.fullerene.main = {}
    //   density: 0.5,
    // }
    // state.rockTypes.ammonium = {
    //   density: 0.5,
    // }
    // state.rockTypes.structrite = {
    //   density: 0.5,
    // }
    // state.rockTypes.coinium = {
    //   density: 0.5,
    // }
    // state.rockTypes.neutrite = {
    //   density: 0.5,
    // }

    // Setup control variables
    state.control.loopCount = 0
    state.control.pausing = {}
    state.control.pausing.isPaused = false
    state.control.pausing.timingNeedsResetting = false
    state.control.timing = {}
    state.control.timing.prevLoopStart = window.performance.now()    // dummy data
    state.control.timing.thisLoopStart = window.performance.now()
    state.control.timing.msBetweenLoops = 10
    state.control.timing.msRenderTime = 10

    // Setup worlds hash
    var world1Name = "emptyWorld"
    state.worlds[world1Name] = {}
    var world2Name = "testWorld"
    state.worlds[world2Name] = {}
    state.control.currentWorldName = world2Name
    // Point the (current) world to the world stated in control
    state.world = state.worlds[state.control.currentWorldName]

    // Setup world maximum dimensions
    // If things are bigger, they get wrapped around (modular arithmetic!)
    // Note - no individual item should be anywhere near this big,
    // since they will not display correctly, they will visibly flicker
    // from left/right or top/down.
    state.world.wrapCoords = {}
    state.world.wrapCoords.x = 6000
    state.world.wrapCoords.y = 4000
    // Currently (2017_10_22) the screen is fixed at 1200x675 px (16:9 aspect ratio)
    // Each of the dimensions for wrapCoords here needs to be
    // significantly bigger than the screen dimension.
    // Also, the stars will be very near unless these dimensions are big enough!

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
    state.output.view.markCentreOfMass = true
    state.output.view.pos = {}
    state.output.view.pos.x = state.output.canvasDims.centre.x
    state.output.view.pos.y = state.output.canvasDims.centre.y

    // x, y are positions in pixels
    // u, v are velocities in pixels per second

    // Start the game masses array.
    // This contains: the player ship, walls, bullets, enemies, etc.
    state.world.masses = []

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
    }
    // Leave a gap!
    for (var y=yMin+step; y<=yMax-3*step; y+=step) {
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
      // theMass.graphics.main.drawLine = false
      // theMass.graphics.back.drawLine = false
      theMass.graphics.back.zoomOut = 1.05 + 0.5*(1-wallCoordSet[i][2]**0.5)
      theMass.moves = true
    }

    var j=0
    var jMax = state.world.masses.length - 1

    // Make some of the game masses rotate!
    for (var i=0; i<7; i++) {
      j = Math.round(jMax * Math.random())
      state.world.masses[j].moves = true
      state.world.masses[j].angVeloc = -30 + 60 * Math.random()  // deg/s
    }

    // Make some of the game masses dark brown!
    for (var i=0; i<9; i++) {
      j = Math.round(jMax * Math.random())
      state.world.masses[i].graphics.main.fillStyle = "#997755"
      state.world.masses[i].graphics.main.strokeStyle = "#AA6655"
      state.world.masses[i].graphics.back.fillStyle = "#664422"
      state.world.masses[i].graphics.back.strokeStyle = "#999922"
    }

    // Make some of the game masses gold!
    for (var i=0; i<3; i++) {
      j = Math.round(jMax * Math.random())
      state.world.masses[i].graphics.main.fillStyle = "#998811"
      state.world.masses[i].graphics.main.strokeStyle = "#AAAAEE"
      state.world.masses[i].graphics.back.fillStyle = "#665511"
      state.world.masses[i].graphics.back.strokeStyle = "#779977"
    }

    // // DEBUG - single large mass below start point
    // addNewMass(state.output.canvasDims.centre.x, state.output.canvasDims.centre.y - 800, 10, 600, 550, 10)

    // Make the game player
    var playerShip = addNewMass(state.output.canvasDims.centre.x, state.output.canvasDims.centre.y, 5, 41, 41, 0.3, 3)
    playerShip.massType = "ship"
    playerShip.angleRadii[1][1]=13
    playerShip.angleRadii[2][1]=23
    playerShip.angleRadii[3][1]=23
    playerShip.angleRadii[4][1]=13
    playerShip.moves = true
    playerShip.affectedByGravity = true
    playerShip.u = -40 + 80 * Math.random()
    playerShip.v = 50 + 50 * Math.random()
    playerShip.isWall = false
    playerShip.angVeloc = 0
    playerShip.graphics.main.fillStyle = "#44F"
    playerShip.graphics.main.strokeStyle = "#ACF"
    playerShip.graphics.main.lineWidth = 2
    playerShip.graphics.back.isDrawn = false

    // The world needs to know which of its masses is the player ship
    state.world.playerShip = playerShip

    // The player needs to know which of the masses
    // (IN THE CURRENT WORLD!)
    // is the player ship
    state.player.ship = state.world.playerShip

    // Other player ship related variables
    state.player.time = 0
    state.player.fuel = 100
    state.player.ammo = 50
    state.player.health = 100
    state.player.coin = 0

    // Monitor key presses
    state.input.keyboard = {}
    state.input.keyboard.ArrowLeft = false      // Rotate left
    state.input.keyboard.ArrowRight = false     // Rotate right
    state.input.keyboard.ArrowUp = false        // Thrust
    state.input.keyboard.Space = false          // Fire bullet
    state.input.keyboard.KeyP = false           // Pause
    state.input.keyboard.KeyQ = false           // Also pause
    state.input.keyboard.KeyZ = false           // Run dev script (keyup)
    state.input.keyboard.KeyX = false           // Turn off/on COM dots

    // Setup output links to HTML webpage
    state.output.context = context
    // state.output.pageElts = {}    // Done earlier
    state.output.pageElts.canvas = canvasElt
    state.output.pageElts.time = document.querySelector("#time-left")
    state.output.pageElts.fuel = document.querySelector("#fuel-left")
    state.output.pageElts.ammo = document.querySelector("#ammo-left")
    state.output.pageElts.health = document.querySelector("#health-left")
    state.output.pageElts.coin = document.querySelector("#coin-found")
    state.output.pageElts.x = document.querySelector("#pos-x")
    state.output.pageElts.y = document.querySelector("#pos-y")
    state.output.pageElts.u = document.querySelector("#vel-u")
    state.output.pageElts.v = document.querySelector("#vel-v")
    state.output.pageElts.anglePos = document.querySelector("#ang-pos")
    state.output.pageElts.angleVel = document.querySelector("#ang-vel")
    state.output.pageElts.renderTimeElt = document.querySelector("#render-time")

    state.world.gravity = -120    // (Pixels per second per second!)

    state.world.stars = []
    state.world.stars.gameCoords = []
    state.world.stars.canvasCoords = []
    state.world.stars.colours = []
    state.world.stars.sizes = []
    var minSize = 1
    var maxSize = 4
    var maxZoomOut = Math.min(
      state.world.wrapCoords.x / state.output.canvasDims.size.x,
      state.world.wrapCoords.y / state.output.canvasDims.size.y
    )
    // Any more than this and stars need to be displayed in 2 places at once!
    // This factor is related to the maximum amount the view can zoom in!
    var maxStarZoomFactor = 1     // 1 => Assuming view doesn't zoom out at all
    var minStarZoomFactor = 0.0001
    var maxWeighting = 2

    // Currently - a single zoom for all stars
    state.world.stars.zoomOut = maxStarZoomFactor * maxZoomOut
    // Note: this factor of maxStarZoomFactor means that
    // the most the view can zoom out during gameplay is 1/maxStarZoomFactor
    // otherwise stars start disappearing off the sides!

    // BETA - a zoom array, one entry for each star.
    // Looking to make the stars move in parallax!
    state.world.stars.zoomIns = []

    var starX = 0
    var starY = 0
    var starMaxCoordX = state.world.wrapCoords.x
    var starMaxCoordY = state.world.wrapCoords.y
    var numberOfStars = 1000
    var starColours = [
      "#F80", "#FB0", "#FF0",
      "#FF3", "#FF8", "#FFB", "#BFF", "#8FF",
      "#3FF", "#0FF", "#0BF", "#08F",
      "#F80", "#FB0", "#FF0",
      "#FF3", "#FF8", "#FFB", "#BFF", "#8FF",
      "#3FF", "#0FF", "#0BF", "#08F",
      "#F80", "#FB0", "#FF0",
      "#FF3", "#FF8", "#FFB", "#BFF", "#8FF",
      "#3FF", "#0FF", "#0BF", "#08F",
      "#FFF", "#F0F", "#0F0", "#F00", "#00F"
    ]
    var colourIndex = 0
    var starZoomFactor = 0
    for (var i=0; i<numberOfStars; i++) {
      starX = starMaxCoordX * (-0.5+Math.random())
      starY = starMaxCoordY * (-0.5+Math.random())
      state.world.stars.gameCoords.push([starX, starY])
      state.world.stars.canvasCoords.push([starX, starY])   // Will be overwritten!
      colourIndex = Math.round(starColours.length * Math.random())
      state.world.stars.colours.push(starColours[colourIndex])
      state.world.stars.sizes.push(minSize + (maxSize-minSize)*Math.random()**2)

      // BETA
      // Have more background stars than foreground - square random number
      starZoomFactor = maxStarZoomFactor + (minStarZoomFactor-maxStarZoomFactor) * (Math.random() ** maxWeighting)
      state.world.stars.zoomIns.push(1 / (starZoomFactor * maxZoomOut))
    }

  }

  window.mainLoop = function(timeLoopStart) {
    // timeLoopStart is a decimal number, a time precise to 0.005ms :)
    // Can probably merge these two variables into one?
    // if (state.control.continueLooping && !state.control.pausing.isPaused) {
    if (!state.control.pausing.isPaused) {
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
    findAndDealWithCollisions()
    drawCanvas()
    updateTextInHtml()
    removeDeadMasses()
    wrapCoordsOptional()
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
