var fs = require("fs")
var Promise = require('es6-promise').Promise
var MochaPromise = require("mocha-as-promised")();

var db_file = "kautschbank2.sqlite";
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(db_file);

var sprintf = require("sprintf").sprintf

var chai = require('chai');
var chaiHttp = require('chai-http');

var expect = require('chai').expect
var uid_new = -1

chai.use(chaiHttp);

var port = "3300"
var host = sprintf("http://localhost:%s","3300");
var url_falsch = "falsch"
var url_port_falsch = sprintf("%s:%s",url_falsch,port);
var host_falsch = sprintf("http://%s",url_port_falsch);
var path = "/api/game";
var path2 = "/api/db/KGame"

var new_name = "tester"
var name_updated = "tester2"

// read mock data
// *****************************************************************************
var mock_create_database = undefined
var mock_initial_data = undefined
var mock_data = undefined

/*
describe('prepare DB', function() {
	this.timeout(15000);
	it('[mock] create database scriped loaded', function(done) {
    fs.readFile("test/mock/mock_create_database.sql", 'utf-8', function(err, content) {
			if(!err) {
				mock_create_database=content
	    	done()
			} else {
				console.log(err)
				done()
			}
    })
  })
	it('[mock] initial data scriped loaded', function(done) {
		fs.readFile("test/mock/mock_initial_data.sql", 'utf-8', function(err, content) {
			if(!err) {
				mock_initial_data=content
				done()
			} else {
				console.log(err)
				done()
			}
		})
	})
	it('[mock] mock data scriped loaded', function(done) {
		fs.readFile("test/mock/mock_data.sql", 'utf-8', function(err, content) {
			if(!err) {
				mock_data=content
				done()
			} else {
				console.log(err)
				done()
			}
		})
	})
	it('[mock] create database', function(done) {
		db.exec(mock_create_database, function(err) {
			if(!err) {
				done()
			} else {
				console.log(err)
				done()
			}
		})
	})
	it('[mock] create initial data', function(done) {
		db.exec(mock_initial_data, function(err) {
			if(!err) {
				done()
			} else {
				console.log(err)
				done()
			}
		})
	})
	it('[mock] create mock data', function(done) {
		db.exec(mock_data, function(err) {
			if(!err) {
				done()
			} else {
				console.log(err)
				done()
			}
		})
	})
})
*/

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
			expect(response.body["code"]).to.equal(800);
	    done();
	  })
	});

	it('attribute not exist', function(done) {
		create_object(done,host,path,type,{Name: new_name,wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(200);
			done();
		})
	});
	//TODO: string length tests !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// positiv test
	// ---------------------------------------------------------------------------
	// to test FK
	it('Add GameVersion to Game with one optional attribute and two unfilled attributes', function(done) {
		var tag_path="/api/gameversion"

		chai
		.request(host)
		.post(tag_path)
		.set('content-type', 'application/x-www-form-urlencoded')
		.send({Name:'test',SystemUID:'000001:0015:000001',IsAlwaysShow:true})
		.end(function(error, response, body) {
			if (error) {
					done(error);
				} else {
					expect(response.statusCode).to.equal(200)
					uid_gameversion_new = response.body.uid
					console.log(uid_gameversion_new)
					done();
				}
		});
	});

	it('Create Game', function(done) {
	  chai
	  .request(host)
	  .post(path + "/" + type)
	  .set('content-type', 'application/json')
	  .send({Name: 'new_name',DefaultVersionUID:uid_gameversion_new})
	  .end(function(error, response, body) {
	    if (error) {
	      done(error);
	    } else {
			  expect(response.statusCode).to.equal(200)
	      uid_new = response.body.uid
	      done();
	    }
	  });
	});

	it('Add Tag to Game', function(done) {
	  var tag_path="/api/object2tag"

	  chai
	  .request(host)
	  .post(tag_path)
	  .set('content-type', 'application/x-www-form-urlencoded')
	  .send({ObjectUID: uid_new,TagUID:'000001:0016:000001'})
	  .end(function(error, response, body) {
	    if (error) {
	        done(error);
	      } else {
				  expect(response.statusCode).to.equal(200)
	        uid_object2tag_new = response.body.uid
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
	  update_object(done,host_falsch,path,type,uid_new,{},test = function(done,response) {
	    expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
	    done();
	  })
	});

	it('wrong path', function(done) {
	  update_object(done,host,path_falsch,type,uid_new,{wrong:"wrong"},test = function(done,response) {
	    expect(response.statusCode).to.equal(404);
	    done();
	  })
	});

	it('wrong type', function(done) {
	  update_object(done,host,path,type_falsch,uid_new,{wrong:"wrong"},test = function(done,response) {
	    expect(response.statusCode).to.equal(404);
	    done();
	  })
	});

	it('id does not exists', function(done) {
	  update_object(done,host,path,type,id_falsch,{Name: "wrong"},test = function(done,response) {
	    expect(response.statusCode).to.equal(400);
			expect(JSON.parse(response.error.text)["code"]).to.equal(200);
	    done();
	  })
	});

	// negativ content tests
	// ---------------------------------------------------------------------------
	it('mandatory attribut not set', function(done) {
	  update_object(done,host,path,type,uid_new,{wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(422);
			expect(response.body["code"]).to.equal(800);
	    done();
	  })
	});

	it('attribute not exist', function(done) {
		update_object(done,host,path,type,uid_new,{Name: "wrong", wrong: "wrong"},test = function(done,response) {
			expect(response.statusCode).to.equal(200);
			done();
		})
	});
	//TODO: string length tests !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	// positiv tests
	// ---------------------------------------------------------------------------
	it('Update Game', function(done) {
	  chai
	  .request(host)
	  .put(path + "/" + type + "/" + uid_new)
	  .set('content-type', 'application/x-www-form-urlencoded')
	  .send({Name: name_updated})
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
	var type = "game"

	it('wrong path', function(done) {
		chai
		.request(host)
		.get("/api/db/searchf/KGame?offset=0")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(414)
			done();
		});
	});

	it('wrong type', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGamef?offset=0")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(414)
			done();
		});
	});

	// offset tests
	// ---------------------------------------------------------------------------
	it('offset is negativ', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=-3")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(400)
			done();
		});
	});

	it('offset is higher than the amount of data', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?limit=1&offset=3333")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(412);
			done();
		});
	});

	it('Offset is not a number', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=drei")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(401);
			done();
		});
	});

	it('offset only', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=2")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(500)
	    expect(response.body['code']).to.equal(902)
			done();
		});
	});

	// limit tests
	// ---------------------------------------------------------------------------
	it('limit is negativ', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=0&limit=-3")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(403);
			done();
		});
	});

	it('limit is 0', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=0&limit=0")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(402);
			done();
		});
	});

	it('limit is not a number', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=0&limit=drei")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(404);
			done();
		});
	});

	// TODO: Werte korrect berechnen
	it('limit + offset is higher than the amount of data', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=15&limit=1125")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(413);
			done();
		});
	});

	it('limit is highter than the amount of data', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=0&limit=100000")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(413);
			done();
		});
	});

	// order by tests
	// ---------------------------------------------------------------------------
	it('order by column that does not exists', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?orderby=unknown")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(500)
	    expect(response.body['code']).to.equal(902)
			done();
		});
	});

	it('one order by column does not exists', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?orderby=name,unknown")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(500)
	    expect(response.body['code']).to.equal(902)
			done();
		});
	});

	// order direction tests
	// ---------------------------------------------------------------------------
	it('only order direction, witout order', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?order_direction=asc")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(417)
			done();
		});
	});

	it('direction is neither asc nor desc', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?orderby=name&order_direction=unknown")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(500)
	    expect(response.body['code']).to.equal(902)
			done();
		});
	});

	// filter tests
	// ---------------------------------------------------------------------------

	it('not 3 dividers', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where;name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(405);
			done();
		});
	});

	it('operand is empty', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=|name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(408);
			done();
		});
	});

	it('column is empty', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where||eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(409);
			done();
		});
	});

	it('compare is empty', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name||'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(410);
			done();
		});
	});

	it('value is empty', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(411);
			done();
		});
	});

	it("operand is neither 'where','and' nor 'or'", function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=false|name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(408);
			done();
		});
	});

	it("operand is 'and' or 'or' but it's the first filter", function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=and|name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(406);
			done();
		});
	});

	it("operand is 'where' but its not the first filter", function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester';where|name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(407);
			done();
		});
	});

	it('column does not exists', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|namef|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(418)
			done();
		});
	});

	it("compare is neither 'eq' nor 'in'", function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|neq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(410);
			done();
		});
	});

	it('value is not the same type (string,int)', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|rowid|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.equal(0);
			done();
		});
	});

	it('value is not the same type (int,string)', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|5")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.equal(0);
			done();
		});
	});

	it("string value missing '", function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(500)
	    expect(response.body['code']).to.equal(903)
			done();
		});
	});

	it('semicolon without another filter', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester';")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(405);
			done();
		});
	});

	it('% in like (correct would be ?)', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|like|'%tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(400)
			expect(response.body['code']).to.equal(405);
			done();
		});
	});

	// TODO: Cross Site Scripting

	// positiv tests
	// ---------------------------------------------------------------------------

	it('filter is empty', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);

			var found = false
			for(i=0;i<response.body.data.length;i++) {
				if(response.body.data[i].Name == name_updated) {
					found = true
				}
			}
			expect(found).to.equal(true);

			done();
		});
	});

	it('one filter', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester'")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('two filters', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester';and|uid|like|('000001?')")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('limit only', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?limit=2")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('offset and limit', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?offset=10&limit=10")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('order only', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?orderby=name")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('order by column is used more than once', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?orderby=name,name")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('filter,offset,limit', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester'&offset=2&limit=2")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('filters,offset,limit,order', function(done) {
		chai
		.request(host)
		.get("/api/db/search/KGame?filter=where|name|eq|'tester'&offset=2&limit=2&orderby=name&order_direction=asc")
		.set('content-type', 'application/json')
		.end(function(error, response, body) {
			expect(response.statusCode).to.equal(200)
			expect(response.body['amount']).to.be.greaterThan(0);
			done();
		});
	});

	it('Get List of wrong type', function(done) {
	  chai
	  .request(host)
		.get("/api/db/search/KGamef")
	    .set('content-type', 'application/json')
	  .end(function(error, response, body) {
	    expect(error).to.not.equal(null);
	    expect(response.statusCode).to.equal(400)
	    expect(response.body['code']).to.equal(414)
	    done();
	  });
	});

	// positiv single test
	// ---------------------------------------------------------------------------
	it('Get game by id but id does not exist', function(done) {
	  chai
	  .request(host)
	  .get(path2 + "/-1")
	  .set('content-type', 'application/json')
	  .end(function(error, response, body) {
	    expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(419);
			done();
	  });
	});

	it('Get wrong type', function(done) {
	  chai
	  .request(host)
	  .get(path2 + "f/'" + uid_new + "'")
	  .set('content-type', 'application/json')
	  .end(function(error, response, body) {
	    expect(response.statusCode).to.equal(400);
	    expect(response.body['code']).to.equal(414);
	    done();
	  });
	});

	it('Get game by id', function(done) {
	  chai
	  .request(host)
	  .get(path2 + "/'" + uid_new+"'")
	  .set('content-type', 'application/json')
	  .end(function(error, response, body) {
	    if (error) {
	      done(error);
	    } else {
	      expect(response.statusCode).to.equal(200)
	      expect(response.body.data.length).to.equal(1)
	      expect(response.body.data[0].Name).to.equal(name_updated)
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
var fk_type = "KGameVersion"
var type_falsch = "KGamef"
var id_falsch = "-1"

beforeEach(function(done) {
  expect(uid_new).to.not.equal(-1)
  expect(uid_object2tag_new).to.not.equal(-1)
  done()
});

it('wrong host', function(done) {
  delete_object(done,host_falsch,path,type,uid_new,test = function(done,response) {
    expect(response.toString()).to.equal(sprintf("Error: getaddrinfo ENOTFOUND %s %s",url_falsch,url_port_falsch));
    done();
  })
});

it('wrong path', function(done) {
  delete_object(done,host,path_falsch,type,uid_new,test = function(done,response) {
    expect(response.statusCode).to.equal(404);
		done();
  })
});

it('wrong type', function(done) {
  delete_object(done,host,path,type_falsch,uid_new,test = function(done,response) {
    expect(response.statusCode).to.equal(400);
    expect(response.body['code']).to.equal(300);
    done();
  })
});

it('id does not exists', function(done) {
  delete_object(done,host,path,type,id_falsch,test = function(done,response) {
    expect(response.statusCode).to.equal(400);
    expect(response.body['code']).to.equal(302);
    done();
  })
});


/* Error??? Does not work
it('FK Error', function(done) {
  delete_object(done,host,path,fk_type,uid_gameversion_new,test = function(done,response) {
    expect(response.statusCode).to.equal(400);
    expect(response.body['code']).to.equal(301);
    done();
  })
})
*/


it('Delete Game', function(done) {
  delete_object(done,host,path,"KObject2tag",uid_object2tag_new,test = function(done,response) {
    expect(response.statusCode).to.equal(200);
    expect(response.body['code']).to.equal(0);

		delete_object(done,host,path,"KGameVersion",uid_gameversion_new,test = function(done,response) {
	    expect(response.statusCode).to.equal(200);
	    expect(response.body['code']).to.equal(0);

    	delete_object(done,host,path,type,uid_new,test = function(done,response) {
      	expect(response.statusCode).to.equal(200);
      	expect(response.body['code']).to.equal(0);
      	done();
    	})
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

function delete_object(done,host,path,type,uid,test) {
chai
	.request(host)
	.delete(path + "/" + type + "/" + uid.toString())
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
describe('UUID', function() {
var path = "/api/uuid";

it('Get UUID', function(done) {
  chai
  .request(host)
  .get(path)
  .set('content-type', 'application/json')
  .end(function(error, response, body) {
    if (error) {
      done(error);
    } else {
      expect(response.statusCode).to.equal(200)
			expect(response.body.uuid).to.be.a('string');
			expect(response.body.uuid).to.not.be.null;
      done();
    }
  });
})
})

// post /engine/upload/:uuid

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
// TagAndPicture  TBD: TaggedPicture -> get .../????
// =============================================================================
// post /tagandpicture
// get /tagandpicture
// get /tagandpicture/:id
// delete /tagandpicture/:id
// get /tagandpicture/count/:id_game/:pattern ??
// get /tagandpicture/:offset/:limit/id_game/:filter ??
// get /tagandpicture/search/:filters/:pattern ??

/*
	db.exec(mock_initial_data, function(err) {
		if(err) {
			console.log(err)
		} else {
			console.log("[mock] initial data imported")

			db.exec(mock_data, function(err) {
				if(err) {
					console.log(err)
				} else {
					console.log("[mock] mock data imported")
				}
			});
		}
	});
*/
