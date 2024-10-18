// Third-party module
const {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SelectMenuBuilder,
  SlashCommandBuilder,
} = require('discord.js'); // Elements from the discord.js library

const { weightsChart } = require('../util/functions'); // Local function

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('coefficients')
    .setDescription('Voir comment sont calculées tes moyennes.'),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const weightsEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Coefficients de la moyenne générale')
      .setImage(weightsChart()); // Create a chart with general's unit weights

    /** @type {SelectMenuBuilder} */
    const unitSelectMenu = interaction.client.components.get('chooseUnit').data;
    unitSelectMenu.setPlaceholder("Voir les coefficients d'une unité en détail");

    interaction.reply({
      components: [new ActionRowBuilder().addComponents(unitSelectMenu)], // Add the unit select menu
      embeds: [weightsEmbed],
      ephemeral: true,
    });
  },
};
