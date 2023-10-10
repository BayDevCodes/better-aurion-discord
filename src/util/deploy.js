// Third-party modules
const { REST, Routes } = require('discord.js'); // Elements from the discord.js library
const { readdirSync } = require('fs'); // Function to read the content of a directory

console.log('>>> Starting...');
require('dotenv').config(); // Load the environment variables to the process.env object

console.log('\n\n>>> loading commands...');
const commands = []; // Initialize the commands list

readdirSync('./src/commands').forEach((file) => {
  const command = require(`../commands/${file}`); // Import the command

  commands.push(command.data.toJSON()); // Add it to the commands list
  console.log(`${command.data.name} slash command ready to deploy!`);
});

console.log('\n\n>>> deploying commands...');
const rest = new REST().setToken(process.env.BOT_TOKEN); // Create an HTTP client
const route = Routes.applicationCommands(process.env.CLIENT_ID); // Set the route to send the commands to Discord's API

// Try to make a request to reupload the application's commands to Discord
try {
  rest.put(route, { body: commands }).then((data) => {
    console.log(`\n-> Successfully deployed ${data.length} application commands!\n`);
    data.forEach((command) => console.log(`- ${command.name} | ${command.id}`)); // Log each sent command with it's id
  });
} catch {
  console.error(); // In case the request is messed up
} 
