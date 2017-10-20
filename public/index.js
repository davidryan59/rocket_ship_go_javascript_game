var app = function(){
  var frameRateDisplay = document.querySelector("#frame-rate")
  var canvas = document.querySelector("#main-canvas")
  var context = canvas.getContext('2d')
  context.strokeStyle = "black"
  context.lineWidth = 1
  context.fillStyle = "darkgrey"

  var posX = 300  // boundLeft+margin
  var posY = 200 //boundDown-margin
  var stepSize = 10

  var boundLeft = 0
  var boundRight = 600
  var boundUp = 0
  var boundDown = 400
  var margin = 10

  var boundLeftM = boundLeft+margin
  var boundRightM = boundRight-margin
  var boundUpM = boundUp+margin
  var boundDownM = boundDown-margin

  var drawButton = function(x, y, r){
    context.beginPath()
    context.moveTo(x, y) //+r)
    context.arc(x, y, r, 0, Math.PI*2)
    context.fill()
  }

  var drawButtons = function(){
    var buttonRadius = 50
    drawButton(boundLeftM+buttonRadius, boundDownM-buttonRadius, buttonRadius)
    drawButton(boundRightM-buttonRadius, boundDownM-buttonRadius, buttonRadius)
  }

  var updateDisplayedVariables = function(){
    stepSizeDisplay.innerText = Math.round(stepSize*10)/10
    xDisplay.innerText = Math.round(posX*10)/10
    yDisplay.innerText = Math.round(posY*10)/10
  }

  var drawLine = function(dx, dy){
    context.beginPath()
    context.moveTo(posX, posY)
    posX += dx
    posY += dy
    posX<boundLeftM ? posX=boundLeftM : null
    posX>boundRightM ? posX=boundRightM : null
    posY<boundUpM ? posY=boundUpM : null
    posY>boundDownM ? posY=boundDownM : null
    context.lineTo(posX, posY)
    context.stroke()
  }

  var clearAndRedrawCanvas = function(){
    context.clearRect(boundLeft, boundUp, boundRight-boundLeft, boundDown-boundUp)
    drawButtons()
  }

  clearAndRedrawCanvas()
  updateDisplayedVariables()

  window.addEventListener('keydown', function(event){
    var code = event.code
    console.log(code)
    switch(code){
      case "ArrowUp":
        drawLine(0, -stepSize)
        break
      case "ArrowDown":
        drawLine(0, +stepSize)
        break
      case "ArrowLeft":
      case "KeyT":
        drawLine(-stepSize, 0)
        break
      case "ArrowRight":
      case "KeyU":
        drawLine(stepSize, 0)
        break
      case "Digit6":
        drawLine(-0.5*stepSize, -0.866*stepSize)
        break
      case "Digit7":
        drawLine(0.5*stepSize, -0.866*stepSize)
        break
      case "KeyG":
        drawLine(-0.5*stepSize, 0.866*stepSize)
        break
      case "KeyH":
        drawLine(0.5*stepSize, 0.866*stepSize)
        break
      case "KeyZ":
        stepSize /= 1.5
        break
      case "KeyX":
        stepSize *= 1.5
        break
      case "KeyY":
        var dx = 3 * stepSize * (Math.random()-0.5)
        var dy = 3 * stepSize * (Math.random()-0.5)
        drawLine(dx, dy)
        break
      case "Space":
        clearAndRedrawCanvas()
        break
    }
    updateDisplayedVariables()
  })
}

window.addEventListener('load', app)
