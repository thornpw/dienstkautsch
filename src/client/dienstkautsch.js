/** 2657 */

// requirements
// =============================================================================
var fs = require("fs");
var db_file = "kautschbank2.sqlite";
var exists = fs.existsSync(file);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(db_file);

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

var tablename2objectuids = []
db.each("SELECT * FROM KObjectUID", function(err, row) {
  tablename2objectuids[row.TableName] = row.ObjectUID;
});

var dbID = ""
db.each("SELECT KautschInstallationUID FROM KConfiguration where uid='000001:0001:000001'", function(err, row) {
  dbID= row.KautschInstallationUID;
});


// error handling
// =============================================================================
function KError(errno,errors) {
  this.name = errno;
  this.errors = errors;
}
KError.prototype = Error.prototype;

// Utils
// =============================================================================
// replace all
// *****************************************************************************
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

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

app.set('port', (process.env.PORT || 3300));
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
    res.setHeader('Access-Control-Allow-Headers','Content-Type');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

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

// general output codes
// =============================================================================
// 700: DB Connection Error
// 800: validation errors
// 900: DB Create Error
// 901: DB Update Error
// 902: DB Select Error
// 903: DB Count Error
// 904: DB Delete Error
// =============================================================================
// Utilities
// =============================================================================
// general validation
// *****************************************************************************
// output(error case):
// -------------------
// code:      800: validation error(s)
// errors:    errors
// *****************************************************************************
var general_validation = function(req,res,next) {
  var errors = req.validationErrors();
  if(errors){
    var logmsg = ""
    for (var key in errors) {
      console.log(key)
      console.log(errors[key])
      logmsg += "param:"+errors[key]["param"]+","+"msg:"+errors[key]["msg"]+","+"param:"+errors[key]["value"]+";"
    }

    console.log(errors)
    logError.error(sprintf("800: validation error(s):%s",logmsg))
    res.status(422)
    res.json({"code":800,"errors":errors});
    return false
  }
  return true
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

// general CREATE
// *****************************************************************************
// output:
// -------
// code:      0:    ok, object created
//            118:  no such column
// id:        not present | new id of object that was created
// uid:       not present | new uid of object that was created
// errors:    errors
// *****************************************************************************
var general_create = function(req,res,tablename,data) {
  var _columns = "(UID,"
  var _values = "(-1,"

  for (var key in data) {
    _columns += key + ","
    if(typeof data[key] == "string") {
      _values += "'" + data[key] + "',"
    } else {
      _values += data[key] + ","
    }
  }

  _columns = _columns.substring(0,_columns.length-1)+")"
  _values = _values.substring(0,_values.length-1)+")"

  //Perform INSERT operation.
  query_string = "INSERT into " + tablename + " " + _columns + " VALUES " + _values
  console.log(query_string)

  db.run(query_string,function(err) {
    try {
      if(err) {
        console.log(err.message.substring(0,28))
        if(err.message.substring(0,28)=="SQLITE_ERROR: no such column") {
          throw new KError("118",err)
        } else {
          throw new KError("900",err)
        }
      }

      _uid = dbID + ":" + tablename2objectuids[tablename] + ":" + pad(this.lastID.toString(),6);
      query_update_string = "UPDATE " + tablename + " SET uid='" + _uid + "' where rowid=" + this.lastID
      console.log(query_update_string)

      db.run(query_update_string,function(err) {
        try {
          if(err) {
            throw new Error("901: db update error")
          }
          res.status(200);
          res.json({'code':0,'id':this.lastID,'uid':_uid,'errors':undefined});
          logAccess.debug("200: " + query_string)
          return
        } catch(err) {
          switch(err.name) {
            case "901": {
              res.status(500)
              res.json({'code':901,'errors':err.errors})
              logError.error("901: db update error:" + err.errors)
              return
            }
            default: {
              res.status(500)
              res.json({'code':700,'errors':err.errors})
              logError.error("700: db connection error:" + err.errors)
              return
            }
          }
        }
      });
    } catch(err) {
      console.log("heir"+err.name)
      switch(err.name) {
        case "118": {
          res.status(400)
          res.json({'code':118,'errors':err})
          logError.warn("118: Unknown column")
          return
        }
        case "900": {
          res.status(500)
          res.json({'code':900,'errors':err.errors})
          logError.error("900: db create error:" + err.errors)
          return
        }
        default: {
          res.status(500)
          res.json({'code':700,'errors':err.errors})
          logError.error("700: db connection error:" + err.errors)
          return
        }
      }
    };
  });

  /* MySQL
     -----
  req.getConnection(function (err, conn){
    if (err) {
      res.status(500)
      res.json({'code':700,'errors':err})
      logError.error("700: db connection error:" + err)
      return
    } else {
      var query_string =sprintf("INSERT INTO %s set ?",tablename);
      var query = conn.query(query_string,data, function(err, result){
        if(err){
          res.status(500)
          res.json({'code':900,'errors':err})
          logError.error("900: db create error:" + err)
        };

        res.status(200);
        res.json({'code':0,'id':result.insertId,'errors':undefined});
        logAccess.debug("200: " + query_string)
      });
    }
  }); */
};

// general UPDATE
// *****************************************************************************
// Perform update operation.
// *****************************************************************************
// output:
// -------
// code:      0:    ok, object updated
//            200:  Object Id:%id not found in %type
//            214:  No such table
//            218:  No such column
// errors:    errors
// *****************************************************************************
var general_update = function(req,res,tablename,data,uid) {
  var _sets = " "

  for (var key in data) {
    _sets += key + "="
    if(typeof data[key] == "string") {
      _sets += "'" + data[key] + "',"
    } else {
      _sets += data[key] + ","
    }
  }

  _sets = _sets.substring(0,_sets.length-1)

  query_updatestring = "UPDATE " + tablename + " SET " + _sets + " where uid=" + uid
  console.log(query_updatestring)
  db.run(query_updatestring,function(err) {
    try {
      if(err) {
        console.log(err.message.substring(0,28))
        if(err.message.substring(0,27)=="SQLITE_ERROR: no such table") {
          throw new KError("214",err)
        } else if(err.message.substring(0,28)=="SQLITE_ERROR: no such column") {
          throw new KError("218",err)
        } else {
          throw new KError("901",err)
        }
      }

      _uid = dbID + ":" + tablename2objectuids[tablename] + ":" + pad(this.lastID.toString(),6);

      if(this.changes == 0) {
        res.status(400);
        res.json({'code':200,'errors':null})
        logError.warn(sprintf("200: Object uid:%s not found in %s:",uid,tablename))
        return;
      }

      res.status(200);
      res.json({'code':0,'errors':undefined});
      logAccess.debug("200: " + query_updatestring)
    } catch(err) {
      console.log("heir"+err.name)
      switch(err.name) {
        case "318": {
          res.status(400)
          res.json({'code':218,'errors':err})
          logError.warn("218: Unknown column")
          return
        }
        case "314": {
          res.status(400)
          res.json({'code':214,'errors':err})
          logError.warn("214: Unknown type")
          return
        }
        case "901": {
          res.status(500)
          res.json({'code':901,'errors':err.errors})
          logError.error("901: db update error:" + err.errors)
          return
        }
        default: {
          res.status(500)
          res.json({'code':700,'errors':err.errors})
          logError.error("700: db connection error:" + err.errors)
          return
        }
      }
    }
  });


  /* MySQL
    ------
  req.getConnection(function (err, conn){
    if (err) {
      res.status(500)
      res.json({'code':700,'errors':err})
      logError.error("700: db connection error:" + err)
      return
    }
    var query_string = sprintf("UPDATE %s SET ? WHERE id=%s",tablename,id)
    var query = conn.query(query_string,[data], function(err, rows){
      if(err){
        res.status(500)
        res.json({'code':901,'errors':err})
        logError.error("901: db update error:" + err)
        return
      };
      if(rows.affectedRows == 0) {
        res.status(400);
        res.json({'code':200,'errors':null})
        logError.warn(sprintf("200: Object id:%s not found in %s:",id,tablename))
        return;
      }
      res.status(200);
      res.json({'code':0,'errors':undefined})
      logAccess.debug("200: " + query_string)
    });
  });*/
}

// generic search router
// =============================================================================
var database_search = router.route('/db/search/:type')

// generic get list
// *****************************************************************************
// output:
// -------
// status:    0:    ok, object found
//            400:  Offset is negativ
//            401:  Offset is not a number
//            402:  Limit is 0
//            403:  Limit is negativ
//            404:  Limit is not a number
//            405:  Filter inclomplete
//            406:  First filter must start with 'where'
//            407:  Only the operand of the first filter coule be name 'where'
//            408:  Operand unknwon
//            409:  Column empty
//            410:  Comparer unknown
//            411:  Value empty
//            412:  Offset is higher than the amount of data
//            413:  Offset + limit out of rage
//            414:  Object type unknown
//            417:  Order direction without order by
//            418:  Unkonwn column in filter
// amount':   number of rows
// data:      data (rows)
// errors:    errors
// *****************************************************************************
database_search.get(function(req,res,next){
  var db_type = req.params.type
  var db_offset = ""

  // offset
  // ---------------------------------------------------------------------------
  if(req.query.offset != undefined) {
    var temp_offset = parseInt(req.query.offset)
    db_offset = "offset " + req.query.offset

    if(temp_offset<0) {
      res.status(400)
      res.json({'code':400,'errors':undefined})
      logError.warn("400: Offset is negativ:" + temp_offset)
      return
    };
    if(temp_offset % 1 != 0) {
      res.status(400)
      res.json({'code':401,'errors':undefined})
      logError.warn("401: Offset is not a number:" + temp_offset)
      return
    };
  }

  // limit
  // ---------------------------------------------------------------------------
  var db_limit = ""
  if(req.query.limit != undefined) {
    var temp_limit = parseInt(req.query.limit)

    if(temp_limit==0) {
      res.status(400)
      res.json({'code':402,'errors':undefined})
      logError.warn("402: Limit is 0")
      return
    };

    if(temp_limit<0) {
      res.status(400)
      res.json({'code':403,'errors':undefined})
      logError.warn("403: Limit is negativ:" + temp_limit)
      return
    };

    if(temp_limit % 1 != 0) {
      res.status(400)
      res.json({'code':404,'errors':undefined})
      logError.warn("404: Limit is not a number:" + temp_limit)
      return
    };

    db_limit = "limit " + req.query.limit
  }

  // order by
  // ---------------------------------------------------------------------------
  var db_orderby = ""
  if(req.query.orderby != undefined) {
    db_orderby = "order by " + req.query.orderby
  }

  // order_direction
  // ---------------------------------------------------------------------------
  var db_order_direction = ""
  if(req.query.order_direction != undefined) {
    db_order_direction = req.query.order_direction

    if(db_orderby == "") {
      res.status(400)
      res.json({'code':417,'errors':undefined})
      logError.warn(sprintf("417: Order direction:%s without order by",db_order_direction))
      return
    }
  }

  // filters
  // ---------------------------------------------------------------------------
  var temp_filters = []
  var db_filter = ""
  var db_operand = ""
  var db_column = ""
  var db_compare = ""
  var db_value = ""
  var temp_rows = undefined
  var temp_filters = undefined
  var temp_first = undefined

  if(req.query.filter != undefined) {
    console.log("filter:"+req.query.filter)
    temp_filters = req.query.filter.split(";")

    temp_first = true

    for (let entry of temp_filters) {
      temp_filter = entry.split("|")

      if(temp_filter.length != 4) {
        res.status(400)
        console.log(temp_filter)
        res.json({'code':405,'errors':undefined})
        logError.warn("405: Filter incomplete:" + req.query.filter)
        return
      }

      if(temp_filter[0] == "and" || temp_filter[0] == "or" || temp_filter[0] == "where") {
        if(temp_filter[0] != "where" && temp_first == true) {
          res.status(400)
          res.json({'code':406,'errors':undefined})
          logError.warn("406: First filter must start with 'where':" + req.query.filter)
          return
        }
        if(temp_filter[0] == "where" && temp_first == false) {
          res.status(400)
          res.json({'code':407,'errors':undefined})
          logError.warn("407: Only the operand of the first filter could be named 'where':" + req.query.filter)
          return
        }
        db_operand = temp_filter[0]
      } else {
        res.status(400)
        res.json({'code':408,'errors':undefined})
        logError.warn("408: Operand unknown:" + temp_filter[0])
        return
      }

      if(temp_filter[1] != "") {
        db_column = temp_filter[1]
      } else {
        res.status(400)
        res.json({'code':409,'errors':undefined})
        logError.warn("409: Column empty")
        return
      }

      console.log(temp_filter[2])
      if(temp_filter[2] == 'eq') {
        db_compare = "="
      } else if (temp_filter[2] == 'like'){
        db_compare = "like"
      } else {
        logError.warn("410: Comparer unknwon:" + temp_filter[2])
        res.status(400)
        res.json({'code':410,'errors':undefined})
        return
      }

      if(temp_filter[3] != "") {
        if(db_compare == 'like') {
          db_value = temp_filter[3].replaceAll("°","%")
        } else {
          db_value = temp_filter[3]
        }
      } else {
        res.status(400)
        res.json({'code':411,'errors':undefined})
        logError.warn("411: value empty")
        return
      }

      db_filter += db_operand + " " + db_column + " " + db_compare + " " + db_value + " "

      temp_first = false
    }
  }

  // count result
  // ---------------------------------------------------------------------------
  result_number_of_rows = 0

  // perform count operation.
  query_string = sprintf("SELECT count(*) as number FROM %s %s ",db_type,db_filter)
  console.log(query_string)
  db.all(query_string,function(err,rows) {
    try {
      if(err) {
        console.log(err.message.substring(0,28))
        if(err.message.substring(0,27)=="SQLITE_ERROR: no such table") {
          throw new KError("414",err)
        } else if(err.message.substring(0,28)=="SQLITE_ERROR: no such column") {
          throw new KError("418",err)
        } else {
          throw new KError("903",err)
        }
      }

      temp_rows = rows[0].number

      if(temp_offset > temp_rows) {
        throw new KError("412",err)
      }

      /*
      console.log(temp_offset,temp_limit,temp_rows)
      if(temp_offset + temp_limit >= temp_rows) {
        throw new KError("413",err)
      }
      */

      // perform search operation
      query_string = sprintf("SELECT * FROM %s %s %s %s %s %s",db_type,db_filter,db_orderby,db_order_direction,db_limit,db_offset)
      console.log(">>>"+query_string)
      db.all(query_string,function(err,rows) {
        try {
          if(err) {
            console.log("hier902")
            throw new KError("902",err)
          }

          res.status(200);
          res.json({'code':0,'amount':temp_rows,'data':rows,'errors':undefined});
          logAccess.debug("200: " + query_string)
        } catch (err) {
          console.log(err)
          switch(err.name) {
            case "902": {
              res.status(500)
              res.json({'code':902,'errors':err.errors})
              logError.error("902: db search error:" + err.errors)
              return
            }
            default: {
              res.status(500)
              res.json({'code':700,'errors':err.errors})
              logError.error("700: db connection error:" + err.errors)
              return
            }
          }
        }
      });
    } catch(err) {
      console.log("heir"+err.name)
      switch(err.name) {
        case "418": {
          res.status(400)
          res.json({'code':418,'errors':err})
          logError.warn("418: Unknown column in filter")
          return
        }
        case "414": {
          res.status(400)
          res.json({'code':414,'errors':err})
          logError.warn("414: Object type unknown:" + db_type)
          return
        }
        case "412": {
          res.status(400)
          res.json({'code':412,'erors':undefined})
          logError.error(sprintf("412: Offset:%s is higher than the amount of data:%s",temp_offset,temp_rows))
          return
        }
        /*case "413": {
          res.status(400)
          res.json({'code':413,'erors':undefined})
          logError.error(sprintf("413: Offset:%s + limit:%s out of range:%s",temp_offset,temp_limit,temp_rows))
          return
        }*/
        case "903": {
          res.status(500)
          res.json({'code':903,'errors':err.errors})
          logError.error("903: db count error:" + err.errors)
          return
        }
        default: {
          res.status(500)
          res.json({'code':700,'errors':err.errors})
          logError.error("700: db connection error:" + err.errors)
          return
        }
      }
    }
  });

  /*req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'code':700,'errors':err})
      logError.error("700: db connection error:" + err)
      return
    } else {
      console.log(sprintf("SELECT count(*) as number FROM %s %s ",db_type,db_filter))
      var query = conn.query(sprintf("SELECT count(*) as number FROM %s %s ",db_type,db_filter),function(err,rows){
        if (err) {
          if(err.errno==1146) {
            res.status(400)
            res.json({'code':414,'errors':err})
            logError.warn("414: Object type unknown:" + db_type)
            return
          } else {
            res.status(500)
            res.json({'code':903,'errors':err})
            logError.error("903: db count error:" + err)
            return
          }
        }

        if(temp_offset >= rows[0].number) {
          res.status(400)
          res.json({'code':412,'erors':undefined})
          logError.error(sprintf("412: Offset:%s is higher than the amount of data:%s",temp_offset,rows[0].number))
          return
        }

        if(temp_offset + temp_limit >= rows[0].number) {
          res.status(400)
          res.json({'code':413,'erors':undefined})
          logError.error(sprintf("413: Offset:%s + limit:%s out of range:%s",temp_offset,temp_limit,rows[0].number))
          return
        }

        result_number_of_rows = rows[0].number
        console.log(sprintf(">>>>> SELECT * FROM %s %s %s %s %s %s",db_type,db_filter,db_orderby,db_order_direction,db_limit,db_offset))

        // query
        // ---------------------------------------------------------------------
        var query_string = sprintf("SELECT * FROM %s %s %s %s %s %s",db_type,db_filter,db_orderby,db_order_direction,db_limit,db_offset)
        var query = conn.query(query_string,function(err,rows){
          if (err) {
            res.status(500)
            res.json({'code':902,'errors':err})
            logError.error("902: db select error:" + err)
            return
          }

          res.status(200);
          res.json({'code':0,'amount':result_number_of_rows,'data':rows,'errors':undefined});
          logAccess.debug("200: " + query_string)
        });
      });
    }
  });*/
});

// generic single router
// =============================================================================
var database_single = router.route('/db/:type/:uid')

// generic get single
// *****************************************************************************
// output:
// -------
// code:    0:    ok, object found
//          414:  object type unknown
//          418:  unknown column
//          419:  object not found
// data:    data (rows)
// errors:  errors
// *****************************************************************************
database_single.get(function(req,res,next){
  var db_type = req.params.type
  var uid = req.params.uid
  console.log(uid)

  var query_string = sprintf("SELECT * FROM %s WHERE uid ='%s'",db_type,uid)
  db.all(query_string,function(err,rows) {
    try {
      if(err) {
        console.log(err.message.substring(0,28))
        if(err.message.substring(0,27)=="SQLITE_ERROR: no such table") {
          throw new KError("414",err)
        } else if(err.message.substring(0,28)=="SQLITE_ERROR: no such column") {
          throw new KError("418",err)
        } else {
          throw new KError("902",err)
        }
      }

      if(rows.length == 0) {
        res.status(400)
        res.json({'code':419,'errors':undefined})
        logError.warn("419: Object not found:" + query_string)
        return;
      }

      res.status(200)
      res.json({'code':0,'amount':rows.length,'data':rows,'errors':undefined})
      logAccess.debug("200: " + query_string)
    } catch (err) {
      switch(err.name) {
        case "418": {
          res.status(400)
          res.json({'code':418,'errors':err})
          logError.warn("418: Unknown column in filter")
          return
        }
        case "414": {
          res.status(400)
          res.json({'code':414,'errors':err})
          logError.warn("414: Object type unknown:" + db_type)
          return
        }
        case "902": {
          res.status(400)
          res.json({'code':902,'errors':err})
          logError.warn("902: db select error")
          return
        }
        default: {
          res.status(500)
          res.json({'code':700,'errors':err.errors})
          logError.error("700: db connection error:" + err.errors)
          return
        }
      }
    }
  });
});

// generic delete
// *****************************************************************************
// Perform delete operation.
// *****************************************************************************
// output:
// -------
// code:    0:    ok, object deleted
//          300:  Object type unkown
//          301:  FK relations to object exist
//          302:  Object not found
// errors:  errors
// *****************************************************************************
database_single.delete(function(req,res,next){
  var type = req.params.type;
  var uid = req.params.uid;

  query_string = "DELETE from " + type + " where uid='" + uid + "'"
  console.log(query_string)
  try {
    db.run(query_string,function(err) {
      if(err) {
        console.log(err)
        if(err.errno==1) {
          res.status(400)
          res.json({'code':300,'errors':err});
          logError.warn("300: Object type unknown:" + type)
          return
        } else {
          res.status(500)
          res.json({'code':904,'errors':err})
          logError.error("904: db delete error:" + err)
          return
        }
      }

      console.log(this)
      if(this.changes == 0) {
        res.status(400);
        res.json({'code':302,'errors':undefined})
        logError.warn("302: Object not found:" + query_string)
        return;
      }

      res.status(200);
      res.json({'code':0,'errors':undefined});
      logAccess.debug("200: " + query_string)
      return
    });
  } catch(err) {
    res.status(500)
    res.json({'code':700,'errors':err})
    logError.error("700: db connection error:" + err)
    return
  }
});

// =============================================================================
// UUID
// =============================================================================
// Generate UUID
// *****************************************************************************
// output:
// -------
// code:    0: uuid generated
// uuid:    uuid
// errors:  undefined
// *****************************************************************************
var uuid = router.route('/uuid');

function CreateGuid() {
   function _p8(s) {
      var p = (Math.random().toString(16)+"000000000").substr(2,8);
      return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
   }
   return _p8() + _p8(true) + _p8(true) + _p8();
}

uuid.get(function(req,res,next){
  var js_uuid = CreateGuid();
  res.status(200);
  res.json({'code':0,'uuid':js_uuid,'errors':undefined});
  logAccess.debug("200: uuid:" + js_uuid)
});

// =============================================================================
// Runtime
// =============================================================================
var runtime = router.route('/runtime');

// POST runtime data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
runtime.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      name:req.body.Name,
    };

    general_create(req,res,"KRuntime",data);
  }
});

