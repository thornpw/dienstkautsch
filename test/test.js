var sprintf = require("sprintf").sprintf

var chai = require('chai');
var chaiHttp = require('chai-http');

var expect = require('chai').expect
var id_new = -1

chai.use(chaiHttp);

var port = "3000"
var host = sprintf("http://localhost:%s","3000");
var url_falsch = "falsch"
var url_port_falsch = sprintf("%s:%s",url_falsch,port);
var host_falsch = sprintf("http://%s",url_port_falsch);
var path = "/api/game";
var path2 = "/api/db/KGame"

var new_name = "tester"
var name_updated = "tester2"

// Create tests
// *****************************************************************************
describe('Game Rest Services Create', function() {
	var path = "/api";
  var path_falsch = "/apif"
	var type = "game"
	var type_falsch = "gamef"

	// negativ url tests
	// ---------------------------------------------------------------------------
	it('wrong host', function(done) {
    create_object(done,host_falsch,path,type,{},test = function(done,response) {
      expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
      done();
    })
  });

  it('wrong path', function(done) {
    create_object(done,host,path_falsch,type,{wrong:"wrong"},test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });

	it('wrong type', function(done) {
    create_object(done,host,path,type_falsch,{wrong:"wrong"},test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });

	// negativ content tests
	// ---------------------------------------------------------------------------
	it('mandatory attribut not set', function(done) {
    create_object(done,host,path,type,{wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(422);
			expect(JSON.parse(response.error.text)["status"]).to.equal(800);
      done();
    })
  });

	// TODO: nicht wichtig !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	it('attribute not exist', function(done) {
		create_object(done,host,path,type,{name: new_name,wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(200);
			done();
		})
	});
	//TODO: string length tests !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// positiv test
	// ---------------------------------------------------------------------------
	it('Create Game', function(done) {
    chai
    .request(host)
    .post(path + "/" + type)
    .set('content-type', 'application/json')
    .send({name: new_name})
    .end(function(error, response, body) {
      if (error) {
        done(error);
      } else {
			  expect(response.statusCode).to.equal(200)
        id_new = response.body.id
        done();
      }
    });
	});

  it('Add Tag to Game', function(done) {
    var tag_path="/api/game2tag"

    chai
    .request(host)
    .post(tag_path)
    .set('content-type', 'application/x-www-form-urlencoded')
    .send({id_game: id_new,id_tag:2})
    .end(function(error, response, body) {
      if (error) {
          done(error);
        } else {
				  expect(response.statusCode).to.equal(200)
          id_game2tag_new = response.body.id
          done();
        }
    });
	});
});

// Game update tests
// *****************************************************************************
describe('Game Rest Services Update', function() {
	var path = "/api";
  var path_falsch = "/apif"
	var type = "game"
	var type_falsch = "gamef"
	var id_falsch = -1

	// negativ url tests
	// ---------------------------------------------------------------------------
	it('wrong host', function(done) {
    update_object(done,host_falsch,path,type,id_new,{},test = function(done,response) {
      expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
      done();
    })
  });

  it('wrong path', function(done) {
    update_object(done,host,path_falsch,type,id_new,{wrong:"wrong"},test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });

	it('wrong type', function(done) {
    update_object(done,host,path,type_falsch,id_new,{wrong:"wrong"},test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });

	it('id does not exists', function(done) {
    update_object(done,host,path,type,id_falsch,{name: "wrong"},test = function(done,response) {
      expect(response.statusCode).to.equal(400);
      done();
    })
  });

	// negativ content tests
	// ---------------------------------------------------------------------------
	it('mandatory attribut not set', function(done) {
    update_object(done,host,path,type,id_new,{wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(422);
			expect(JSON.parse(response.error.text)["status"]).to.equal(800);
      done();
    })
  });

	// TODO: nicht wichtig !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	it('attribute not exist', function(done) {
		update_object(done,host,path,type,id_new,{name: "wrong", wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(200);
			done();
		})
	});
	//TODO: string length tests !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// positiv tests
	// ---------------------------------------------------------------------------
  it('Update Game', function(done) {
		console.log("update_id:"+id_new)
    chai
    .request(host)
    .put(path + "/" + type + "/" + id_new)
    .set('content-type', 'application/x-www-form-urlencoded')
    .send({name: name_updated})
    .end(function(error, response, body) {
      if (error) {
        done(error);
      } else {
			  expect(response.statusCode).to.equal(200)
        done();
      }
    });
	});
});

