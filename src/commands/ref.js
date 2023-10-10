// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Classes from the discord.js library

const { calculateAverages, commandChoices, getMarkId } = require('../util/functions'); // Local functions
const { Main, Marks, Promotion } = require('../util/tables'); // Database tables

// Export the command's data & execute function
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ref')
    .setDescription('Commandes utilisables uniquement par un·e référent·e.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publier')
        .setDescription("Permettre l'ajout d'une nouvelle note aux étudiants.")
        .addStringOption((option) =>
          option
            .setName('unité')
            .setDescription("Unité d'enseignement concernée par la note.")
            .addChoices(...commandChoices('units'))
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('module')
            .setDescription('Module concerné par la note.')
            .addChoices(...commandChoices('modules'))
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Type de la note.')
            .addChoices(...commandChoices('types'))
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('numéro')
            .setDescription('Combientième note de ce type?')
            .setMinValue(1)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('nom')
            .setDescription('Nom arbitraire de la note.')
            .setMaxLength(64) // Prevents the user from entering a too long string
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('retirer')
        .setDescription('⚠️ Retirer une note et les résultats associés (irréversible).')
        .addStringOption((option) =>
          option
            .setName('identifiant')
            .setDescription(
              "L'identifiant de la note (exemple: MATH_M1_CC_1) ou le début de son nom pour une liste d'options."
            )
            .setAutocomplete(true)
            .setMaxLength(64) // Prevents the user from entering a too long string
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('supprimer')
        .setDescription(
          "⚠️ Supprimer les données et libérer l'adresse mail associées à un compte Discord (irréversible)."
        )
        .addUserOption((option) =>
          option
            .setName('compte')
            .setDescription(
              'Le compte Discord à "supprimer" (s\'il n\'apparaît pas dans la liste, utilise son ID).'
            )
            .setRequired(true)
        )
    ),

  /** @param {ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    if (!(await Main.get('referees'))?.some((r) => r === interaction.user.id)) {
      // This command is restricted to the referees who are responsible of accounts & marks
      const restrictedEmbed = new EmbedBuilder()
        .setTitle('Commande restreinte')
        .setColor('Red')
        .setDescription('*Cette commande est réservée aux référent·e·s*');

      return interaction.reply({ embeds: [restrictedEmbed], ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'supprimer') {
      const user = interaction.options.getUser('compte');

      const student = await Promotion.get(user.id); // Get the student, if any associated with the user
      if (!student) {
        const notLinkedEmbed = new EmbedBuilder()
          .setTitle('Compte non lié')
          .setColor('Orange')
          .setDescription("Ce compte n'est pas lié à une adresse mail Junia.");

        return interaction.reply({ embeds: [notLinkedEmbed], ephemeral: true });
      }

      const deletedEmbed = new EmbedBuilder()
        .setTitle('Compte supprimé')
        .setColor('Green')
        .setDescription(`L'adresse mail \`${student.email}\` est à présent disponible.`)
        .setFooter({ text: 'Les données qui y étaient associées ont été supprimées' });

      interaction.reply({ embeds: [deletedEmbed], ephemeral: true });
      return Promotion.delete(user.id);
    }

    if (subcommand === 'retirer') {
      const markId = interaction.options.getString('identifiant');

      const markName = await Marks.get(markId); // Get the mark name, if any
      if (!markName) {
        const unknownEmbed = new EmbedBuilder()
          .setColor('Orange')
          .setTitle('Note inconnue')
          .setDescription('Aucune note ne correspond à cet identifiant.');

        return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
      }

      const deletedEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('Note retirée')
        .setDescription(`La note a été retirée avec succès`)
        .setFooter({ text: `[${markId}] ${markName}` });
      interaction.reply({ embeds: [deletedEmbed], ephemeral: true }); // Sending response before other steps that take time

      // Do this for every student in the database
      for (const student of await Promotion.all()) {
        await Promotion.pull(`${student.id}.marks`, (m) => m.id === markId); // Remove the deleted mark
        Promotion.set(
          `${student.id}.averages`,
          calculateAverages(await Promotion.get(`${student.id}.marks`))
        ); // Update the averages object
      }
      return Marks.delete(markId);
    }

    const unit = interaction.options.getString('unité');
    const module = interaction.options.getString('module');
    const type = interaction.options.getString('type');
    const number = interaction.options.getInteger('numéro');

    const markId = getMarkId(unit, module, type, number); // Validate the id
    if (!markId) {
      const invalidEmbed = new EmbedBuilder()
        .setTitle('Combinaison invalide')
        .setColor('Red')
        .setDescription("Cette combinaison d'unité, de module et de type de note n'existe pas.");

      return interaction.reply({ embeds: [invalidEmbed], ephemeral: true });
    }

    let markName = await Marks.get(markId); // Is this mark id already in the database?
    if (markName) {
      const alreadyEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('Note déjà publiée')
        .setDescription('Cette note est déjà publiée.')
        .setFooter({ text: `[${markId}] ${markName}` });

      return interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
    }

    markName = interaction.options.getString('nom');
    const publishedEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('Note publiée')
      .setDescription(`Cette note a été publiée avec succès`)
      .setFooter({ text: `[${markId}] ${markName}` });

    interaction.reply({ embeds: [publishedEmbed], ephemeral: true });
    Marks.set(markId, markName);
  },
};
