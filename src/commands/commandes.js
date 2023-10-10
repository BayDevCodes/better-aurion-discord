// Third-party module
const {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  User,
} = require('discord.js'); // Elements from the discord.js library

const { commandMention } = require('../util/functions'); // Local function
const { Main } = require('../util/tables'); // Database table

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandes')
    .setDescription('Voir la liste complète des commandes disponibles.'),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const helpEmbed = new EmbedBuilder().setColor('Blurple').setTitle('Commandes disponibles');
    const ownerId =
      interaction.client.application.owner instanceof User // Is the application managed by an individual or a team?
        ? interaction.client.application.owner.id
        : interaction.client.application.owner.ownerId;

    helpEmbed.data.description = '';
    for (const command of interaction.client.commands) {
      // Do this for each command loaded in the current instance
      /** @type {SlashCommandBuilder} */
      const builder = command[1].data;
      if (builder.name === 'dev' && interaction.user.id !== ownerId) continue; // Show the "dev" command to the appplication manager only
      if (
        builder.name === 'ref' &&
        !(await Main.get('referees'))?.some((r) => r === interaction.user.id)
      )
        continue; // Show the "ref" command to the referees only

      const subCommands = builder.options.filter((o) => o.options);
      if (!subCommands.length)
        helpEmbed.data.description += `${commandMention(interaction.client, builder.name)} *${
          builder.description
        }*\n`;
      else
        subCommands.forEach(
          (s) =>
            (helpEmbed.data.description += `${commandMention(
              interaction.client,
              `${builder.name} ${s.name}`
            )} *${s.description}*\n`)
        );
    }

    interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  },
};
