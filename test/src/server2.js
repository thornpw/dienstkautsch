/** 2657
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// requirements
// =============================================================================
var fs = require("fs");
var file = "kautschbank.sqlite";
var exists = fs.existsSync(file);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

var winston = require('winston');
var path = require('path');

var sprintf = require("sprintf").sprintf
var vsprintf = require("sprintf").vsprintf

// express
// -----------------------------------------------------------------------------
var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var app = express();

// MySql connection
// -----------------------------------------------------------------------------
var connection  = require('express-myconnection');
var mysql = require('mysql');

// variables
// =============================================================================
var COMMENTS_FILE = path.join(__dirname, 'comments.json');

/*db.each("SELECT * FROM KTag", function(err, row) {
  console.log( row.UID);
});*/


// logging configuration
// =============================================================================
// two loggers:
// *****************************************************************************
// errors: everything with status > 200
// access: any status = 200
// =============================================================================

winston.loggers.add('logError', {
  console: {
    colorize: true,
  },
  file: {
    filename: 'error.log'
  }
});

winston.loggers.add('logAccess', {
  console: {
    colorize: true,
  },
  file: {
    level : 'debug',
    filename: 'access.log'
  }
});

winston.loggers.add('logDegug', {
  console: {
    colorize: true,
  },
  file: {
    level : 'debug',
    filename: 'debug.log'
  }
});

var logError = winston.loggers.get('logError')
var logAccess = winston.loggers.get('logAccess')

// app configureation
// =============================================================================
// Set EJS template Engine
// -----------------------------------------------------------------------------
//app.set('views','./views');
//app.set('view engine','ejs');

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator());

// Additional middleware which will set headers that we need on each request.
// -----------------------------------------------------------------------------
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

// configure MySQL connection
// -----------------------------------------------------------------------------
app.use(
    connection(mysql,{
        host     : 'localhost',
        user     : 'root',
        password : '',
        database : 'test',
        debug    : false //set true if you wanna see debug logger
    },'request')
);

// RESTful route
// =============================================================================
var router = express.Router();

//now we need to apply our router here
app.use('/api', router);

/*------------------------------------------------------
*  This is router middleware,invoked everytime
*  we hit url /api and anything after /api
*  we can use this for doing validation,authetication
*  for every route started with /api
--------------------------------------------------------*/
router.use(function(req, res, next) {
    console.log(req.method, req.url);
    next();
});

// =============================================================================
// Utilities
// =============================================================================
// general search
// *****************************************************************************
var kautschSearch = function(req,res,next,tablename) {
  var filter = '';
  var pattern = '';
  var where = '';

  if(!(req.params.filters == '-')) {
    var filters = req.params.filters.split("|");

    for(i=0;i<filters.length;i+=2) {
      if(i>0) {
        filter+= ' and ';
      }
      filter += filters[i*2] + "='" + filters[i*2+1] + "'";
      console.log(filter);
    }
  }
  if(!(req.params.patterns == '-')) {
    var patterns = req.params.patterns.split("|");

    for(i=0;i<patterns.length;i+=2) {
      if(i>0 || !(req.params.filters == '-')) {
        pattern+= ' and ';
      }
      pattern += patterns[i*2] + " like '%" + patterns[i*2+1] + "%'";
      console.log(pattern);
    }
  }

  if(!(filter == '' && pattern == '')) {
    where = 'where';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM %s %s %s %s",tablename,where,filter,pattern),function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }

        //if user not found
        if(rows.length < 1) {
          return res.json({'msg':'tag not found'});
        }
        console.log(rows);
        res.json(rows);
      });
    }
  });
};

// general validation
// *****************************************************************************
var general_validation = function(req,res,next) {
  var errors = req.validationErrors();
  if(errors){
    logError.error("422: " + errors)
    res.status(422)
    res.json({"status":800,'id':null,"errors":errors});
    return false
  }
  return true
}

// general CREATE
// *****************************************************************************
var general_create = function(req,res,tablename,data) {
  req.getConnection(function (err, conn){
    if (err) {
      logError.error("5001: " + err)
      res.status(500)
      res.json({'status':5001,id:null,'errors':err})
      return
    } else {
      var query_string =sprintf("INSERT INTO %s set ?",tablename);
      var query = conn.query(query_string,data, function(err, result){
        if(err){
          res.status(500)
          res.json({'status':900,'id':null,'errors':err})
          logError.error("500: " + err)
        };
        res.status(200);
        res.json({'status':0,'id':result.insertId,'errors':null});
      });
    }
  });
}

