var playGame = function() {

  var state = {}


  var coordsGameToCanvas = function(gameCoordArray, canvasCoordArray) {
    // Use gameCoordArray and current game state
    // to recalculate and overwrite the viewCoords
    // Want the two arrays to be the same size
    // which is an array of size N, of arrays of size 2

    var viewMidX = state.view.pos.x
    var viewMidY = state.view.pos.y
    var viewZoom = state.view.zoom

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
      canvasX = canvasMidX + viewZoom*(gameX-viewMidX)    // Game coords start in bottom left, but
      canvasY = canvasMidY - viewZoom*(gameY-viewMidY)    // Canvas coords start in top left
      canvasCoord = [canvasX, canvasY]
      canvasCoordArray[i] = canvasCoord
    }
  }

  var updateViewPoints = function() {
    coordsGameToCanvas(state.points.inGame, state.points.toCanvas)
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
    var prevU = state.view.vel.u    // Pixels per second
    var prevV = state.view.vel.v    // Pixels per second
    var grav = state.gravity        // Pixels per second per second
    var dT = state.timing.msBetweenLoops / 1000    // in seconds
    state.view.pos.x = prevX + prevU * dT
    state.view.pos.y = prevY + prevV * dT
    // state.view.vel.u = prevU + 0 * dT   // Currently does nothing
    state.view.vel.v = prevV + grav * dT
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

  var drawCanvas = function(){
    // Set up drawing
    var canvasLeft = state.canvas.bounds.left
    var canvasRight = state.canvas.bounds.right
    var canvasUp = state.canvas.bounds.up
    var canvasDown = state.canvas.bounds.down
    var context = state.context
    // Do drawing
    context.clearRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    drawLineSet(state.points.toCanvas)
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
    context.strokeStyle = "black"
    context.lineWidth = 1
    context.fillStyle = "white"
    var gamePoints = [
      [0, 0], [800, 0], [800, 600], [0, 600],
      [0, 10], [100, 110], [50, 300], [100, 500],
      [200, 550], [350, 500], [550, 550], [700, 500],
      [750, 400], [700, 350], [750, 150],
      [700, 100], [500, 150], [450, 50], [200, 120], [100, 100],
    ]
    var canvasPoints = gamePoints.slice()  // Copy of array, to overwrite
    var points = {inGame: gamePoints, toCanvas: canvasPoints}
    var gravity = -100    // (Pixels per second per second!)

    // Setup canvas variable
    var boundLeft = 0
    var boundRight = canvasElt.width
    var boundUp = 0
    var boundDown = canvasElt.height
    var canvasBounds = {left: boundLeft, right: boundRight, up: boundUp, down: boundDown}
    var canvasCentre = {x: (boundLeft+boundRight)/2, y: (boundUp+boundDown)/2}
    var canvas = {elt: canvasElt, bounds: canvasBounds, centre: canvasCentre}
    var view = {pos: {x: canvasCentre.x, y: canvasCentre.y}, vel: {u: -40, v: 50}, zoom: 1}
    // x, y are positions in pixels
    // u, v are velocities in pixels per second

    // Store them all in the state
    state.timing = timing
    state.canvas = canvas
    state.context = context
    state.points = points
    state.view = view
    state.gravity = gravity

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
    if (state.loopCount > 100) {
      // At the moment, just run the loop
      // a fixed number of times
      state.continueLooping = false
    }

    doTiming(timeLoopStart)
    updateViewCoords()
    updateViewPoints()
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
