var DummyClass = require('../dummy_class')
var assert = require('assert')

describe('DummyClass', function(){
  var theObject

  beforeEach(function(){
    theObject = new DummyClass({
      name: "I'm a dummy"
    })
  })

  it('should have name', function(){
    assert.equal(theObject.name, "I'm a dummy")
  })
})
