// Third-party module
const {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SelectMenuBuilder,
  SlashCommandBuilder,
} = require('discord.js'); // Elements from the discord.js library

const { averagesChart, commandMention } = require('../util/functions'); // Local functions
const { Main, Marks, Promotion } = require('../util/tables'); // Database tables
const marks = require('../constants/marks.json'); // Constants regarding the marks defined at setup

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('moyennes')
    .setDescription('Voir ta moyenne générale et le détail par unité, module et type de note.'),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const student = await Promotion.get(interaction.user.id); // Get the student in the database
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

    const publishedMarkCount = (await Marks.all()).length;
    if (!publishedMarkCount) {
      const noMarksEmbed = new EmbedBuilder()
        .setTitle('Aucune note publiée')
        .setColor('Orange')
        .setDescription("Tu n'as donc aucune moyenne pour le moment...");

      return interaction.reply({ embeds: [noMarksEmbed], ephemeral: true });
    }

    const generalAverage = student.averages.general;
    if (generalAverage === null) {
      // This appends when the student has not added any mark or only absences
      const noAverageEmbed = new EmbedBuilder()
        .setTitle('Moyenne indisponible')
        .setColor('Orange')
        .setDescription("Tu n'as pas encore de moyenne...");

      return interaction.reply({ embeds: [noAverageEmbed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }); // A step is involving a third-party API so more time is needed

    const names = [],
      values = []; // Initialize name & value arrays to use in the chart
    for (const unitId of Object.keys(marks.weights)) {
      names.push(marks.names.units[unitId]);
      values.push(student.averages[unitId].self);
    }
    const promotionAverages = await Main.get('promotionAverages');
    const promotionValues = promotionAverages // Are promotion averages available?
      ? Object.keys(promotionAverages)
          .slice(0, -1)
          .map((unitId) => promotionAverages[unitId].self)
      : [];

    const missingMarks =
      student.marks.length < publishedMarkCount
        ? `⚠️ *Tu n'as pas ajouté toutes les notes publiées (${
            student.marks.length
          }/${publishedMarkCount}),\nUtilise la commande* ${commandMention(
            interaction.client,
            'notes manquantes'
          )} *pour voir lesquelles.*\n\n`
        : '';

    /** @type {SelectMenuBuilder} */
    const unitSelectMenu = interaction.client.components.get('chooseUnit').data;
    unitSelectMenu.setPlaceholder("Voir la moyenne d'une unité en détail");
    const file = await averagesChart(
      names,
      values,
      promotionValues,
      'unité',
      Object.values(student.goals)
    ); // Generate the Quickchart attachment
    const averageEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Moyenne générale')
      .setDescription(
        `${missingMarks}*Ta moyenne générale est de \`${generalAverage}\`${
          promotionAverages && promotionAverages.general !== null
            ? ` [promo: \`${promotionAverages.general}\`]`
            : ''
        }\net voici le détail par unité d'enseignement:*`
      )
      .setImage('attachment://chart.png'); // Add the chart attachment to the embed

    interaction.editReply({
      components: [new ActionRowBuilder().addComponents(unitSelectMenu)], // Add the unit select menu
      embeds: [averageEmbed],
      files: [file], // Include the chart attachment so it can be displayed
    }); 
  },
};