// general UPDATE
// *****************************************************************************
var general_update = function(req,res,tablename,data,id) {
  req.getConnection(function (err, conn){
    if (err) {
      res.status(500)
      res.json({'status':5001,'errors':err})
      logError.error("500: " + err)
      return
    }
    var query_string = sprintf("UPDATE %s SET ? WHERE id=%s",tablename,id)
    var query = conn.query(query_string,[data], function(err, rows){
      if(err){
        res.status(500)
        res.json({'status':900,'errors':err})
        logError.error("500: " + err)
        return
      };
      if(rows.affectedRows == 0) {
        logError.warn(sprintf("400: Object id:%s not found in %s:",id,tablename))
        res.status(400);
        res.json({'status':1,'errors':null})
        return;
      }
      res.status(200);
      res.json({'status':0,'errors':null})
    });
  });
}


// generic router
// =============================================================================
var database = router.route('/db/:type')

// generic get list
// *****************************************************************************
// output:
// -------
// status:  0: ok, object found
//          2: object type unknown
// *****************************************************************************
database.get(function(req,res,next){
  var type = req.params.type

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query_string = sprintf("SELECT * FROM %s",type)
      var query = conn.query(query_string,function(err,rows){
        if(err){
          if(err.errno==1146) {
            logError.warn("400: Object type unknown:" + query_string)
            res.status(400)
            res.json({'status':2})
          } else {
            res.status(500)
            logError.error("500: " + err)
          }
          return;
        }

        logAccess.debug("200: " + query_string)
        res.status(200)
        res.json(rows)
      });
    }
  });
});

// generic single router
// =============================================================================
var database_single = router.route('/db/:type/:id')

// generic get single
// *****************************************************************************
// output:
// -------
// status:  0: ok, object found
//          1: object not found
//          2: object type unknown
//          test if only one row exist is done by the database because of PK
// *****************************************************************************
database_single.get(function(req,res,next){
  var type = req.params.type
  var id = req.params.id

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query_string = sprintf("SELECT * FROM %s WHERE id =%s",type,id)
      var query = conn.query(query_string,function(err,rows){
        if(err){
          if(err.errno==1146) {
            logError.warn("400: Object type unknown:" + query_string)
            res.status(400)
            res.json({'status':2})
          } else {
            logError.error("500: " + err)
            res.status(500)
          }
          return;
        }

        if(rows.length == 0) {
          logError.warn("400: Object not found:" + query_string)
          res.status(400)
          res.json({'status':1})
          return;
        }

        logAccess.debug("200: " + query_string)
        res.status(200)
        res.json(rows)
      });
    }
  });
});

// generic delete
// *****************************************************************************
// output:
// -------
//          2: object type unknown
// status:  0: ok, object deleted
//          1: object not found
//          3: object has FK relations
// *****************************************************************************
database_single.delete(function(req,res,next){
  var type = req.params.type;
  var id = req.params.id;

  req.getConnection(function (err, conn) {
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query_string = sprintf("Delete from %s where id =%s",type,id)
      var query = conn.query(query_string, function(err, rows){
        if(err){
          if(err.errno==1146) {
            logError.warn("400: Object type unknown:" + query_string)
            res.status(400)
            res.json({'status':2});
          } else if(err.errno==1451) {
            logError.warn("400: FK relations to object exist:" + query_string)
            res.status(400)
            res.json({'status':3});
          } else {
            logError.error("500: " + err)
            res.status(500)
          }
          return;
        }

        if(rows.affectedRows == 0) {
          logError.warn("400: Object not found:" + query_string)
          res.status(400);
          res.json({'status':1})
          return;
        }

        logAccess.debug("200: " + query_string)
        res.status(200);
        res.json({'status':0});
      });
    }
  });
});

// =============================================================================
// UUID
// =============================================================================
var uuid = router.route('/uuid');

