// Third-party modules
const { ActivityType, Client, Options } = require('discord.js'); // Elements from the discord.js library

// Create a new Discord client instance and prepare it for connection
require('./util/functions').start(
  new Client({
    intents: [], // Make it receive the less amount of events possible to save RAM
    makeCache: Options.cacheWithLimits({ UserManager: 0 }), // This saves RAM especially in large servers
    presence: { activities: [{ name: 'vos moyennes 💯', type: ActivityType.Watching }] }, // Set the bot user's status
  })
);