// Runtime single route (PUT)
// =============================================================================
var runtime_single = router.route('/runtime/:uid');

/*------------------------------------------------------
route.all is extremely useful. you can use it to do
stuffs for specific routes. for example you need to do
a validation everytime route /api/user/:user_uid it hit.

remove runtime_single.all() if you dont want it
------------------------------------------------------*/
/* runtime_single.all(function(req,res,next){
    console.log("You need to smth about runtime_single Route ? Do it here");
    console.log(req.params);
    next();
}); */

// PUT runtime to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
runtime_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      name:req.body.Name,
    };

    general_update(req,res,"KRuntime",data,uid);
  }
});

var runtimepicture = router.route('/runtime/upload/:uuid')

var multer = require('multer');

/* Disk Storage Runtime of multer gives you full control on storing files to disk. The options are destination (for determining which folder the file should be saved) and filename (name of the file inside the folder) */

var storage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, './src/client/public/uploads');
  },
  filename: function (request, file, callback) {
    console.log(file.originalname);
    callback(null, request.params.uuid )
  }
});

var file_storage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, './src/client/public/file_uploads');
  },
  filename: function (request, file, callback) {
    console.log(file.originalname);
    callback(null, request.params.uuid )
  }
});

/*Multer accepts a single file with the name photo. This file will be stored in request.file*/

