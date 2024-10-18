// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandMention } = require('../util/functions'); // Local function
const { Promotion } = require('../util/tables'); // Database table
const marks = require('../constants/marks.json'); // Constants regarding the marks defined at setup

const units = Object.keys(marks.weights);
const builder = new SlashCommandBuilder()
  .setName('objectifs')
  .setDescription("Fixer tes objectifs de moyenne pour chaque unité d'enseignement.");

// Add an option for each unit defined in the constants
for (const unitId of units) {
  /** @type {String} */
  const unitName = marks.names.units[unitId];

  builder.addNumberOption(option =>
    option
      .setName(unitName.replace(/(, )| /g, '_').toLowerCase())
      .setDescription(`Quelle moyenne voudrais-tu avoir en ${unitName} ?`)
      .setMinValue(10)
      .setMaxValue(20)
  );
}

// Export the command's data & execute function
module.exports = {
  data: builder,

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const student = await Promotion.get(interaction.user.id); // Get the student in the database
    if (!student) {
      const unknownEmbed = new EmbedBuilder()
        .setTitle('Compte non lié')
        .setColor('Orange')
        .setDescription(
          `Ton compte n'est pas lié à une adresse mail Junia...\nUtilise la commande ${commandMention(
            interaction.client,
            'lier'
          )} pour le faire`
        );

      return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
    }

    /** @type {{ [unitId: String]: Number }} */
    const newGoals = {}; // Initialize the new goals object
    let description = '';
    for (const unitId of units) {
      /** @type {String} */
      const unitName = marks.names.units[unitId];
      const goal =
        Math.round(
          interaction.options.getNumber(unitName.replace(/(, )| /g, '_').toLowerCase()) * 100
        ) / 100; // Round the input value to 2 decimal digits if any

      description += `> ${unitName}: \`${student.goals[unitId]}\`${
        goal ? ` -> \`${goal}\`` : ''
      }\n`; // Format each unit line
      newGoals[unitId] = goal ? goal : student.goals[unitId]; // Set the new value if any in the goals object or the existing one
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('Tes objectifs de moyenne')
      .setColor('Blurple')
      .setDescription(description);

    interaction.reply({ embeds: [successEmbed], ephemeral: true });
    Promotion.set(`${interaction.user.id}.goals`, newGoals); // Replace the student's goals object with the new one
  },
};
