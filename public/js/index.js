/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
strict:true, undef:true, unused:true, curly:true, browser:true, white:true,
moz:true, esnext:false, indent:2, maxerr:50, devel:true, node:true, boss:true,
globalstrict:true, nomen:false, newcap:false */

/*global d3:false, moment:false */

'use strict';

var stationLocs = {
  'king': {'cx': '254.141', 'cy': '425.074', 'r': '5.675'},
  'queen': {'cx': '254.141', 'cy': '403.822', 'r': '5.675'},
  'dundas': {'cx': '254.141', 'cy': '382.478', 'r': '5.675'},
  'donMills': {'cx': '338.195', 'cy': '199.575', 'r': '5.675'},
  'finch': {'cx': '284.184', 'cy': '171.385', 'r': '5.675'},
  'sheppard': {'cx': '284.184', 'cy': '199.575', 'r': '5.675'},
  'eglinton': {'cx': '284.184', 'cy': '228.57', 'r': '5.675'},
  'kennedy': {'cx': '284.184', 'cy': '266.059', 'r': '5.675'},
  'pape': {'cx': '264.025', 'cy': '266.059', 'r': '5.675'},
  'broadview': {'cx': '229.389', 'cy': '265.473', 'r': '5.674'},
  'castleFrank': {'cx': '208.586', 'cy': '265.693', 'r': '5.675'},
  'museum': {'cx': '172.341', 'cy': '309.259', 'r': '5.675'},
  'stGeorge': {'cx': '172.097', 'cy': '287.982', 'r': '5.675'},
  'spadina': {'cx': '143.136', 'cy': '287.982', 'r': '5.675'},
  'highPark': {'cx': '114.214', 'cy': '287.982', 'r': '5.675'},
  'kipling': {'cx': '85.585', 'cy': '287.982', 'r': '5.675'},
  'osgoode': {'cx': '172.341', 'cy': '345.659', 'r': '5.67'}
};

function draw(data) {
  var circles = d3.select('#stationCircles');
  circles.selectAll('.station')
  .data(data).enter().append('circle').attr({
    'title': 'unknown',
    'class': function (room) {
      return 'station ' + room.classname;
    },
    'cx': function (room) {
      return stationLocs[room.classname].cx;
    },
    'cy': function (room) {
      return stationLocs[room.classname].cy;
    },
    'r': function (room) {
      return stationLocs[room.classname].r;
    }
  });
  update(data);
}

function update(data) {
  console.log(data);

  var now = moment();
  var BUSY_FUZZ = 15;

  function free(room) {
    return room.freebusy && room.freebusy.every(function (fb) {
      var fuzzStart = moment(fb.start).subtract('minutes', BUSY_FUZZ);
      var isFree = (fb.type === 'FREE' && now.isAfter(fuzzStart) && now.isBefore(fb.end));
      var isNotNow = !(now.isAfter(fb.start) && now.isBefore(fb.end));
      return (isFree || isNotNow);
    });
  }

  function almostFree(room) {
    return room.freebusy.some(function (fb) {
      return now.isBefore(fb.end) && now.isAfter(moment(fb.end).subtract(BUSY_FUZZ, 'minutes'));
    });
  }

  function reallyBusy(room) {
    return room.freebusy.some(function (fb) {
      return now.isAfter(fb.start) && now.isBefore(moment(fb.end).subtract(BUSY_FUZZ, 'minutes'));
    });
  }

  var timeOrFromNow = function (d) {
    var m = moment(d);
    // if more than 1 hour use the time
    if (m.diff(moment()) > 60 * 60 * 1000) {
      return 'at ' + m.format('h:mma');
    }
    return m.fromNow();
  };

  var freeUntil = function (fb) { return now.isBefore(fb.end); };
  var nextFb = function (room) {
    var fb = room.freebusy.find(freeUntil);
    if (fb) {
      if (now.isAfter(fb.start) && now.isBefore(fb.end)) {
        return 'free ' + timeOrFromNow(fb.end);
      }
      if (now.isBefore(fb.end)) {
        return 'busy ' + timeOrFromNow(fb.end);
      }
    }
    return 'free';
  };

  d3.selectAll('.station').data(data)
    .attr('title', function (room) {
      return nextFb(room);
    }).classed({
      'free': free,
      'almostFree': almostFree,
      'reallyBusy': reallyBusy
    });
}

d3.json('/api/rooms', function (data) {
  draw(data);
});

setInterval(function () {
  d3.json('/api/rooms', function (data) {
    update(data);
  });
}, 60000);

/*

function classAttrs(room) {
  var vidyo = (room.vidyo)? 'vidyo' : '';
  return [vidyo, room.neighborhood, room.size].map(function (r) { return (r)? r+'-room' : r;}).join(' ');
}

var busyNow = function (fb) { return now.isAfter(fb.start) && now.isBefore(fb.end); };



var station = function (room) {
  var stationLoc = stationLocs[room.classname];
  var title = nextFb(room);
  if (title === '') {
    title = 'free';
  }
  return {
    'class': 'station ' + room.classname,
    'title': title,
    'loc': stationLoc
  };
}


<% free.forEach(function (room) { 
  stationInfo = station(room); %>
  <circle class='<%= stationInfo.class %> free' title='<%= stationInfo.title %>'
    <%= stationInfo.loc %> />
<% }); %>
<% almostFree.forEach(function (room) { 
  stationInfo = station(room); %>
  <circle class='<%= stationInfo.class %> almostFree' title='<%= stationInfo.title %>'
    <%= stationInfo.loc %> />
<% }); %>
<% reallyBusy.forEach(function (room) {
  stationInfo = station(room); %>
  <circle class="<%= stationInfo.class %> reallyBusy" title="<%= stationInfo.title %>"
    <%= stationInfo.loc %> />
<% }); %>

*/