uuid.get(function(req,res,next){
  req.getConnection(function(err,conn){
      console.log("get uuid")
      if (err) {
        res.status(500)
        res.json({'status':5001})
        logError.error("500: " + err)
        return
      } else {
        console.log("no error get uuid")
        var query = conn.query('SELECT uuid() as uuid',function(err,rows){
          if(err){
              console.log("Fehler:" + err);
              return next("Database error, check your query");
          }
          console.log(rows);
          res.json(rows);
          res.status(200).send();
          return;
       });
     }
  });
});

// =============================================================================
// Engine
// =============================================================================
var engine = router.route('/engine');

// POST engine data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
engine.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();
  req.assert('executable','Executable is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
        executable:req.body.executable,
        id_system:req.body.id_system,
        uid_logo:req.body.uid_logo,
     };

    general_create(req,res,"KEngine",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var engine_single = router.route('/engine/:id');

/*------------------------------------------------------
route.all is extremely useful. you can use it to do
stuffs for specific routes. for example you need to do
a validation everytime route /api/user/:user_id it hit.

remove engine_single.all() if you dont want it
------------------------------------------------------*/
/* engine_single.all(function(req,res,next){
    console.log("You need to smth about engine_single Route ? Do it here");
    console.log(req.params);
    next();
}); */

// PUT engine to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
engine_single.put(function(req,res,next){
  var id = req.params.id;
  var id_system = req.body.id_system;

  req.assert('name','Name is required').notEmpty();
  req.assert('executable','Executable is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      name:req.body.name,
      executable:req.body.executable,
      id_system:id_system,
      uid_logo:req.body.uid_logo
    };

    general_update(req,res,"KEngine",data,id);
  }
});

// Engine count route
// =============================================================================
var enginecountroute = router.route('/engine/count/:pattern');

// GET number of engines from the DB that match the pattern
// *****************************************************************************
enginecountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KEngine WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var enginesliceroute = router.route('/engine/:offset/:limit/:filter')

// GET engines slice from the DB
// *****************************************************************************
enginesliceroute.get(function(req,res,next){
  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) return next("Cannot Connect");
    var query = conn.query(sprintf("SELECT * FROM KEngine where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
      if(err){
          console.log(err);
          return next("Database error, check your query");
      }
      res.status(200);
      res.json(rows);
    });
  });
});

var enginepicture = router.route('/engine/upload/:uuid')

var multer = require('multer');

/* Disk Storage engine of multer gives you full control on storing files to disk. The options are destination (for determining which folder the file should be saved) and filename (name of the file inside the folder) */

var storage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, './src/client/public/uploads');
  },
  filename: function (request, file, callback) {
    console.log(file.originalname);
    callback(null, request.params.uuid )
  }
});

/*Multer accepts a single file with the name photo. This file will be stored in request.file*/

var upload = multer({storage: storage}).single('photo');

//Posting the file upload
enginepicture.post(function(request, response) {
  console.log(request.body);
  upload(request, response, function(err) {
  if(err) {
    console.log('Error Occured');
    return;
  }
  response.end('Your File Uploaded');
  })
});


// =============================================================================
// System
// =============================================================================
var system = router.route('/system');

// POST system data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
system.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

    general_create(req,res,"KSystem",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var system_single = router.route('/system/:id');

// PUT system to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
system_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_update(req,res,"KSystem",data,id);
  }
});

// Engine count route
// =============================================================================
var systemcountroute = router.route('/system/count/:pattern');

// GET number of systems from the DB that match the pattern
// *****************************************************************************
systemcountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KSystem WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var systemsearchroute = router.route('/system/search/:filters/:patterns');

// GET search route for system from the DB
// =============================================================================
systemsearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KSystem');
});

// Count route
// =============================================================================
var systemsliceroute = router.route('/system/:offset/:limit/:filter')

// GET systems slice from the DB
// *****************************************************************************
systemsliceroute.get(function(req,res,next){
  console.log("slice4");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
      if (err) return next("Cannot Connect");
      var query = conn.query(sprintf("SELECT * FROM KSystem where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
          if(err){
              console.log(err);
              return next("Database error, check your query");
          }
          res.json(rows);
       });
  });
});

// =============================================================================
// Engine_configuration
// =============================================================================
var engine_configuration = router.route('/engine_configuration');

