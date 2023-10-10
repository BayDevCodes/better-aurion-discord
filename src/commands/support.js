// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Signaler un bug, proposer une nouvelle fonctionnalité...'),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const supportEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Serveur de support')
      .setDescription(
        'Tu peux rejoindre le serveur de support de Better Aurion en cliquant **[ici](https://discord.gg/sbnHtU835P)**'
      );

    interaction.reply({ embeds: [supportEmbed], ephemeral: true });
  },
};
