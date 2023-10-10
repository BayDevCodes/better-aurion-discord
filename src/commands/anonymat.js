// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandMention, nameFromEmail } = require('../util/functions'); // Local functions
const { Promotion } = require('../util/tables'); // Database table

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('anonymat')
    .setDescription('Devenir anonyme ou non sur les classements.')
    .addBooleanOption((option) =>
      option
        .setName('anonyme')
        .setDescription('Veux-tu cacher ton nom sur les classements?')
        .setRequired(true)
    ),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const student = await Promotion.get(interaction.user.id); // Get the student from the database, if any
    if (!student) {
      const unlinkedEmbed = new EmbedBuilder()
        .setTitle('Compte non lié')
        .setColor('Orange')
        .setDescription(
          `Ton compte n'est pas lié à une adresse mail Junia...\nUtilise la commande ${commandMention(
            interaction.client,
            'lier'
          )} pour le faire`
        );

      return interaction.reply({ embeds: [unlinkedEmbed], ephemeral: true });
    }

    const anonymous = interaction.options.getBoolean('anonyme');
    const successEmbed = new EmbedBuilder()
      .setTitle('Anonymat modifié')
      .setColor('Blurple')
      .setDescription(
        `*Tu apparaîtras sur les classements tel·le*\n> **${
          anonymous
            ? '🕵️ Anonyme'
            : `[${nameFromEmail(student.email)}](https://discordapp.com/users/${
                interaction.user.id
              })`
        }**`
      );

    interaction.reply({ embeds: [successEmbed], ephemeral: true });
    Promotion.set(`${interaction.user.id}.anonymous`, anonymous);
  },
};
