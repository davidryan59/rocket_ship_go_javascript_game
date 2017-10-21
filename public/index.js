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
    massAngle = ( massAngle + dT * angVeloc) % 360
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
    state.view.zoom = 1/((1+dRdR)**0.06)

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
    if (state.loopCount % 7 === 0) {
      state.timing.renderTimeElt.innerText = Math.round(state.timing.msRenderTime )
      state.htmlElements.x.innerText = Math.round(state.viewFollow.x)
      state.htmlElements.y.innerText = Math.round(state.viewFollow.y)
      state.htmlElements.u.innerText = Math.round(state.viewFollow.u)
      state.htmlElements.v.innerText = Math.round(state.viewFollow.v)
      state.htmlElements.anglePos.innerText = Math.round(state.viewFollow.angle)
      state.htmlElements.angleVel.innerText = Math.round(state.viewFollow.angVeloc)
    }
  }

  var respondToKeyboard = function() {
    if (state.keysMonitored.ArrowLeft) {
      state.viewFollow.angVeloc -= 10
    }
    if (state.keysMonitored.ArrowRight) {
      state.viewFollow.angVeloc += 10
    }
    if (!state.keysMonitored.ArrowLeft && !state.keysMonitored.ArrowRight) {
      state.viewFollow.angVeloc *= 0.90
    }
    if (state.keysMonitored.ArrowUp) {
      var mult = Math.PI / 180
      state.viewFollow.u += 5 * Math.sin(mult*state.viewFollow.angle)
      state.viewFollow.v += 5 * Math.cos(mult*state.viewFollow.angle)
    }
    if (state.keysMonitored.KeyQ) {
      state.continueLooping = false
    }
    if (state.keysMonitored.KeyP) {
      // // Taken out - this doesn't actually work - how to fix?
      // state.paused = !state.paused
    }

  }


  var setupState = function() {
    state.continueLooping = true
    state.paused = false
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
      gameMass.graphics = {}
      // Foreground / Main rendered at zoom = zoomOut = 1
      gameMass.graphics.main = {}
      gameMass.graphics.main.strokeStyle = "#440033"
      gameMass.graphics.main.lineWidth = 3
      gameMass.graphics.main.fillStyle = "#662A00"
      // Background rendered at higher zoomOut > 1  (zoomOut = 1/zoom)
      gameMass.graphics.back = {}
      gameMass.graphics.back.zoomOut = 1.1
      gameMass.graphics.back.strokeStyle = "#775500"
      gameMass.graphics.back.lineWidth = 2
      gameMass.graphics.back.fillStyle = "#997700"
      // Note: gameMasses will be rendered in the order they are stored!
      // However, it will only look correct if the objects with
      // higher zoomOuts are rendered first
      // so there ought to be checking of order and sorting
      // perhaps every 0.25 seconds (10 frames/loops or so)
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

    // Make the game player
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
    theJetman.graphics.main = {}
    theJetman.graphics.main.strokeStyle = "#000000"
    theJetman.graphics.main.lineWidth = 1
    theJetman.graphics.main.fillStyle = "#0000FF"
    theJetman.graphics.back = {}
    theJetman.graphics.back.strokeStyle = "#FFFFFF"
    theJetman.graphics.back.lineWidth = 2
    theJetman.graphics.back.fillStyle = "#00FFFF"

    // Make some walls using the random mass
    var xMin = -50
    var xMax = 850
    var yMin = -50
    var yMax = 650
    var points = 19
    var maxRadius = 150
    var minRadius = 40
    // Make the set of points first
    // Then generate the wall elements in a random order
    var wallCoordSet = []
    for (var x=xMin; x<=xMax; x+=100) {
      wallCoordSet.push([x, yMin, Math.random()])
      wallCoordSet.push([x, yMax, Math.random()])
    }
    for (var y=yMin; y<=yMax; y+=100) {
      wallCoordSet.push([xMin, y, Math.random()])
      wallCoordSet.push([xMax, y, Math.random()])
    }
    wallCoordSet.sort(function(elt2, elt1){
      return elt2[2] - elt1[2]
    })
    console.log(wallCoordSet)
    var theMass = null
    for (var i in wallCoordSet) {
      theMass = addNewRandomGameMass(wallCoordSet[i][0], wallCoordSet[i][1], points, maxRadius, minRadius)
      theMass.graphics.back.zoomOut = 1.05 + 0.5*(1-wallCoordSet[i][2]**0.5)
    }
    // var numberOfPoints = wallCoordSet.length
    // var pointsLeft = 0
    // var randPointIndex = 0
    // var theWallCoord = [0, 0]
    // for (var i=0; i<numberOfPoints; i++) {
    //   pointsLeft = numberOfPoints - i
    //   randPointIndex = Math.round(pointsLeft*Math.random())
    //   theWallCoord = wallCoordSet.splice(randPointIndex, 1)  // e.g. [[1, 2]]
    //   theWallCoord = theWallCoord[0]                         // e.g. [1, 2]
    //   console.log(theWallCoord)
    //   console.log(wallCoordSet)
    //   addNewRandomGameMass(theWallCoord[0], theWallCoord[1], points, maxRadius, minRadius)
    // }
    // console.log(gameMasses)




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

    // Monitor key presses
    state.keysMonitored = {}
    state.keysMonitored.ArrowLeft = false
    state.keysMonitored.ArrowRight = false
    state.keysMonitored.ArrowUp = false
    state.keysMonitored.KeyQ = false
    state.keysMonitored.KeyP = false

    // Setup links to HTML items
    state.htmlElements = {}
    state.htmlElements.x = document.querySelector("#pos-x")
    state.htmlElements.y = document.querySelector("#pos-y")
    state.htmlElements.u = document.querySelector("#vel-u")
    state.htmlElements.v = document.querySelector("#vel-v")
    state.htmlElements.anglePos = document.querySelector("#ang-pos")
    state.htmlElements.angleVel = document.querySelector("#ang-vel")

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

    if (!state.paused) {
      state.loopCount++
      doTiming(timeLoopStart)
      respondToKeyboard()
      updateViewCoords()
      updateMassesGameCoords()
      updateMassesCanvasCoords()
      drawCanvas()
      updateDisplay()
      var timeLoopEnd = window.performance.now()
      state.timing.msRenderTime = timeLoopEnd - timeLoopStart
    }
  }

  // RUN THE GAME!!!!

  // Setup the initial game state
  setupState()

  // Setup monitors on the keyboard to monitor relevant keyboard presses
  window.addEventListener('keydown', function(event){
    var eventKeyboardCode = event.code
    var monitoredCodeState = state.keysMonitored[eventKeyboardCode]
    // Undefined if not monitored, true or false if monitored
    if (monitoredCodeState===false) {
      state.keysMonitored[eventKeyboardCode] = true
    }
  })
  window.addEventListener('keyup', function(event){
    var eventKeyboardCode = event.code
    var monitoredCodeState = state.keysMonitored[eventKeyboardCode]
    if (monitoredCodeState===true) {
      state.keysMonitored[eventKeyboardCode] = false
    }
  })

  // Finally... start the mainLoop
  window.requestAnimationFrame(mainLoop)

}

window.addEventListener('load', playGame)