// Game read tests
// *****************************************************************************
// syntax...............: /api/db/:{type}?{query}
// method...............: GET
// query parameters.....:	filter
//												offset {int}
//												limit {int}
//												order by {column[;]}*
//												order direction {asc|desc}
// type.................: {VIEW|TABLE}
// filter...............:	{"where|column|compare|[']value[']"[;]}{"operand|column|compare|[']value[']"[;]}*
// operand..............: {and|or}
// compare..............: {eq|in}
describe('Game Rest Services Read', function() {
	var path = "/api";
  var path_falsch = "/apif"
	var type = "game"
	var type_falsch = "gamef"
	var id_falsch = -1

	// negativ url tests
	// ---------------------------------------------------------------------------
	/*it('wrong host', function(done) {
    search_object(done,host_falsch,path,type,"",test = function(done,response) {
      expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
      done();
    })
  });

  it('wrong path', function(done) {
    search_object(done,host,path_falsch,type,"",test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });

	it('wrong type', function(done) {
    search_object(done,host,path,type_falsch,"",test = function(done,response) {
      expect(response.statusCode).to.equal(404);
      done();
    })
  });*/

	// offset tests
	// ---------------------------------------------------------------------------
	it('offset is negativ', function(done) {
	});

	it('offset is highter than the amount of data', function(done) {
	});

	it('Offset is not a number', function(done) {
	});

	// limit tests
	// ---------------------------------------------------------------------------
	it('limit is negativ', function(done) {
	});

	it('limit is 0', function(done) {
	});

	it('limit is highter than the amount of data', function(done) {
	});

	it('limit is not a number', function(done) {
	});

	it('limit + offset is hight than the amount of data', function(done) {
	});

	// order by tests
	// ---------------------------------------------------------------------------
	it('order by column does not exists', function(done) {
	});

	it('one order by column does not exists', function(done) {
	});

	it('order by column is used more than once', function(done) {
	});

	// order direction tests
	// ---------------------------------------------------------------------------
	it('only order direction, witout order', function(done) {
	});

	it('direction is neither asc nor desc', function(done) {
	});

	// filter tests
	// ---------------------------------------------------------------------------
	it('operand is empty', function(done) {
	});

	it('column is empty', function(done) {
	});

	it('compare is empty', function(done) {
	});

	it('value is empty', function(done) {
	});

	it("operand is neither 'where','and' nor 'or'", function(done) {
	});

	it("operand is 'and' or 'or' but it's the first filter", function(done) {
	});

	it("operand is 'where' but its not the first filter", function(done) {
	});

	it('column does not exists', function(done) {
	});

	it("compare is neither 'eq' nor 'in'", function(done) {
	});

	it('value is not the same type (string,int)', function(done) {
	});

	it('value is not the same type (int,string)', function(done) {
	});

	it("string value missing '", function(done) {
	});

	it('semicolon without another filter', function(done) {
	});

  // TODO: Cross Site Scripting

	// positiv tests
	// ---------------------------------------------------------------------------
	it('filter is empty', function(done) {
	});

	it('one filter', function(done) {
	});

	it('two filters', function(done) {
	});

	it('offset only', function(done) {
	});

	it('limit only', function(done) {
	});

	it('offset and limit', function(done) {
	});

	it('order only', function(done) {
	});

	it('filter,offset,filter', function(done) {
	});

	it('filters,offset,filter,order', function(done) {
	});

	it('Get List of wront type', function(done) {
    chai
    .request(host)
    .get(path2+"f")
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      expect(error).to.not.equal(null);
      expect(response.statusCode).to.equal(400)
      expect(response.body['status']).to.equal(2)
      done();
    });
  });

  it('Get List of Games', function(done) {
    chai
    .request(host)
    .get(path2)
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      if (error) {
        done(error);
      } else {
				expect(response.statusCode).to.equal(200)

        var found = false
        for(i=0;i<response.body.length;i++) {
          if(response.body[i].name == name_updated) {
            found = true
          }
        }
        expect(found).to.equal(true);
        done();
      }
    });
  });

  // positiv test
  // ---------------------------------------------------------------------------
  it('Get filtered and sliced List of Games', function(done) {
    chai
    .request(host)
    .get(path2)
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      if (error) {
        done(error);
      } else {
				expect(response.statusCode).to.equal(200)

        var found = false
        for(i=0;i<response.body.length;i++) {
          if(response.body[i].name == name_updated) {
            found = true
          }
        }

        expect(found).to.equal(true);
        done();
      }
    });
  });

  it('Get game by id but id does not exist', function(done) {
    chai
    .request(host)
    .get(path2 + "/-1")
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      expect(error).to.not.equal(null);
      expect(response.statusCode).to.equal(400);
      expect(response.body['status']).to.equal(1);
      done();
    });
  });

  it('Get wrong type', function(done) {
    chai
    .request(host)
    .get(path2 + "f/" + id_new)
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      expect(error).to.not.equal(null);
      expect(response.statusCode).to.equal(400);
      expect(response.body['status']).to.equal(2);
      done();
    });
  });

  it('Get game by id', function(done) {
		console.log("hier:"+id_new)
    chai
    .request(host)
    .get(path2 + "/" + id_new)
    .set('content-type', 'application/json')
    .end(function(error, response, body) {
      if (error) {
        done(error);
      } else {
        expect(response.statusCode).to.equal(200)
        expect(response.body.length).to.equal(1)
        expect(response.body[0].name).to.equal(name_updated)
        done();
      }
    });
  });
});

