// cronJob.js
const cron = require('node-cron');
const SalesAgent = require('../models/salesAgent'); // Adjust path if needed
const sendNotificationToPlayer = require('./sendNotification');

const title = 'Order Reminder';
const message = 'Hello! This is your scheduled order reminder.';

const sendNotificationsToAgents = async () => {
  try {
    const agents = await SalesAgent.find({ routeStatus: true });

    for (const agent of agents) {
      if (agent.oneSignalPlayerId) {
        await sendNotificationToPlayer(agent.oneSignalPlayerId, title, message, {
          agentId: agent._id.toString(),
          routeStatus: agent.routeStatus.toString(),
        });
      }
    }

    console.log(`✅ Scheduled notifications sent to ${agents.length} agents`);
  } catch (error) {
    console.error('❌ Error sending scheduled notifications:', error.message);
  }
};

// Run every 1 minute
cron.schedule('0 * * * *', sendNotificationsToAgents);
