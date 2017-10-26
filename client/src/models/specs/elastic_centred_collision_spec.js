var elasticCollision = require('../elastic_collision')
var assert = require('assert')

describe('elasticCollision', function(){
  var theObject

  beforeEach(function(){
    // theObject = new elasticCollision({
    //   name: "I'm a dummy"
    // })
  })

  it('can call', function(){
    assert.equal(elasticCollision(), 1)
  })
})
