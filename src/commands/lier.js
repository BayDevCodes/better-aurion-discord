// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandMention, initStudent } = require('../util/functions'); // Local functions
const { Promotion } = require('../util/tables'); // Database table
const mails = require('../constants/mails.json'); // Constants regarding the students' mail adresses defined at setup

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('lier')
    .setDescription(`Lier ton compte Discord à ton adresse mail ${mails.domain}.`)
    .addStringOption((option) =>
      option.setName('email').setDescription(`Ton adresse mail ${mails.domain}.`).setRequired(true)
    ),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const email = interaction.options.getString('email').split('@');
    if (!email[1] || email[1] != mails.domain || !mails.students.includes(email[0])) {
      // Validate the mail adress
      const unknownEmbed = new EmbedBuilder()
        .setTitle('Adresse mail invalide')
        .setColor('Red')
        .setDescription(
          `L'adresse \`${email.join(
            '@'
          )}\` n'est pas enregistrée...\n***Si** c'est une erreur, utilise* ${commandMention(
            interaction.client,
            'aled'
          )}`
        );

      return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
    }

    const student = (await Promotion.all()).find((s) => s.value.email === email.join('@')); // Get the student in the database, if any
    if (student) {
      const alreadyLinkedEmbed = new EmbedBuilder()
        .setTitle('Adresse mail déjà utilisée')
        .setColor('Orange')
        .setDescription(
          student.id === interaction.user.id
            ? `L'adresse \`${email.join('@')}\` est déjà liée à ton compte 👌`
            : `L'adresse \`${email.join(
                '@'
              )}\` est déjà liée à [un compte](https://discordapp.com/users/${
                student.id
              })\n***Si** ce n'est pas toi, utilise* ${commandMention(interaction.client, 'aled')}`
        );

      return interaction.reply({ embeds: [alreadyLinkedEmbed], ephemeral: true });
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('Adresse mail liée')
      .setColor('Green')
      .setDescription(
        `L'adresse \`${email.join(
          '@'
        )}\` est liée à ton compte 👌\nTu peux désormais saisir tes notes, calculer tes moyennes et fixer tes objectifs!\n\n⚠️ Par défaut, ton nom apparaîtra dans les classements. Si tu veux y remédier, utilise ${commandMention(
          interaction.client,
          'anonymat'
        )}`
      );
    const termsEmbed = new EmbedBuilder()
      .setTitle("Conditions d'utilisation")
      .setColor('Blurple')
      .setDescription(
        `En utilisant ce service, tu acceptes ses [conditions d'utilisation](${
          process.env.TOS
        }) et sa [politique de confidentialité](${
          process.env.PRIVACY
        }).\n\n⚠️ Si ces conditions ne te conviennent pas, utilise ${commandMention(
          interaction.client,
          'aled'
        )} pour demander la suppression de tes données.`
      );

    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    interaction.followUp({ embeds: [termsEmbed], ephemeral: true });
    initStudent(interaction.user.id, email.join('@')); // Create the student's row in the database
  },
};