// POST engine_configuration data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
engine_configuration.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

    general_create(req,res,"KEngine_configuration",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var engine_configuration_single = router.route('/engine_configuration/:id');

// PUT engine_configuration to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
engine_configuration_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_update(req,res,"KEngine_configuration",data,id);
  }
});

// Engine count route
// =============================================================================
var engine_configurationcountroute = router.route('/engine_configuration/count/:pattern');

// GET number of engine_configurations from the DB that match the pattern
// *****************************************************************************
engine_configurationcountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KEngine_configuration WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var engine_configurationsliceroute = router.route('/engine_configuration/:offset/:limit/:filter')

// GET engine_configurations slice from the DB
// *****************************************************************************
engine_configurationsliceroute.get(function(req,res,next){
  console.log("slice1");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KEngine_configuration where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var engine_configurationsearchroute = router.route('/engine_configuration/search/:pattern');

// GET single engine_configuration from the DB
// =============================================================================
engine_configurationsearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KEngine_configuration');
});


// =============================================================================
// Publisher
// =============================================================================
var publisher = router.route('/publisher');

// POST publisher data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
publisher.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

    general_create(req,res,"KPublisher",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var publisher_single = router.route('/publisher/:id');

// PUT publisher to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
publisher_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

    general_update(req,res,"KPublisher",data,id);
  }
});

// Engine count route
// =============================================================================
var publishercountroute = router.route('/publisher/count/:pattern');

// GET number of publishers from the DB that match the pattern
// *****************************************************************************
publishercountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KPublisher WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var publishersliceroute = router.route('/publisher/:offset/:limit/:filter')

// GET publishers slice from the DB
// *****************************************************************************
publishersliceroute.get(function(req,res,next){
  console.log("slice2");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KPublisher where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var publishersearchroute = router.route('/publisher/search/:pattern');

// GET single publisher from the DB
// =============================================================================
publishersearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KPublisher');
});

// =============================================================================
// Tag_category
// =============================================================================
var tag_category = router.route('/tag_category');

// POST tag_category data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
tag_category.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
        description:req.body.description,
     };

    general_create(req,res,"KTag_category",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var tag_category_single = router.route('/tag_category/:id');

// PUT tag_category to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
tag_category_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
        description:req.body.description
     };

     general_update(req,res,"KTag_category",data,id);
  }
});

// Engine count route
// =============================================================================
var tag_categorycountroute = router.route('/tag_category_count/:filters/:patterns');

// GET number of tag_categorys from the DB that match the pattern
// *****************************************************************************
tag_categorycountroute.get(function(req,res,next){
  var filters = req.params.filters;
  var filter = '';
  var patterns = req.params.patterns;
  var pattern = '';
  var where = '';

  if(!(req.params.filters == '|')) {
    var filters = req.params.filters.split("|");

    for(i=0;i<filters.length;i+=2) {
      filter += filters[i] + " = '" + filters[i*1] + "'";
      console.log("Filter:"+filter);
    }
  }

  if(!(req.params.patterns == '|')) {
    console.log("patterns:"+ req.params.patterns);
    var patterns = req.params.patterns.split("|");

    for(i=0;i<patterns.length;i+=2) {
      if(i>0 || !(filter == '')) {
        pattern+= ' and ';
      }
      pattern += patterns[i] + " like '%" + patterns[i+1] + "%'";
      console.log("Pattern:" + pattern);
    }
  }

  if(!(filter == '' && pattern == '')) {
    where = 'where';
  }

  console.log("Query:" + sprintf("SELECT count(*) FROM KTag_category %s %s %s",where,filter,pattern));

  req.getConnection(function(err,conn){
    if (err) return next("Cannot Connect");
    var query = conn.query(sprintf("SELECT count(*) as number FROM KTag_category %s %s %s",where,filter,pattern),function(err,rows){
      if(err){
          console.log(err);
          return next("Database error, check your query");
      }
      res.status(200);
      res.json(rows);
    });
  });
});

// Slice route
// =============================================================================
var tag_categorysliceroute = router.route('/tag_category/:offset/:limit/:filters/:patterns')