var upload = multer({storage: storage}).single('photo');
var file_upload = multer({storage: file_storage}).single('file');


//Posting the file upload
runtimepicture.post(function(request, response) {
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
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
system.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name
    }
    if(req.body.DefaultRuntimeUID) {
      data["DefaultVersionUID"] = req.body.DefaultRuntimeUID
    };

    general_create(req,res,"KSystem",data);
  }
});

// System single route (PUT)
// =============================================================================
var system_single = router.route('/system/:uid');

// PUT system to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
system_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name
    }
    if(req.body.DefaultRuntimeUID) {
      data["DefaultVersionUID"] = req.body.DefaultRuntimeUID
    };

    general_update(req,res,"KSystem",data,uid);
  }
});

// =============================================================================
// Setup
// =============================================================================
var setup = router.route('/setup');

// POST setup data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
setup.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('SystemUID','SystemUID is required').notEmpty();
  req.assert('RuntimeUID','RuntimeUID is required').notEmpty();
  req.assert('Configuration','Configuration is required').notEmpty();


  if (general_validation(req,res,next)) {
    var data = {
        Name:req.body.Name,
        SystemUID:req.body.SystemUID,
        RuntimUID:req.body.RuntimeUID,
        Configuration:req.body.Configuration
     };

    general_create(req,res,"KSetup",data);
  }
});

