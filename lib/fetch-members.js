const config = require('../config');
const rp = require('request-promise');
const EventEmitter = require('events');
class MembersEmitter extends EventEmitter {}

const requestMembers = async function (settings) {
  // if there is no groupId, then accessToken is actually the url
  const url = settings.url || `${ config.fbUrl }/${ settings.groupId }/members?access_token=${ settings.accessToken }&limit=500`;
  const result = [];
  const emmiter = settings.emmiter || new MembersEmitter();
  let resp;

  try {
    resp = await rp(url);
  } catch (err) {
    console.error('ERROR WHILE FETCHINGS GROUPS');
    console.error(err);
    emmiter.emit('error', err);
  }

  try {
    resp = JSON.parse(resp);
  } catch (err) {
    console.log('Unable to parse resp as JSON');
    emmiter.emit('error', err);
  }

  if(resp) {
    emmiter.emit('load', {
      resp: resp,
    });

    result.push.apply(result, resp.data);

    if(resp.paging.next) {
      requestMembers({
        url: resp.paging.next,
        emmiter: emmiter,
      });
    } else {
      emmiter.emit('end');
    }
  } else {
    console.error('Retrying to fetch ', url);
    requestMembers({
      url: resp.paging.next,
      emmiter: emmiter,
    });
  }

  return emmiter;
};

module.exports = requestMembers;