// GET tag_categorys slice from the DB
// *****************************************************************************
tag_categorysliceroute.get(function(req,res,next){
  console.log("slice3:" + req.params.filters + " - " + req.params.patterns);

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filters = req.params.filters;
  var filter = '';
  var patterns = req.params.patterns;
  var pattern = '';
  var where = '';

  if(!(req.params.filters == '|')) {
    var filters = req.params.filters.split("|");

    for(i=0;i<filters.length;i+=2) {
      filter += filters[i] + " = '" + filters[i*1] + "'";
      console.log("Filter:"+filter);
    }
  }

  if(!(req.params.patterns == '|')) {
    console.log("patterns:"+ req.params.patterns);
    var patterns = req.params.patterns.split("|");

    for(i=0;i<patterns.length;i+=2) {
      if(i>0 || !(filter == '')) {
        pattern+= ' and ';
      }
      pattern += patterns[i] + " like '%" + patterns[i+1] + "%'";
      console.log("Pattern:" + pattern);
    }
  }

  if(!(filter == '' && pattern == '')) {
    where = 'where';
  }

  console.log("Query:" + sprintf("SELECT * FROM KTag_category %s %s %s limit %s offset %s",where,filter,pattern,limit,offset));

  req.getConnection(function(err,conn){
      if (err) return next("Cannot Connect");
      var query = conn.query(sprintf("SELECT * FROM KTag_category %s %s %s limit %s offset %s",where,filter,pattern,limit,offset),function(err,rows){
          if(err){
              console.log(err);
              return next("Database error, check your query");
          }
          res.json(rows);
       });
  });
});

// single route (PUT)
var tag_categorysearchroute = router.route('/tag_category/search/:pattern');

// GET single tag_category from the DB
// =============================================================================
tag_categorysearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KTag_category');
});


// =============================================================================
// Tag
// =============================================================================
var tag = router.route('/tag');

// POST tag data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
tag.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

    general_create(req,res,"KTag",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var tag_single = router.route('/tag/:id');

// PUT tag to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
tag_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
     };

     general_update(req,res,"KTag",data,id);
  }
});

// Engine count route
// =============================================================================
var tagcountroute = router.route('/tag/count/:pattern');

// GET number of tags from the DB that match the pattern
// *****************************************************************************
tagcountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KTag WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var tagsearchroute = router.route('/tag/search/:filters/:patterns');

// GET single tag from the DB
// =============================================================================
tagsearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KTag');
});

// Count route
// =============================================================================
var tagsliceroute = router.route('/tag/:offset/:limit/:filter')

// GET tags slice from the DB
// *****************************************************************************
tagsliceroute.get(function(req,res,next){
  console.log("slice4");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KTag where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// =============================================================================
// Engine_file
// =============================================================================
var engine_file = router.route('/engine_file');

// POST engine_file data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
engine_file.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_create(req,res,"KEngine_file",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var engine_file_single = router.route('/engine_file/:id');

// PUT engine_file to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
engine_file_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_update(req,res,"KEngine_file",data,id);
  }
});

// Engine count route
// =============================================================================
var engine_filecountroute = router.route('/engine_file/count/:pattern');

// GET number of engine_files from the DB that match the pattern
// *****************************************************************************
engine_filecountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KEngine_file WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var engine_filesliceroute = router.route('/engine_file/:offset/:limit/:filter')

// GET engine_files slice from the DB
// *****************************************************************************
engine_filesliceroute.get(function(req,res,next){
  console.log("slice1");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KEngine_file where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var engine_filesearchroute = router.route('/engine_file/search/:pattern');

// GET single engine_file from the DB
// =============================================================================
engine_filesearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KEngine_file');
});


// =============================================================================
// Game_file
// =============================================================================
var game_file = router.route('/game_file');

// POST game_file data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
game_file.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_create(req,res,"KGame_file",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var game_file_single = router.route('/game_file/:id');

// PUT game_file to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
game_file_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_update(req,res,"KGame_file",data,id);
  }
});

// Engine count route
// =============================================================================
var game_filecountroute = router.route('/game_file/count/:pattern');

// GET number of game_files from the DB that match the pattern
// *****************************************************************************
game_filecountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KGame_file WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var game_filesliceroute = router.route('/game_file/:offset/:limit/:filter')

// GET game_files slice from the DB
// *****************************************************************************
game_filesliceroute.get(function(req,res,next){
  console.log("slice2");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KGame_file where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
          if(err){
              console.log(err);
              return next("Database error, check your query");
          }
          res.json(rows);
       });
     }
  });
});

