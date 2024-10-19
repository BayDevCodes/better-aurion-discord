// Third-party module
const { Interaction } = require('discord.js'); // Element from the discord.js library

const { findMatches, handleError } = require('../util/functions'); // Local function
const { Main } = require('../util/tables'); // Database table

// Export the event's name & execute function
module.exports = {
  name: 'interactionCreate',

  /** @param {Interaction} interaction */
  execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      return command.autocomplete
        ? command.autocomplete(interaction).catch(error => {
            interaction.respond([
              { name: "Une erreur s'est produite, le développeur a été notifié.", value: 'error' },
            ]);
            handleError(interaction.client, error.stack, interaction.user.username);
          })
        : interaction.respond([
            { name: "Cette autocomplétion n'est plus supportée.", value: 'unsupported' },
          ]);
    }

    if (interaction.isCommand()) {
      Main.add('interactionCount', 1);
      const command = interaction.client.commands.get(interaction.commandName);
      return command.execute
        ? command.execute(interaction).catch(error => {
            interaction.reply({
              content: "*Une erreur s'est produite, le développeur a été notifié.*",
              ephemeral: true,
            });
            handleError(interaction.client, error.stack, interaction.user.username);
          })
        : interaction.reply({ content: "*Cette commande n'est plus supportée.*", ephemeral: true });
    }

    if (interaction.isMessageComponent()) {
      const component = interaction.client.components.get(interaction.customId);
      return component.execute
        ? component.execute(interaction).catch(error => {
            interaction.reply({
              content: "*Une erreur s'est produite, le développeur a été notifié.*",
              ephemeral: true,
            });
            handleError(interaction.client, error.stack, interaction.user.username);
          })
        : interaction.reply({ content: "*Ce composant n'est plus supporté.*", ephemeral: true });
    }
  },
};