// Setup single route (PUT)
// =============================================================================
var setup_single = router.route('/setup/:uid');

// PUT setup to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
setup_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('SystemUID','SystemUID is required').notEmpty();
  req.assert('RuntimeUID','RuntimeUID is required').notEmpty();
  req.assert('Configuration','Configuration is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      SystemUID:req.body.SystemUID,
      RuntimUID:req.body.RuntimeUID,
      Configuration:req.body.Configuration
    };

    general_update(req,res,"KSetup",data,uid);
  }
});

// =============================================================================
// GameVersion
// =============================================================================
var gameversion = router.route('/gameversion');

// POST system data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
gameversion.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('SystemUID','SystemUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      SystemUID:req.body.SystemUID
    }
    if(req.body.PublisherUID) {
      data["PublisherUID"] = req.body.PublisherUID
    };
    if(req.body.DeveloperUID) {
      data["DeveloperUID"] = req.body.DeveloperUID
    };
    if(req.body.IsAlwaysShow) {
      data["IsAlwaysShow"] = req.body.IsAlwaysShow
    };

    general_create(req,res,"KGameVersion",data);
  }
});

// GameVersion single route (PUT)
// =============================================================================
var gameversion_single = router.route('/gameversion/:uid');

// PUT gameversion to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
gameversion_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('SystemUID','SystemUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      SystemUID:req.body.SystemUID
    }
    if(req.body.PublisherUID) {
      data["PublisherUID"] = req.body.PublisherUID
    };
    if(req.body.DeveloperUID) {
      data["DeveloperUID"] = req.body.DeveloperUID
    };
    if(req.body.IsAlwaysShow) {
      data["IsAlwaysShow"] = req.body.IsAlwaysShow
    };

    general_update(req,res,"KGameVersion",data,uid);
  }
});

