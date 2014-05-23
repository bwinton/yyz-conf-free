yyz-conf-free
=============

A node.js server that gathers the Mozilla YYZ conference room FreeBusy information in an effort to display the conference rooms that are currently available for use. You can see a working example at:

* http://yyz-conf-free.paas.allizom.org/

Getting Started
=============

    npm install
    npm start

Endpoints and API
=============

* Main Widget
  * http://0.0.0.0:3002/
* All Rooms and related Free / Busy information
  * http://0.0.0.0:3002/api/rooms
* Only rooms currently busy
  * http://0.0.0.0:3002/api/rooms/busy
* Only rooms currently free
  * http://0.0.0.0:3002/api/rooms/free

( NOTE: currently busy and free also includes a 5 min start time 'fuzz' where a room will be included if it is about to become free or busy )

Screenshot
=============

http://f.cl.ly/items/0F3C3i0g1l2p0U0e2v06/yyz-conf-free.png

YYZ Supported Conference Rooms
=============

* Kipling : tor-5p

Zimbra ICS Calendar URL Format:

    https://mail.mozilla.com/home/$EMAIL/Calendar?fmt=ifb&date=$DATE

Where `$EMAIL` = conf room email AND `$DATE` = moment.format("YYYYMMDD")
