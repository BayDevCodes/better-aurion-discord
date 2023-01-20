// Third-party module
const { Interaction, User } = require("discord.js"); // Element from the discord.js library

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
                ? command.execute(interaction).catch((error) => {
                    const owner = interaction.client.application.owner instanceof User // Is the application managed by an individual or a team?
                        ? interaction.client.application.owner
                        : interaction.client.application.owner.owner;
                    owner.send(`Erreur détectée lors de l'exécution par **${interaction.user.tag}** de la commande \`${command.data.name}\`:\n\`\`\`js\n${error.stack}\n\`\`\``);
                })
                : interaction.reply({ content: '*Cette commande n\'est plus supportée.*', ephemeral: true });
        }

        if (interaction.isMessageComponent()) {
            const component = interaction.client.components.get(interaction.customId);
            return component
                ? component.execute(interaction)
                : interaction.reply({ content: '*Ce composant n\'est plus supporté.*', ephemeral: true });
        }
    }
};