// =============================================================================
// GameVariation
// =============================================================================
var gamevariation = router.route('/gamevariation');

// POST gamevariation data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
gamevariation.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name
    }
    if(req.body.DefaultSetupUID) {
      data["DefaultSetupUID"] = req.body.DefaultSetupUID
    };
    if(req.body.PublisherUID) {
      data["PublisherUID"] = req.body.PublisherUID
    };
    if(req.body.DeveloperUID) {
      data["DeveloperUID"] = req.body.DeveloperUID
    };
    if(req.body.IsAlwaysShow) {
      data["IsAlwaysShow"] = req.body.IsAlwaysShow
    };

    general_create(req,res,"KGameVariation",data);
  }
});

// GameVariation single route (PUT)
// =============================================================================
var gamevariation_single = router.route('/gamevariation/:uid');

// PUT gamevariation to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
gamevariation_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name
    }
    if(req.body.DefaultSetupUID) {
      data["DefaultSetupUID"] = req.body.DefaultSetupUID
    };
    if(req.body.PublisherUID) {
      data["PublisherUID"] = req.body.PublisherUID
    };
    if(req.body.DeveloperUID) {
      data["DeveloperUID"] = req.body.DeveloperUID
    };
    if(req.body.IsAlwaysShow) {
      data["IsAlwaysShow"] = req.body.IsAlwaysShow
    };

    general_update(req,res,"KGameVariation",data,uid);
  }
});