// single route (PUT)
var game_filesearchroute = router.route('/game_file/search/:pattern');

// GET single game_file from the DB
// =============================================================================
game_filesearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KGame_file');
});


// =============================================================================
// Game
// =============================================================================
var game = router.route('/game');

// POST game data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
game.post(function(req,res,next){
  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_create(req,res,"KGame",data);
  }
});

// Engine single route (PUT)
// =============================================================================
var game_single = router.route('/game/:id');

// PUT game to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
game_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        name:req.body.name,
    };

    general_update(req,res,"KGame",data,id);
  }
});

// Game count route
// =============================================================================
var gamecountroute = router.route('/game/count/:pattern');

// GET number of games from the DB that match the pattern
// *****************************************************************************
gamecountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KGame WHERE name like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var gamesliceroute = router.route('/game/:offset/:limit/:filter')

// GET games slice from the DB
// *****************************************************************************
gamesliceroute.get(function(req,res,next){
  console.log("slice3");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
      if (err) return next("Cannot Connect");
      var query = conn.query(sprintf("SELECT * FROM KGame where name like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
          if(err){
              console.log(err);
              return next("Database error, check your query");
          }
          res.json(rows);
       });
  });
});

// single route (PUT)
var gamesearchroute = router.route('/game/search/:pattern');

// GET single game from the DB
// =============================================================================
gamesearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KGame');
});

// =============================================================================
// Pictures
// =============================================================================
var picture = router.route('/picture');

// POST picture data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
picture.post(function(req,res,next){
  req.assert('id_tag','Tag is required').notEmpty();
  req.assert('uid_object','Object is required').notEmpty();
  req.assert('uuid','UUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        id_tag:req.body.id_tag,
        uid_object:req.body.uid_object,
        uuid:req.body.uuid
    };

    general_create(req,res,"KPicture",data);
  }
});

// Picture single route (PUT)
// =============================================================================
var picture_single = router.route('/picture/:id');

// PUT picture to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
//            800: validation error
//            900: database error
//            5001: no database connection
// errors:    errors
// *****************************************************************************
picture_single.put(function(req,res,next){
  var id = req.params.id;

  req.assert('uid_object','Object is required').notEmpty();
  req.assert('id_tag','Tag is required').notEmpty();
  req.assert('uuid','Picture is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        uid_object:req.body.uid_object,
        id_tag:req.body.id_tag,
        uuid:req.body.uuid
    };

    general_update(req,res,"KPicture",data,id);
  }
});

// Picture count route
// =============================================================================
var picturecountroute = router.route('/picture/count/:pattern');