// Game delete tets
// *****************************************************************************
describe('Game Rest Services D', function() {
  var path = "/api/db";
  var path_falsch = "/api/dbf/Game"
  var type = "KGame"
  var type_falsch = "KGamef"
  var id_falsch = "-1"

  beforeEach(function(done) {
    expect(id_new).to.not.equal(-1)
    expect(id_game2tag_new).to.not.equal(-1)
    done()
  });

  it('wrong host', function(done) {
    delete_object(done,host_falsch,path,type,id_new,test = function(done,response) {
      expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
      done();
    })
  });

  it('wrong path', function(done) {
    delete_object(done,host,path_falsch,type,id_new,test = function(done,response) {
      expect(response.statusCode).to.equal(404);
			done();
    })
  });

  it('wrong type', function(done) {
    delete_object(done,host,path,type_falsch,id_new,test = function(done,response) {
      expect(response.statusCode).to.equal(400);
      expect(response.body['status']).to.equal(2);
      done();
    })
  });

  it('id does not exists', function(done) {
    delete_object(done,host,path,type,id_falsch,test = function(done,response) {
      expect(response.statusCode).to.equal(400);
      expect(response.body['status']).to.equal(1);
      done();
    })
  });

  it('FK Error', function(done) {
    delete_object(done,host,path,type,id_new,test = function(done,response) {
      expect(response.statusCode).to.equal(400);
      expect(response.body['status']).to.equal(3);
      done();
    })
  })

  it('Delete Game', function(done) {
    delete_object(done,host,path,"KGame2Tag",id_game2tag_new,test = function(done,response) {
      expect(response.statusCode).to.equal(200);
      expect(response.body['status']).to.equal(0);

      delete_object(done,host,path,type,id_new,test = function(done,response) {
        expect(response.statusCode).to.equal(200);
        expect(response.body['status']).to.equal(0);
        done();
      })
    });
  });
});

// Utilities
// =============================================================================
function create_object(done,host,path,type,content,test) {
  chai
  .request(host)
  .post(path + "/" + type)
  .set('content-type', 'application/json')
	.send(content)
  .end(function(error, response,body) {
    var ret = response;

    if (error) {
      if(error.response) {
        ret = error.response;
      } else {
        ret = error
      }
    }
    test(done,ret)
  });
}

function update_object(done,host,path,type,id,content,test) {
  chai
  .request(host)
  .put(path + "/" + type + "/" + id.toString())
  .set('content-type', 'application/json')
	.send(content)
  .end(function(error, response,body) {
    var ret = response;

    if (error) {
      if(error.response) {
        ret = error.response;
      } else {
        ret = error
      }
    }
    test(done,ret)
  });
}

