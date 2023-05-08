// Third-party module
const { Interaction } = require("discord.js"); // Element from the discord.js library

const { handleError } = require("../util/functions"); // Local function
const { Main } = require("../util/tables"); // Database table

// Export the event's name & execute function
module.exports = {
    name: 'interactionCreate',

    /** @param {Interaction} interaction */
    execute(interaction) {
        Main.add('interactionCount', 1);

        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            return command
                ? command.execute(interaction).catch((error) => handleError(interaction.client, error.stack, interaction.user.username))
                : interaction.reply({ content: '*Cette commande n\'est plus supportée.*', ephemeral: true });
        }

        if (interaction.isMessageComponent()) {
            const component = interaction.client.components.get(interaction.customId);
            return component
                ? component.execute(interaction).catch((error) => handleError(interaction.client, error.stack, interaction.user.username))
                : interaction.reply({ content: '*Ce composant n\'est plus supporté.*', ephemeral: true });
        }
    }
};