// GET number of pictures from the DB that match the pattern
// *****************************************************************************
picturecountroute.get(function(req,res,next){
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT count(*) as number FROM KPicture WHERE uuid like ?",'%'+[pattern]+'%',function(err,rows){
        if(err){
            console.log(err);
            return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var picturesliceroute = router.route('/picture/:offset/:limit/:filter')

// GET pictures slice from the DB
// *****************************************************************************
picturesliceroute.get(function(req,res,next){
  console.log("picture_slice3");

  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KPicture where uuid like ? limit %s offset %s",limit,offset),'%'+[filter]+'%',function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var picturesearchroute = router.route('/picture/search/:pattern');

// GET single picture from the DB
// =============================================================================
picturesearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KPicture');
});

var tagepicture = router.route('/picture/upload/:uuid')

/* already declared */
// var multer = require('multer');

/* Disk Storage engine of multer gives you full control on storing files to disk. The options are destination (for determining which folder the file should be saved) and filename (name of the file inside the folder) */

/*
var storage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, './src/client/public/uploads');
  },
  filename: function (request, file, callback) {
    console.log(file.originalname);
    callback(null, request.params.uuid )
  }
});

/*Multer accepts a single file with the name photo. This file will be stored in request.file*/
/*
var upload = multer({storage: storage}).single('photo');
*/
//Posting the file upload
tagepicture.post(function(request, response) {
  console.log(request.body);
  upload(request, response, function(err) {
  if(err) {
    console.log('Error Occured');
    return;
  }
  response.end('Your File Uploaded');
  })
});




// =============================================================================
// Game2Tag
// =============================================================================
var game2tagpost = router.route('/game2tag');

// POST game2tag data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
game2tagpost.post(function(req,res,next){
  req.assert('id_game','Name is required').notEmpty();
  req.assert('id_tag','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        id_game:req.body.id_game,
        id_tag:req.body.id_tag
    };

    general_create(req,res,"KGame2Tag",data);
  }
});

var game2tag = router.route('/game2tag/:id_game');

// Game2Tag single route (PUT)
// =============================================================================
var game2tag_single = router.route('/game2tag/:id');

// Game2Tag count route
// =============================================================================
var game2tagcountroute = router.route('/game2tag/count/:id_game/:pattern');

// GET number of game2tags from the DB that match the pattern
// *****************************************************************************
game2tagcountroute.get(function(req,res,next){
  var id_game = req.params.id_game;
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT count(*) as number FROM KVGame2Tag WHERE id_game = %s and tag_name like '%s'",id_game,'%'+[pattern]+'%'),function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var game2tagsliceroute = router.route('/game2tag/:offset/:limit/:id_game/:filter')

// GET game2tags slice from the DB
// *****************************************************************************
game2tagsliceroute.get(function(req,res,next){
  var id_game = req.params.id_game;
  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KVGame2Tag where id_game = %s and tag_name like '%s' limit %s offset %s",id_game,'%'+[filter]+'%',limit,offset),function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var game2tagsearchroute = router.route('/game2tag/search/:filters/:patterns');

// GET single game2tag from the DB
// =============================================================================
game2tagsearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KGame2Tag');
});



// =============================================================================
// TagAndPicture
// =============================================================================
var tagandpicturepost = router.route('/tagandpicture');

// POST tagandpicture data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            800: validation error
//            900: database error
//            5001: no database connection
// id:        id of the new object
// errors:    errors
// *****************************************************************************
tagandpicturepost.post(function(req,res,next){
  req.assert('id_game','Name is required').notEmpty();
  req.assert('id_tag','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
        id_game:req.body.id_game,
        id_tag:req.body.id_tag
    };

    general_create(req,res,"KTagAndPicture",data);
  }
});

var tagandpicture = router.route('/tagandpicture/:id_game');

// GET tagandpictures from the DB
// *****************************************************************************
tagandpicture.get(function(req,res,next){
  var id_game = req.params.id_game;

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query("SELECT * FROM KVtagandpicture WHERE id = ? ",[id],function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// tagandpicture single route (PUT)
// =============================================================================
var tagandpicture_single = router.route('/tagandpicture/:id');

// tagandpicture count route
// =============================================================================
var tagandpicturecountroute = router.route('/tagandpicture/count/:id_game/:pattern');

// GET number of tagandpictures from the DB that match the pattern
// *****************************************************************************
tagandpicturecountroute.get(function(req,res,next){
  var id_game = req.params.id_game;
  var pattern = req.params.pattern;

  if(pattern == '<EMPTY>') {
    pattern = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT count(*) as number FROM KVTagAndPicture WHERE id_game = %s and tag_name like '%s'",id_game,'%'+[pattern]+'%'),function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json(rows);
      });
    }
  });
});

// Count route
// =============================================================================
var tagandpicturesliceroute = router.route('/tagandpicture/:offset/:limit/:id_game/:filter')

// GET tagandpictures slice from the DB
// *****************************************************************************
tagandpicturesliceroute.get(function(req,res,next){
  var id_game = req.params.id_game;
  var offset = req.params.offset;
  var limit = req.params.limit;
  var filter = req.params.filter;

  if(filter == '<EMPTY>') {
    filter = '';
  }

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'status':5001})
      logError.error("500: " + err)
      return
    } else {
      var query = conn.query(sprintf("SELECT * FROM KVTagAndPicture where id_game = %s and tag_name like '%s' limit %s offset %s",id_game,'%'+[filter]+'%',limit,offset),function(err,rows){
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.json(rows);
      });
    }
  });
});

// single route (PUT)
var tagandpicturesearchroute = router.route('/tagandpicture/search/:filters/:patterns');

// GET single tagandpicture from the DB
// =============================================================================
tagandpicturesearchroute.get(function(req,res,next){
  kautschSearch(req,res,next,'KTagAndPicture');
});


// =============================================================================
// start Server
// =============================================================================
app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