function delete_object(done,host,path,type,id,test) {
  chai
  .request(host)
  .delete(path + "/" + type + "/" + id.toString())
  .set('content-type', 'application/json')
  .end(function(error, response) {
    var ret = response;

    if (error) {
      if(error.response) {
        ret = error.response;
      } else {
        ret = error
      }
    }
    test(done,ret)
  });
}

// =============================================================================
// UUID
// =============================================================================
// get /uuid

// =============================================================================
// Engine
// =============================================================================
// post /engine
// get /engine

// get /engine/:id
// put /engine/:id
// delete /engine/:id
// get /engine/count/:pattern
// get /engine/:offset/:limit/:filter
// post /engine/upload/:uuid

// =============================================================================
// System
// =============================================================================
// post /system
// get /system
// get /system/:id
// put /system/:id
// delete /system/:id
// get /system/count/:pattern
// get /system/search/:filters/:patterns
// get /system/:offset/:limit/:filter

// =============================================================================
// Engine_configuration
// =============================================================================
// post /engine_configuration
// get /engine_configuration
// get /engine_configuration/:id
// put /engine_configuration/:id
// delete /engine_configuration/:id
// get /engine_configuration/count/:pattern
// get /engine_configuration/:offset/:limit/:filter
// get /engine_configuration/search/:pattern

// =============================================================================
// Publisher
// =============================================================================
// post /publisher
// get /publisher
// get /publisher/:id
// put /publisher/:id
// delete /publisher/:id
// get /publisher/count/:pattern
// get /publisher/:offset/:limit/:filter
// get /publisher/search/:pattern

// =============================================================================
// Tag_category
// =============================================================================
// post /tag_category
// get /tag_category
// get /tag_category/:id
// put /tag_category/:id
// delete /tag_category/:id
// get /tag_category_count/:filters/:pattern
// get /tag_category/:offset/:limit/:filter/:patterns
// get /tag_category/search/:pattern

// =============================================================================
// Tag
// =============================================================================
// post /tag
// get /tag
// get /tag/:id
// put /tag/:id
// delete /tag/:id
// get /tag/count/:pattern
// get /tag/:offset/:filters/:patterns
// get /tag/:offset/:limit/:filter

// =============================================================================
// Engine_file
// =============================================================================
// post /engine_file
// get /engine_file
// get /engine_file/:id
// put /engine_file/:id
// delete /engine_file/:id
// get /engine_file/count/:pattern
// get /engine_file/:offset/:limit/:filter
// get /engine_file/search/:pattern

// =============================================================================
// Game_file
// =============================================================================
// post /game_file
// get /game_file
// get /game_file/:id
// put /game_file/:id
// delete /game_file/:id
// get /game_file/count/:pattern
// get /game_file/:offset/:limit/:filter
// get /game_file/search/:pattern

// =============================================================================
// Game
// =============================================================================
// post /game
// get /game
// get /game/:id
// put /game/:id
// delete /game/:id
// get /game/count/:pattern
// get /game/:offset/:limit/:filter
// get /game/search/:pattern

// =============================================================================
// Pictures
// =============================================================================
// post /picture
// get /picture
// get /picture/:id
// put /picture/:id
// delete /picture/:id
// get /picture/count/:pattern
// get /picture/:offset/:limit/:filter
// get /picture/search/:pattern
// post /picture/upload/:uuid

// =============================================================================
// Game2Tag TBD: more generic
// =============================================================================
// post /game2tag
// get /game2tag
// get /game2tag/:id
// delete /game2tag/:id
// get /game2tag/count/:id_game/:pattern
// get /game2tag/:offset/:limit/:id_game/:filter'
// get /game2tag/search/:filters/:patterns

// =============================================================================
// TagAndPicture  TBD: TaggedPicture -> get .../????
// =============================================================================
// post /tagandpicture
// get /tagandpicture
// get /tagandpicture/:id
// delete /tagandpicture/:id
// get /tagandpicture/count/:id_game/:pattern ??
// get /tagandpicture/:offset/:limit/id_game/:filter ??
// get /tagandpicture/search/:filters/:pattern ??
