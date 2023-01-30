const express = require('express');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const validator = require('express-validator');
const passport = require('passport');
const flash = require('connect-flash');
const toastr = require('express-toastr');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const { database } = require('./keys');
const pool = require('./database');
const app = express();

require('./lib/passport');

app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  layoutsDir: path.join(app.get('views'), 'layouts'),
  partialsDir: path.join(app.get('views'), 'partials'),
  extname: '.hbs',
  helpers: require('./lib/handlebars')
}));
app.set('view engine', '.hbs');

var hbs = require('handlebars');
hbs.registerHelper('loud', function (aString) {
  return aString.toUpperCase()
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
    case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default: return options.inverse(this);
  }
});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: 'dansworkshop',
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(database)
}));

app.use(flash());
app.use(toastr());
app.use(passport.initialize());
app.use(passport.session());
app.use(validator());

app.use((req, res, next) => {
  app.locals.user = req.user;
  app.locals.toastr = req.toastr.render();
  next();
});

app.use(require('./routes/index'));
app.use(require('./routes/authentication'));
app.use('/customers', require('./routes/customers'));
app.use('/users', require('./routes/users'));
app.use('/enterprises', require('./routes/enterprises'));
app.use('/repairs', require('./routes/repairs'));

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(app.get('port'), () => {
  console.log('Server is in port', app.get('port'));
});

app.use(function (req, res, next) {
  res.status(404).render('404');
});

const SocketIO = require('socket.io');
const io = SocketIO.listen(server);

io.on('connection', async (socket) => {
  console.log('Connected with socket in id', socket.id);
  socket.on('customerEvent', async (customerClient) => {
    var customerSelect = customerClient.customerClient;
    const customerDB = await pool.query("SELECT * FROM customers WHERE identification=? ORDER BY names ASC;", [customerSelect]);
    socket.emit('customerEventConsult', customerDB);
  });

  socket.on('repairsEvent', async (statusRepairs) => {
    var statusSelect = statusRepairs.statusRepairs;
    var repairsDB;
    if (statusSelect == '0') {
      repairsDB = await pool.query("SELECT * FROM repairs;");
    } else {
      repairsDB = await pool.query("SELECT * FROM repairs WHERE status=?;", [statusSelect]);
    };
    socket.emit('repairsEventConsult', repairsDB);
  });
});