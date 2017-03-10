const config = require('../config');
const rp = require('request-promise');

module.exports = async function (accessToken) {
  const url = `${ config.fbUrl }/me/groups?access_token=${ accessToken }`
  let result;

  try {
    result = await rp(url);
  } catch (err) {
    console.error('ERROR WHILE FETCHINGS GROUPS');
    console.error(err);
  }

  try {
    result = JSON.parse(result);
  } catch (err) {
    console.log('Unable to parse result as JSON');
  }

  return result;
};
