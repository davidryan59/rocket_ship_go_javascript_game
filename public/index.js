var playGame = function() {

  var state = {}

  var updateMassGameCoords = function(mass) {
    var degreesToRadians = Math.PI/180
    // Get state variables
    var grav = state.gravity        // Pixels per second per second
    var dT = state.timing.msBetweenLoops / 1000    // in seconds
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
    massAngle += dT * angVeloc
    if (mass.affectedByGravity) {
      v += dT * grav
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

  var mapCoordsGameToCanvas = function(gameCoordArray, canvasCoordArray, extraZoom) {
    // Use gameCoordArray and current game state
    // to recalculate and overwrite the viewCoords
    // Want the two arrays to be the same size
    // which is an array of size N, of arrays of size 2

    var viewMidX = state.view.pos.x
    var viewMidY = state.view.pos.y
    var viewZoom = state.view.zoom
    var overallZoom = viewZoom * extraZoom

    var canvasMidX = state.canvas.centre.x
    var canvasMidY = state.canvas.centre.y

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
      canvasCoord = [canvasX, canvasY]
      canvasCoordArray[i] = canvasCoord
    }
  }

  var updateMassesCanvasCoords = function() {
    for (var mass of state.masses) {
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasMainCoords, 1)
      mapCoordsGameToCanvas(mass.gameCoords, mass.canvasBackCoords, 0.9)
    }
  }

  var doTiming = function(tFrame) {
    var prevLoopStart = state.timing.thisLoopStart
    var thisLoopStart = tFrame
    var msBetweenLoops = thisLoopStart-prevLoopStart
    state.timing.prevLoopStart = prevLoopStart
    state.timing.thisLoopStart = thisLoopStart
    state.timing.msBetweenLoops = msBetweenLoops
  }

  var updateViewCoords = function() {
    var prevX = state.view.pos.x    // Pixels
    var prevY = state.view.pos.y    // Pixels
    // var prevU = state.view.vel.u    // Pixels per second
    // var prevV = state.view.vel.v    // Pixels per second
    var grav = state.gravity        // Pixels per second per second
    var dT = state.timing.msBetweenLoops / 1000    // in seconds
    var followX = state.viewFollow.x
    var followY = state.viewFollow.y
    var dX = followX-prevX
    var dY = followY-prevY
    var dRdR = dX*dX + dY*dY
    state.view.pos.x = prevX + dX / 50
    state.view.pos.y = prevY + dY / 50
    state.view.zoom = 1/((1+dRdR)**0.03)

    // state.view.pos.x = prevX + prevU * dT
    // state.view.pos.y = prevY + prevV * dT
    // state.view.vel.u = prevU + 0 * dT   // Currently does nothing
    // state.view.vel.v = prevV + grav * dT  // Should be following the ship, not moving under gravity!
  }

  var drawLineSet = function(coordsArray){
    var context = state.context
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
    // console.log(state)
    var mass = null
    var context = state.context
    for (var i in state.masses) {
      mass = state.masses[i]
      context.strokeStyle = mass.colourBack.line
      context.lineWidth = mass.colourBack.lineWidth
      context.fillStyle = mass.colourBack.fill
      drawLineSet(mass.canvasBackCoords)
    }
    for (var i in state.masses) {
      mass = state.masses[i]
      context.strokeStyle = mass.colourMain.line
      context.lineWidth = mass.colourMain.lineWidth
      context.fillStyle = mass.colourMain.fill
      drawLineSet(mass.canvasMainCoords)
    }
  }

  var drawCanvas = function(){
    // Set up drawing
    var canvasLeft = state.canvas.bounds.left
    var canvasRight = state.canvas.bounds.right
    var canvasUp = state.canvas.bounds.up
    var canvasDown = state.canvas.bounds.down
    var context = state.context
    // Do drawing
    context.clearRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    drawMassesOntoCanvas()
  }

  var updateDisplay = function(){
    var renderTimeElt = state.timing.renderTimeElt
    var msRenderTime = state.timing.msRenderTime
    var renderTimeText = Math.round(msRenderTime*1)/1
    renderTimeElt.innerText = renderTimeText
  }


  var setupState = function() {
    state.continueLooping = true
    state.loopCount = 0

    // Setup variables for game
    var timing = {
      prevLoopStart: window.performance.now(),    // dummy data
      thisLoopStart: window.performance.now(),
      msBetweenLoops: 10,
      msRenderTime: 10,
      renderTimeElt: document.querySelector("#render-time")
    }
    var canvasElt = document.querySelector("#main-canvas")
    var context = canvasElt.getContext('2d')

    // Setup canvas variable
    var boundLeft = 0
    var boundRight = canvasElt.width
    var boundUp = 0
    var boundDown = canvasElt.height
    var canvasBounds = {left: boundLeft, right: boundRight, up: boundUp, down: boundDown}
    var canvasCentre = {x: (boundLeft+boundRight)/2, y: (boundUp+boundDown)/2}
    var canvas = {elt: canvasElt, bounds: canvasBounds, centre: canvasCentre}
    var view = {pos: {x: canvasCentre.x, y: canvasCentre.y}, zoom: 1}
    // x, y are positions in pixels
    // u, v are velocities in pixels per second
    var gravity = -50    // (Pixels per second per second!)

    var gameMasses = []
    var addNewRandomGameMass = function(x, y, points, maxRadius, minRadius) {
      var gameMass = {}
      gameMass.x = x
      gameMass.y = y
      gameMass.colourMain = {}
      gameMass.colourMain.line = "#440033"
      gameMass.colourMain.lineWidth = 3
      gameMass.colourMain.fill = "#662A00"
      gameMass.colourBack = {}
      gameMass.colourBack.line = "#775500"
      gameMass.colourBack.lineWidth = 2
      gameMass.colourBack.fill = "#997700"
      gameMass.angle = 0
      gameMass.maxRadius = maxRadius
      gameMass.moves = false
      gameMass.u = 0    // Anything which doesn't move should have u, v, angVeloc = 0
      gameMass.v = 0
      gameMass.angVeloc = 0
      gameMass.affectedByGravity = false  // Things should only be affected by gravity if they move!
      gameMass.angleRadii = []
      // First element
      var nextAngle = 0
      var nextRadius = minRadius + (maxRadius-minRadius) * Math.random()
      var nextElt = [nextAngle, nextRadius]
      gameMass.angleRadii.push(nextElt)
      for (var i=1; i<points; i++) {
        // Middle elements
        nextAngle = 360 * i / points
        nextRadius = minRadius + (maxRadius-minRadius) * Math.random()
        nextElt = [nextAngle, nextRadius]
        gameMass.angleRadii.push(nextElt)
      }
      // Last element
      nextAngle = 360
      nextRadius = gameMass.angleRadii[0][1]
      nextElt = [nextAngle, nextRadius]
      gameMass.angleRadii.push(nextElt)
      // Add to game masses
      gameMasses.push(gameMass)
      return gameMass
    }

    var theJetman = addNewRandomGameMass(canvasCentre.x, canvasCentre.y, 5, 30, 30)
    theJetman.angleRadii[1][1]=10
    theJetman.angleRadii[2][1]=18
    theJetman.angleRadii[3][1]=18
    theJetman.angleRadii[4][1]=10
    theJetman.moves = true
    theJetman.affectedByGravity = true
    theJetman.u = 40
    theJetman.v = 80
    theJetman.angVeloc = 15      // Degrees per second!
    // theJetman.angleRadii[5][1]=40
    // theJetman.angleRadii[6][1]=12
    // theJetman.angleRadii[7][1]=10
    // theJetman.angleRadii[8][1]=12

    // Use above function to actually create some test game masses
    var xMin = -50
    var xMax = 850
    var yMin = -50
    var yMax = 650
    var points = 19
    var maxRadius = 150
    var minRadius = 40
    for (var x=xMin; x<=xMax; x+=100) {
      addNewRandomGameMass(x, yMin, points, maxRadius, minRadius)
      addNewRandomGameMass(x, yMax, points, maxRadius, minRadius)
    }
    for (var y=yMin; y<=yMax; y+=100) {
      addNewRandomGameMass(xMin, y, points, maxRadius, minRadius)
      addNewRandomGameMass(xMax, y, points, maxRadius, minRadius)
    }

    // Use automation to finish setting up game masses
    for (var gameMass of gameMasses) {
      (!gameMass.maxRadius) ? gameMass.maxRadius = 0 : null;
      (!gameMass.gameCoordsValid) ? gameMass.gameCoordsValid = false : null
      gameMass.gameCoords = gameMass.angleRadii.slice()   // Shallow copy! Need deep copy!
      gameMass.canvasMainCoords = gameMass.angleRadii.slice()
      gameMass.canvasBackCoords = gameMass.angleRadii.slice()
      for (var i in gameMass.gameCoords) {
        gameMass.gameCoords[i] = gameMass.gameCoords[i].slice()  // Deep copy done here
        gameMass.canvasMainCoords[i] = gameMass.canvasMainCoords[i].slice()
        gameMass.canvasBackCoords[i] = gameMass.canvasBackCoords[i].slice()
      }
    }

    // Store them all in the state
    state.timing = timing
    state.canvas = canvas
    state.context = context
    state.masses = gameMasses
    state.view = view
    state.gravity = gravity
    state.viewFollow = theJetman

    // console.log(state)

  }

  window.mainLoop = function(timeLoopStart) {
    // timeLoopStart is a decimal number, a time precise to 0.005ms :)
    if (state.continueLooping) {
      window.requestAnimationFrame(mainLoop)
      // Make a request for next animation frame
      // at the top of this animation frame
    } else {
      // Exiting main loop now
      console.log("State is", state)
    }
    // Using the 'requestAnimationFrame'
    // runs this loop once for every
    // frame displayed by the browser
    // i.e. browser and main loop are synchronised

    state.loopCount++
    if (state.loopCount > 400) {
      // At the moment, just run the loop
      // a fixed number of times
      state.continueLooping = false
    }

    doTiming(timeLoopStart)
    updateViewCoords()
    updateMassesGameCoords()
    updateMassesCanvasCoords()
    drawCanvas()
    updateDisplay()

    var timeLoopEnd = window.performance.now()
    state.timing.msRenderTime = timeLoopEnd - timeLoopStart

    // console.log(
    //   "Game loop", state.loopCount,
    //   "started", Math.round(timeLoopStart*1000)/1000,
    //   "ended", Math.round(timeLoopEnd*1000)/1000,
    //   "and took", Math.round((timeLoopEnd-timeLoopStart)*1000)/1000,
    //   "ms"
    // )
    // console.log("View position is", state.view.pos.x, state.view.pos.y)
    // console.log("View velocity is", state.view.vel.u, state.view.vel.v)

  }

  // RUN THE GAME!!!!
  setupState()
  window.requestAnimationFrame(mainLoop)  // Start the mainLoop

}

window.addEventListener('load', playGame)