// =============================================================================
// Organisation
// =============================================================================
var organisation = router.route('/organisation');

// POST organisation data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
organisation.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    };

    general_create(req,res,"KOrganisation",data);
  }
});

// Organisation single route (PUT)
// =============================================================================
var organisation_single = router.route('/organisation/:uid');

// PUT organisation to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
organisation_single.put(function(req,res,next){
  var uid = req.params.uid;
  console.log(req.body)
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    };

    general_update(req,res,"KOrganisation",data,uid);
  }
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
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
game.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    }
    if(req.body.DefaultVersionUID) {
      data["DefaultVersionUID"] = req.body.DefaultVersionUID
    };

    general_create(req,res,"KGame",data);
  }
});

// Game single route (PUT)
// =============================================================================
var game_single = router.route('/game/:uid');

// PUT game to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
game_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    }
    if(req.body.DefaultVersionUID) {
      data["DefaultVersionUID"] = req.body.DefaultVersionUID
    };

    general_update(req,res,"KGame",data,uid);
  }
});

// =============================================================================
// File
// =============================================================================
var file = router.route('/file');

// POST file data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
file.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('Path','Path is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      Path:req.body.Path
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };

    general_create(req,res,"KFile",data);
  }
});

// File single route (PUT)
// =============================================================================
var file_single = router.route('/file/:uid');

