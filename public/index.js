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
    var followX = state.viewFollow.x
    var followY = state.viewFollow.y
    var dX = followX-prevX
    var dY = followY-prevY
    var d2 = state.viewFollow.u**2 + state.viewFollow.v**2
    // Sometimes view can stay behind Jetman so far
    // he's off the screen! Fix this.
    state.view.pos.x = prevX + dX / 15
    state.view.pos.y = prevY + dY / 15
    // When Jetman stops momentarily, the screen zooms in and out
    // very fast. Fix this.
    state.view.zoom = 0.92+0.08/(1+0.0001*d2)
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
      state.htmlElements.fuel.innerText = Math.round(state.fuel)
    }
  }

  var respondToKeyboard = function() {
    if (state.fuel > 0) {
      if (state.keysMonitored.ArrowLeft) {
        state.viewFollow.angVeloc -= 15
        state.fuel -= 0.001
      }
      if (state.keysMonitored.ArrowRight) {
        state.viewFollow.angVeloc += 15
        state.fuel -= 0.001
      }
      if (!state.keysMonitored.ArrowLeft && !state.keysMonitored.ArrowRight) {
        state.viewFollow.angVeloc *= 0.92
        // If deducting fuel, make it proportional to abs of angVeloc
      }
      if (state.keysMonitored.ArrowUp) {
        var mult = Math.PI / 180
        state.viewFollow.u += 10 * Math.sin(mult*state.viewFollow.angle)
        state.viewFollow.v += 10 * Math.cos(mult*state.viewFollow.angle)
        state.fuel -= 0.005
      }
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

    var gameMasses = []
    var addNewRandomGameMass = function(x, y, points, maxRadius, minRadius) {
      var gameMass = {}
      gameMass.x = x
      gameMass.y = y
      gameMass.graphics = {}
      // Foreground / Main rendered at zoom = zoomOut = 1
      gameMass.graphics.main = {}
      gameMass.graphics.main.strokeStyle = "#333333"
      gameMass.graphics.main.lineWidth = 3
      gameMass.graphics.main.fillStyle = "#555555"
      // Background rendered at higher zoomOut > 1  (zoomOut = 1/zoom)
      gameMass.graphics.back = {}
      gameMass.graphics.back.zoomOut = 1.1
      gameMass.graphics.back.strokeStyle = "#777777"
      gameMass.graphics.back.lineWidth = 2
      gameMass.graphics.back.fillStyle = "#999999"
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

    // Make some walls using the random mass
    var xMin = -100
    var xMax = 900
    var yMin = -100
    var yMax = 700
    var step = 125
    var points = 19     // Overridden randomly below
    var maxRadius = 150
    var minRadius = 40
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
    console.log(wallCoordSet)
    var theMass = null
    for (var i in wallCoordSet) {
      points = 3 + Math.round(21*Math.random())
      maxRadius = 50 + Math.round(150*Math.random())
      minRadius = 10 + Math.round(0.9*maxRadius*Math.random())
      theMass = addNewRandomGameMass(wallCoordSet[i][0], wallCoordSet[i][1], points, maxRadius, minRadius)
      theMass.graphics.back.zoomOut = 1.05 + 0.5*(1-wallCoordSet[i][2]**0.5)
    }

    var j=0
    var jMax = gameMasses.length - 1

    // Make some of the game masses rotate!
    for (var i=0; i<7; i++) {
      j = Math.round(jMax * Math.random())
      gameMasses[j].moves = true
      gameMasses[j].angVeloc = -30 + 60 * Math.random()  // deg/s
    }

    // Make some of the game masses dark brown!
    for (var i=0; i<9; i++) {
      j = Math.round(jMax * Math.random())
      gameMasses[i].graphics.main.fillStyle = "#553311"
      gameMasses[i].graphics.main.strokeStyle = "#331100"
      gameMasses[i].graphics.back.fillStyle = "#AA9988"
      gameMasses[i].graphics.back.strokeStyle = "#998877"
    }

    // Make some of the game masses gold!
    for (var i=0; i<3; i++) {
      j = Math.round(jMax * Math.random())
      gameMasses[i].graphics.main.fillStyle = "#888011"
      gameMasses[i].graphics.main.strokeStyle = "#552222"
      gameMasses[i].graphics.back.fillStyle = "#A8AA88"
      gameMasses[i].graphics.back.strokeStyle = "#999999"
    }

    // // Foreground / Main rendered at zoom = zoomOut = 1
    // gameMass.graphics.main = {}
    // gameMass.graphics.main.strokeStyle = "#440033"
    // gameMass.graphics.main.lineWidth = 3
    // gameMass.graphics.main.fillStyle = "#662A00"
    // // Background rendered at higher zoomOut > 1  (zoomOut = 1/zoom)
    // gameMass.graphics.back = {}
    // gameMass.graphics.back.zoomOut = 1.1
    // gameMass.graphics.back.strokeStyle = "#775500"
    // gameMass.graphics.back.lineWidth = 2
    // gameMass.graphics.back.fillStyle = "#997700"

    // // Make some of the game masses brown colours!
    // var moveIndices = [2, 5, 7, 12, 15, 16, 17, 18]
    // for (var i of moveIndices) {
    //   j =
    //   gameMasses[i].graphics.main.fillStyle = "#990044"
    //   gameMasses[i].graphics.main.strokeStyle = "#882200"
    //   gameMasses[i].graphics.back.fillStyle = "#779900"
    //   gameMasses[i].graphics.back.strokeStyle = "#008888"
    // }
    //
    // // Make some of the game masses gold colours!
    // var moveIndices = [2, 5, 7, 12, 15, 16, 17, 18]
    // for (var i of moveIndices) {
    //   gameMasses[i].graphics.main.fillStyle = "#990044"
    //   gameMasses[i].graphics.main.strokeStyle = "#882200"
    //   gameMasses[i].graphics.back.fillStyle = "#779900"
    //   gameMasses[i].graphics.back.strokeStyle = "#008888"
    // }


    // Make the game player
    var theJetman = addNewRandomGameMass(canvasCentre.x, canvasCentre.y, 5, 41, 41)
    theJetman.angleRadii[1][1]=13
    theJetman.angleRadii[2][1]=23
    theJetman.angleRadii[3][1]=23
    theJetman.angleRadii[4][1]=13
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

    // DO AFTER ALL MASSES CREATED
    // Use automation on Jetman, Masses, etc to finish setting up game masses
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
    state.htmlElements.fuel = document.querySelector("#fuel-left")

    // Special variables
    state.fuel = 100
    // state.health = 100  // Future iterations!
    // state.ammo = 1000
    // state.money = 0
    state.gravity = -120    // (Pixels per second per second!)

    // Store them all in the state
    state.timing = timing
    state.canvas = canvas
    state.context = context
    state.masses = gameMasses
    state.view = view
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
