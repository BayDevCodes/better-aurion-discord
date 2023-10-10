// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { Main } = require('../util/tables'); // Database table

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('aled')
    .setDescription('Contacter un·e des référent·e·s en cas de problème.'),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const refereesEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Référent·e·s')
      .setDescription('Voici la liste des référent·e·s de cette instance de Better Aurion:');

    const referees = await Main.get('referees');
    if (!referees?.length) {
      refereesEmbed.setDescription("*Il n'y a aucun·e référent·e pour le moment*");
      return interaction.reply({ embeds: [refereesEmbed], ephemeral: true });
    }

    for (const refereeId of referees)
      refereesEmbed.data.description += `\n> <@${refereeId}> *[Mention cassée?](https://discordapp.com/users/${refereeId})*`;
    interaction.reply({ embeds: [refereesEmbed], ephemeral: true });
  },
};