// PUT file to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
file_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('Path','Path is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      Path:req.body.Path
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };

    general_update(req,res,"KFile",data,uid);
  }
});

// =============================================================================
// Link
// =============================================================================
var link = router.route('/link');

// POST file data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
link.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('URL','URL is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      URL:req.body.URL
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };
    if(req.body.IsPicture) {
      data["IsPicture"] = req.body.IsPicture
    };
    if(req.body.IsVideo) {
      data["IsVideo"] = req.body.IsVideo
    };

    general_create(req,res,"KLink",data);
  }
});

// Link single route (PUT)
// =============================================================================
var link_single = router.route('/link/:uid');

// PUT link to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
link_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('URL','URL is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      URL:req.body.URL
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };
    if(req.body.IsPicture) {
      data["IsPicture"] = req.body.IsPicture
    };
    if(req.body.IsVideo) {
      data["IsVideo"] = req.body.IsVideo
    };

    general_update(req,res,"KLink",data,uid);
  }
});

// =============================================================================
// Picture
// =============================================================================
var picture = router.route('/picture');

// POST picture data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
picture.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('FileUUID','FileUUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      FileUUID:req.body.FileUUID
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };

    general_create(req,res,"KPicture",data);
  }
});

// Picture single route (PUT)
// =============================================================================
var picture_single = router.route('/picture/:uid');

// PUT file to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
picture_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('FileUUID','FileUUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      FileUUID:req.body.FileUUID
    };
    if(req.body.Info) {
      data["Info"] = req.body.Info
    };

    general_update(req,res,"KPicture",data,uid);
  }
});

// =============================================================================
// TagCategory
// =============================================================================
var tagcategory = router.route('/tagcategory');

// POST tagcategory data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
tagcategory.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    };

    general_create(req,res,"KTagCategory",data);
  }
});

// TagCategory single route (PUT)
// =============================================================================
var tagcategory_single = router.route('/tagcategory/:uid');

// PUT TagCategory to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
tagcategory_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
    };

    general_update(req,res,"KTagCategory",data,uid);
  }
});

// =============================================================================
// Tag
// =============================================================================
var tagcontext = router.route('/tagcontext/:ObjectTypeUID/:MediaTypeUID/:ObjectUID');

// Search Media Context
// *****************************************************************************
// output:
// -------
// code:      0: ok
//            910: Error
// errors:    undefind|errors
// *****************************************************************************
tagcontext.get(function(req,res,next){
  req.assert('ObjectTypeUID','ObjectTypeUID is required').notEmpty();
  req.assert('MediaTypeUID','MediaTypeUID is required').notEmpty();
  req.assert('ObjectUID','ObjectUID is required').notEmpty();

  var filter = req.query.filter

  if(filter == null) {
      filter = ''
  }


  if (general_validation(req,res,next)) {
    //Perform SELECT operation

    query_string = sprintf("select smt.UID as UID,smt.ObjectUID as ObjectUID,smt.MediaTypeUID as MediaTypeUID,smt.TagUID as TagUID,smt.OrderNr as OrderNr,smt.IsMulti as IsMulti,t.Name as Name,t.TagCategoryUID as TagCategoryUID"
    + " from %s smt"
    + " join KTag t on smt.TagUID = t.UID"
    + " where smt.ObjectUID='%s'"
    + " and smt.MediaTypeUID='%s'"
    + " and t.Name like '%%%s%%'"
    + " EXCEPT"
    + " select smt.UID as UID,smt.ObjectUID as ObjectUID,smt.MediaTypeUID as MediaTypeUID,smt.TagUID as TagUID,smt.OrderNr as OrderNr,smt.IsMulti as IsMulti,t.Name as Name,t.TagCategoryUID as TagCategoryUID"
    + " from %s smt"
    + " join KTag t on smt.TagUID = t.UID"
    + " join KObject2MediaTag o2mt on smt.TagUID = o2mt.TagUID"
    + " where smt.ObjectUID='%s'"
    + " and o2mt.ObjectUID='%s'"
    + " and smt.MediaTypeUID='%s'"
    + " and smt.IsMulti=0"
    + " and t.Name like '%%%s%%'",req.query.target,req.params.ObjectTypeUID,req.params.MediaTypeUID,filter,req.query.target,req.params.ObjectTypeUID,req.params.ObjectUID,req.params.MediaTypeUID,filter)
    console.log(query_string)

    db.all(query_string,function(err,rows) {
      try {
        if(err) {
          throw new KError("910",err)
        }
        if(!rows) {
          rows = []
        }
        res.status(200);
        res.json({'code':0,'data':rows,'errors':undefined});
        logAccess.debug("200: " + query_string)
        return
      } catch(err) {
        switch(err.name) {
          case "910": {
            res.status(500)
            res.json({'code':910,'errors':err.errors})
            logError.error("910: db context error:" + err.errors)
            return
          }
          default: {
            res.status(500)
            res.json({'code':700,'errors':err.errors})
            logError.error("700: db connection error:" + err.errors)
            return
          }
        }
      };
    });
  }
});

