// utils/updateAgentTags.js
const axios = require('axios');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

const updateAgentTags = async (playerId, tags) => {
  try {
    const response = await axios.put(
      `https://onesignal.com/api/v1/players/${playerId}`,
      {
        app_id: ONESIGNAL_APP_ID,
        tags: tags,
      },
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✓ Tags updated for player ${playerId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to update tags for player ${playerId}`, error.response?.data || error.message);
    return false;
  }
};

module.exports = updateAgentTags;
