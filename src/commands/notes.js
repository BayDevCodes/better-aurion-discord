// Third-party module
const { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandChoices, commandMention, getMarkId, predictMark, calculateAverages } = require('../util/functions'); // Local functions
const { Marks, Promotion } = require('../util/tables'); // Database tables

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('notes')
        .setDescription('Ajouter une de tes notes ou en prévoir une à venir.')
        .addSubcommand(subcommand => subcommand
            .setName('ajoutées')
            .setDescription('Voir les notes que tu as ajoutées.')
        )
        .addSubcommand(subcommand => subcommand
            .setName('manquantes')
            .setDescription('Voir les notes publiées que tu n\'as pas ajoutées.')
        )
        .addSubcommand(subcommand => subcommand
            .setName('prévoir')
            .setDescription('Prévoir une de tes prochaines notes.')
            .addStringOption(option => option
                .setName('unité')
                .setDescription('Unité d\'enseignement concernée par la note.')
                .setRequired(true)
                .addChoices(...commandChoices('units'))
            )
            .addStringOption(option => option
                .setName('matière')
                .setDescription('Cours concerné par la note.')
                .setRequired(true)
                .addChoices(...commandChoices('courses'))
            )
            .addStringOption(option => option
                .setName('type')
                .setDescription('Type de la note.')
                .setRequired(true)
                .addChoices(...commandChoices('types'))
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('saisir')
            .setDescription('Ajouter une de tes notes ou la modifier si elle l\'est déjà.')
            .addStringOption(option => option
                .setName('identifiant')
                .setDescription('L\'identifiant de la note à saisir (exemple: MATH_M1_CC_1).')
                .setMaxLength(64) // Prevents the user from entering a too long string
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName('résultat')
                .setDescription('Ta note (laisser vide si non noté·e).')
                .setMinValue(0)
                .setMaxValue(20)
            )
        ),

    /** @param {ChatInputCommandInteraction} interaction */
    async execute(interaction) {
        const student = await Promotion.get(interaction.user.id); // Get the student from the database
        if (!student) {
            const unknownEmbed = new EmbedBuilder()
                .setTitle('Compte non lié')
                .setColor('Orange')
                .setDescription(`Ton compte n'est pas lié à une adresse mail Junia...\nUtilise la commande ${commandMention(interaction.client, 'lier')} pour le faire`);

            return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'ajoutées':
                if (!student.marks.length) {
                    const noMarksEmbed = new EmbedBuilder()
                        .setTitle('Aucune note')
                        .setColor('Orange')
                        .setDescription(`Tu n\'as ajouté aucune note pour le moment, utilise ${commandMention(interaction.client, 'notes saisir')} pour le faire.`);

                    return interaction.reply({ embeds: [noMarksEmbed], ephemeral: true });
                }

                // Complicated stuff to format marks with their name and the value got by the student (using promises as database methods are async)
                const firstPage = await Promise.all(student.marks.slice(0, 10).map(async mark => `> \`${mark.id}\` *${await Marks.get(mark.id)}* **${mark.value < 0 ? 'non noté·e' : `avec ${mark.value}`}**`));
                const marksEmbed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('Notes ajoutées')
                    .setDescription(`Tu peux utiliser ${commandMention(interaction.client, 'notes saisir')} pour modifier les notes suivantes:\n${firstPage.join('\n')}`)
                    .setFooter({ text: `Page 1 sur ${Math.ceil(student.marks.length / 10)}` }); // Set the page to 1

                return interaction.reply({ components: student.marks[10] ? [new ActionRowBuilder().addComponents(interaction.client.components.get('next').data)] : [], embeds: [marksEmbed], ephemeral: true });

            case 'manquantes':
                const publishedMarks = await Marks.all();
                if (student.marks.length === publishedMarks.length) {
                    const noMissingMarksEmbed = new EmbedBuilder()
                        .setTitle('Rien à signaler')
                        .setColor('Green')
                        .setDescription(`Tu as ajouté toutes les notes disponibles,\ntu appartiens donc actuellement au ${commandMention(interaction.client, 'classement moyennes')} de la promo`);

                    return interaction.reply({ embeds: [noMissingMarksEmbed], ephemeral: true });
                }

                const missingMarks = publishedMarks.filter(publishedMark => !student.marks.some(mark => mark.id === publishedMark.id));
                const missingMarksEmbed = new EmbedBuilder()
                    .setTitle('Notes manquantes')
                    .setColor('Blurple')
                    .setDescription(`Utilise ${commandMention(interaction.client, 'notes saisir')} pour ajouter les notes disponibles suivantes:\n${missingMarks.slice(0, 10).map(missingMark => `> \`${missingMark.id}\` *${missingMark.value}*`).join('\n')}`)
                    .setFooter({ text: 'Il faut avoir ajouté toutes ses notes pour appartenir au classement de la promo' });

                if (missingMarks.length > 10) missingMarksEmbed.data.description += `\n> *Et ${missingMarks.length - 10} autre(s)...*`; // Prevent the embed from being too long
                return interaction.reply({ embeds: [missingMarksEmbed], ephemeral: true });

            case 'prévoir':
                const unit = interaction.options.getString('unité');
                const course = interaction.options.getString('matière');
                const type = interaction.options.getString('type');

                const markId = getMarkId(unit, course, type); // Validate the id
                if (!markId) {
                    const invalidEmbed = new EmbedBuilder()
                        .setTitle('Combinaison invalide')
                        .setColor('Red')
                        .setDescription('Cette combinaison d\'unité, de cours et de type de note n\'existe pas.');

                    return interaction.reply({ embeds: [invalidEmbed], ephemeral: true });
                }

                const goal = student.goals[unit];
                const predictedMark = predictMark(student, goal, unit, course, type);

                const predictionEmbed = new EmbedBuilder()
                    .setTitle('Prévision calculée')
                    .setColor('Blurple')
                    .setFooter({ text: `Identifiant: [${markId}]` });

                if (predictedMark < 0) predictionEmbed.setDescription(`Bonne nouvelle, même avec un \`0\` à cette note,\nton objectif de \`${goal}\` est atteint!`);
                if (predictedMark > 20) predictionEmbed.setDescription(`Mauvaise nouvelle, même avec un \`20\` à cette note,\nton objectif de \`${goal}\` n'est pas atteint...`);
                if (!predictionEmbed.data.description) predictionEmbed.setDescription(`Pour atteindre ton objectif de \`${goal}\`, tu dois avoir au moins \`${predictedMark}\` à cette note.`);

                predictionEmbed.data.description += `\n*Tu peux modifier ton objectif de moyenne avec* ${commandMention(interaction.client, 'objectifs')}`;
                return interaction.reply({ embeds: [predictionEmbed], ephemeral: true });

            case 'saisir':
                const markIdInput = interaction.options.getString('identifiant');
                const publishedMark = await Marks.get(markIdInput); // Is the input id in the database?
                if (!publishedMark) {
                    const unknownEmbed = new EmbedBuilder()
                        .setTitle('Note inconnue')
                        .setColor('Red')
                        .setDescription(`L'identifiant \`${markIdInput}\` ne correspond à aucune note publiée.\n***Si** c'est pourtant le cas, utilise* ${commandMention(interaction.client, 'aled')}`);

                    return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
                }

                const studentMark = student.marks.find(m => m.id === markIdInput); // Get the student's mark if already added
                const markValue = interaction.options.getNumber('résultat');
                const roundedMark = markValue !== null // Is there a value?
                    ? Math.round(markValue * 100) / 100
                    : undefined; // Set to undefined as isNaN(null) is truthy

                const description = studentMark // Has the student already added that mark?
                    ? isNaN(roundedMark) // Is there a value (is it an absence)?
                        ? `${studentMark.value < 0 ? 'Ton absence de note' : `Ta note de \`${studentMark.value}\``} a été remplacée par une absence de note`
                        : `${studentMark.value < 0 ? 'Ton absence de note' : `Ta note de \`${studentMark.value}\``} a été remplacée par \`${roundedMark}\``
                    : isNaN(roundedMark) // Is there a value (is it an absence)?
                        ? `Ton absence de note à cette note est saisie, tes ${commandMention(interaction.client, 'moyennes')} restent inchangées`
                        : `Ta note de \`${roundedMark}\` est saisie, utilise ${commandMention(interaction.client, 'moyennes')} pour voir les changements`;

                const successEmbed = new EmbedBuilder()
                    .setTitle(isNaN(roundedMark) ? 'Absence de note saisie' : studentMark ? 'Note modifiée' : 'Note saisie')
                    .setColor('Green')
                    .setDescription(description)
                    .setFooter({ text: `[${markIdInput}] ${publishedMark}` });
                interaction.reply({ embeds: [successEmbed], ephemeral: true });

                if (studentMark) await Promotion.pull(`${interaction.user.id}.marks`, (m) => m.id === markIdInput); // Remove the original mark if any
                await Promotion.push(`${interaction.user.id}.marks`, { id: markIdInput, value: isNaN(roundedMark) ? -1 : roundedMark }); // Set the new mark
                Promotion.set(`${interaction.user.id}.averages`, calculateAverages(await Promotion.get(`${interaction.user.id}.marks`))); // Update the averages object
        }
    }
};
