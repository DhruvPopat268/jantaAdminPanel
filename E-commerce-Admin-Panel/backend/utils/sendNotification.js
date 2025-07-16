const axios = require('axios');

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

const sendNotificationToPlayer = async (playerId, title, message, data = {}) => {
  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: process.env.ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    console.log(`✅ Notification sent to ${playerId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${playerId}:`, error.response?.data || error.message);
    return null;
  }
};

module.exports = sendNotificationToPlayer;