var tag = router.route('/tag');

// POST tag data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
tag.post(function(req,res,next){
  req.assert('Name','Name is required').notEmpty();
  req.assert('TagCategoryUID','TagCategoryUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      TagCategoryUID:req.body.TagCategoryUID
    };

    general_create(req,res,"KTag",data);
  }
});

// Tag single route (PUT)
// =============================================================================
var tag_single = router.route('/tag/:uid');

// PUT Tag to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
//            1: object not found
// errors:    errors
// *****************************************************************************
tag_single.put(function(req,res,next){
  var uid = req.params.uid;

  req.assert('Name','Name is required').notEmpty();
  req.assert('TagCategoryUID','TagCategoryUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      Name:req.body.Name,
      TagCategoryUID:req.body.TagCategoryUID
    };

    general_update(req,res,"KTag",data,uid);
  }
});

// =============================================================================
// Object2Tag
// =============================================================================
var object2tag = router.route('/object2tag');

// POST object2tag data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
object2tag.post(function(req,res,next){
  req.assert('TagUID','TagUID is required').notEmpty();
  req.assert('ObjectUID','ObjectUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      TagUID:req.body.TagUID,
      ObjectUID:req.body.ObjectUID
    };

    general_create(req,res,"KObject2Tag",data);
  }
});

// =============================================================================
// Object2MediaTag
// =============================================================================
var object2mediatag = router.route('/object2mediatag');

// POST object2mediatag data to the DB
// *****************************************************************************
// output:
// -------
// status:    0: ok, object found
// id:        id of the new object
// uid:       uid of the new object
// errors:    errors
// *****************************************************************************
object2mediatag.post(function(req,res,next){
  req.assert('TagUID','TagUID is required').notEmpty();
  req.assert('MediaUID','MediaUID is required').notEmpty();
  req.assert('ObjectUID','ObjectUID is required').notEmpty();

  if (general_validation(req,res,next)) {
    var data = {
      TagUID:req.body.TagUID,
      MediaUID:req.body.MediaUID,
      ObjectUID:req.body.ObjectUID
    };

    general_create(req,res,"KObject2MediaTag",data);
  }
});

// =============================================================================
// Picture upload
// =============================================================================

var picture_upload = router.route('/picture/upload/:uuid')

//Posting the file upload
picture_upload.post(function(request, response) {
  console.log(request.body);
  upload(request, response, function(err) {
  if(err) {
    console.log('Error Occured:'+err);
    return;
  }
  response.end('Your File Uploaded');
  })
});

// =============================================================================
// File upload
// =============================================================================

var fileUpload = router.route('/file/upload/:uuid')

//Posting the file upload
fileUpload.post(function(request, response) {
  console.log(request.body);
  file_upload(request, response, function(err) {
  if(err) {
    console.log('Error Occured:'+err);
    return;
  }
  response.end('Your File Uploaded');
  })
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
// id:        id of the new object
// uid:       uid of the new object
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

var tagandpicture = router.route('/tagandpicture/:id_game'); //TODO: id_game???

// GET tagandpictures from the DB
// *****************************************************************************
tagandpicture.get(function(req,res,next){
  var id_game = req.params.id_game;

  req.getConnection(function(err,conn){
    if (err) {
      res.status(500)
      res.json({'code':700,'errors':err})
      logError.error("700: db connection error:" + err)
      return
    } else {
      var query = conn.query("SELECT * FROM KVtagandpicture WHERE id = ? ",[id],function(err,rows){ // TODO: id ????
        if(err){
          console.log(err);
          return next("Database error, check your query");
        }
        res.status(200);
        res.json({'data':rows});
      });
    }
  });
});

// =============================================================================
// start Server
// =============================================================================
app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
