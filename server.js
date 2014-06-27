/*! This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/* jshint strict: true, node: true */

'use strict';

// https://www.npmjs.org/package/ical
var ical = require('ical');

var format = require('util').format;

var express = require('express');

var moment = require('moment');

var CALENDAR_INTERVAL = 5; // in minutes

var BUSY_FUZZ = 15;

moment.lang('en', {
    relativeTime : {
        future: 'in %s',
        past:   '%s ago',
        s:  'a jiff',
        m:  '%dm',
        mm: '%dm',
        h:  '%dh',
        hh: '%dh',
        d:  'a day',
        dd: '%d days',
        M:  'a month',
        MM: '%d months',
        y:  'a year',
        yy: '%d years'
    }
});


// ICS calendar URL format, first %s requires email, second %s requires date in 20140516 format
// thanks to this: http://www.zimbra.com/forums/users/16877-only-publish-free-busy-information-icalendar.html#post88423
var ics = 'https://mail.mozilla.com/home/%s/Calendar?fmt=ifb&date=%s';

// room names and ids for all the Mozilla YYZ conference rooms
var rooms = [
  { name: 'King', id: '5a', classname: 'king', neighborhood: 'south', vidyo: false, size: 'small' },
  { name: 'Queen', id: '5b', classname: 'queen', neighborhood: 'south', vidyo: false, size: 'small' },
  { name: 'Dundas', id: '5c', classname: 'dundas', neighborhood: 'south', vidyo: false, size: 'small' },
  { name: 'Don Mills', id: '5d', classname: 'donMills', neighborhood: 'northeast', vidyo: false, size: 'medium' },
  { name: 'Finch', id: '5e', classname: 'finch', neighborhood: 'northeast', vidyo: true, size: 'large' },
  { name: 'Sheppard', id: '5f', classname: 'sheppard', neighborhood: 'northeast', vidyo: false, size: 'large' },
  { name: 'Eglinton', id: '5g', classname: 'eglinton', neighborhood: 'northeast', vidyo: false, size: 'large' },
  { name: 'Kennedy', id: '5h', classname: 'kennedy', neighborhood: 'northeast', vidyo: false, size: 'small' },
  { name: 'Pape', id: '5i', classname: 'pape', neighborhood: 'northeast', vidyo: false, size: 'small' },
  { name: 'Broadview', id: '5j', classname: 'broadview', neighborhood: 'central', vidyo: false, size: 'small' },
  { name: 'Castle Frank', id: '5k', classname: 'castleFrank', neighborhood: 'central', vidyo: false, size: 'small' },
  { name: 'Museum', id: '5l', classname: 'museum', neighborhood: 'west', vidyo: false, size: 'small' },
  { name: 'St. George', id: '5m', classname: 'stGeorge', neighborhood: 'west', vidyo: false, size: 'small' },
  { name: 'Spadina', id: '5n', classname: 'spadina', neighborhood: 'west', vidyo: true, size: 'medium' },
  { name: 'High Park', id: '5o', classname: 'highPark', neighborhood: 'west', vidyo: true, size: 'medium' },
  { name: 'Kipling', id: '5p', classname: 'kipling', neighborhood: 'west', vidyo: true, size: 'large' },
  { name: 'Osgoode', id: 'commons', classname: 'commons', neighborhood: 'southwest', vidyo: true, size: 'x-large' },
  { name: 'Union', id: 'mozspace', classname: 'mozspace', neighborhood: 'southwest', vidyo: false, size: 'x-large' },
].map(function(i) { i.freebusy = []; return i;});

// util function to convert a Mozilla room id into a YYZ
// @mozilla email address.  Means less repeated info and perhaps less spam
function atMozYYZ(id) {
  return 'tor-' + id + '@mozilla.com';
}

function getFreeBusy() {
  var now = moment();

  console.log('getFreeBusy', now.format('h:mma'));

  rooms.forEach(function (room) {

    var url = format(ics, atMozYYZ(room.id), now.format('YYYYMMDD'));

    ical.fromURL(url, {},
      function(err, data) {
        if (err) {
          console.error(err);
          return;
        }

        var today = function (fb) {
          // we only need the items that are within today's free/busy timeframe
          return now.isSame(fb.start, 'day') || now.isSame(fb.end, 'day') ||
                 now.isAfter(fb.start) && now.isBefore(fb.end);
        };

        for (var k in data){
          if (data.hasOwnProperty(k)){
            var ev = data[k];
            if (ev.type && ev.type === 'VFREEBUSY' && typeof ev.freebusy !== 'undefined') {
              room.freebusy = ev.freebusy.filter(today);
            } else {
              room.freebusy = [];
            }
          }
        }

      }
    );
  });


  // add CALENDAR_INTERVAL min or the remainder of CALENDAR_INTERVAL min
  now.add('minutes', (CALENDAR_INTERVAL - (now.minutes() % CALENDAR_INTERVAL)));
  console.log('next run', now.fromNow());

  // run every CALENDAR_INTERVAL min on the CALENDAR_INTERVAL
  // use the diff against the current time for milliseconds
  setTimeout(getFreeBusy, now.diff());
}

// Both free and busy methods use a 5 min start fuzz such that they will return something
// that is about to be free or about to be busy
function busy(rs) {
  var now = moment();
  return rs.filter(function (room) {
    return room.freebusy && room.freebusy.some(function (fb) {
      var fuzzStart = moment(fb.start).subtract('minutes', BUSY_FUZZ);
      // console.log(room.name, 'busy', fuzzStart.fromNow(), 'and free again', moment(fb.end).fromNow());
      return fb.type === 'BUSY' && now.isAfter(fuzzStart) && now.isBefore(fb.end);
    });
  });
}

function free(rs) {
  var now = moment();
  return rs.filter(function (room) {
    return room.freebusy && room.freebusy.every(function (fb) {
      var fuzzStart = moment(fb.start).subtract('minutes', BUSY_FUZZ);
      var isFree = (fb.type === 'FREE' && now.isAfter(fuzzStart) && now.isBefore(fb.end));
      var isNotNow = !(now.isAfter(fb.start) && now.isBefore(fb.end));
      return (isFree || isNotNow);
    });
  });
}

// EXPRESS

var app = express();

app.use(express.static(__dirname + '/public'));

// JSON API

app.get('/api/rooms', function(req, res){
  res.send(rooms);
});

app.get('/api/rooms/free', function(req, res){
  res.send(free(rooms));
});

app.get('/api/rooms/busy', function(req, res){
  res.send(busy(rooms));
});

// HTML WIDGET

// expose moment to ejs
app.locals.moment = function(date) {
  return moment(date);
};

app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.get('/', function(req, res){
  res.render('index', {
    rooms: rooms,
    busy: busy(rooms),
    free: free(rooms),
    title: 'YYZ Conference Rooms'
  });
});

app.get('/list', function(req, res){
  res.render('list', {
    rooms: rooms,
    busy: busy(rooms),
    free: free(rooms),
    title: 'YYZ Conference Rooms'
  });
});

var server = app.listen(Number(process.env.PORT || 5000), function() {
  getFreeBusy();
  console.log('NODE_ENV=%s http://%s:%d', app.settings.env, server.address().address, server.address().port);
});
