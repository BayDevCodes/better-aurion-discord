// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SelectMenuBuilder, SlashCommandBuilder, ActionRowBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandMention, nameFromEmail } = require('../util/functions'); // Local functions
const { Marks, Promotion } = require('../util/tables'); // Database tables

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('classement')
        .setDescription('Voir les classements de la promo par moyennes/note.')
        .addSubcommand(subCommand => subCommand
            .setName('moyennes')
            .setDescription('Voir le classement de la promo par moyennes (étudiant·e·s ayant saisi toutes les notes uniquement).')
        )
        .addSubcommand(subCommand => subCommand
            .setName('note')
            .setDescription('Voir le classement de la promo pour une note (étudiant·e·s ayant saisi cette note uniquement).')
            .addStringOption(option => option
                .setName('identifiant')
                .setDescription('L\'identifiant de la note (exemple: MATH_M1_CC_1).')
                .setMaxLength(64) // Prevents the user from entering a too long string
                .setRequired(true)
            )
        ),

    /** @param {ChatInputCommandInteraction} interaction */
    async execute(interaction) {
        const student = await Promotion.get(interaction.user.id); // Get the student from the database, if any
        if (!student) {
            const unknownEmbed = new EmbedBuilder()
                .setTitle('Compte non lié')
                .setColor('Orange')
                .setDescription(`Ton compte n'est pas lié à une adresse mail Junia...\nUtilise la commande ${commandMention(interaction.client, 'lier')} pour le faire`);

            return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();
        if (subCommand === 'moyennes') {
            const publishedMarkCount = (await Marks.all()).length;

            // These rankings contains students with all published marks added and having a general average
            const rankings = (await Promotion.all()).filter(s => s.value.marks.length === publishedMarkCount).sort((a, b) => b.value.averages.general - a.value.averages.general);
            if (rankings.length === 0) {
                const noStudentsEmbed = new EmbedBuilder()
                    .setColor('Orange')
                    .setTitle('Classement indisponible')
                    .setDescription(`Aucun·e étudiant·e n'a ajouté toutes ses notes, utilise ${commandMention(interaction.client, 'notes manquantes')} pour voir celles que tu dois ajouter`);

                return interaction.reply({ embeds: [noStudentsEmbed], ephemeral: true });
            }

            const studentRank = rankings.findIndex(s => s.id === interaction.user.id) + 1;
            let description = studentRank // This is equal to 0 if the student is not part of the rankings
                ? `Tu es à la ${studentRank}è${studentRank === 1 ? 're' : 'me'} place avec \`${student.averages.general}\`\n`
                : (await Promotion.get(interaction.user.id)).value.marks.length === publishedMarkCount // Check if the student has added all published marks
                    ? `*Tu ne fais pas partie du classement car tu es noté·e pour aucune évaluation*\n`
                    : `⚠️ *Tu n'as pas ajouté toutes les notes disponibles,\nutilise* ${commandMention(interaction.client, 'notes manquantes')} *pour voir lesquelles.*\n`;

            // Do this for the first 10 students of the rankings
            for (i = 0; i < 10; i++) {
                const student = rankings[i]; // Get the student
                if (!student) break; // Exit loop if there is no more student

                // Format each row of the rankings
                description += `**${i + 1}** - **${student.value.anonymous ? '🕵️ Anonyme' : `[${nameFromEmail(student.value.email)}](https://discordapp.com/users/${student.id})`}** avec \`${student.value.averages.general}\`\n`;
            }

            const rankingEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('Classement par moyenne générale')
                .setDescription(description)
                .setFooter({ text: `${rankings.length} étudiant·e·s classé·e·s (ayant saisi toutes les notes)` });

            /** @type {SelectMenuBuilder} */
            const unitSelectMenu = interaction.client.components.get('chooseUnit').data;
            unitSelectMenu.setPlaceholder('Voir le classement par moyenne d\'une unité');

            return interaction.reply({ components: [new ActionRowBuilder().addComponents(unitSelectMenu)], embeds: [rankingEmbed], ephemeral: true }); // Add the unit select menu
        }

        const markId = interaction.options.getString('identifiant');
        const publishedMark = await Marks.get(markId); // Get the mark name from the database, if any
        if (!publishedMark) {
            const unknownEmbed = new EmbedBuilder()
                .setTitle('Note inconnue')
                .setColor('Red')
                .setDescription(`L'identifiant \`${markId}\` ne correspond à aucune note publiée.\n***Si** c'est pourtant le cas, utilise* ${commandMention(interaction.client, 'aled')}`);

            return interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
        }

        // These rankings contains students with a value for this mark
        const rankings = (await Promotion.all()).filter(s => s.value.marks.some(m => m.id === markId && m.value >= 0)).sort((a, b) => b.value.marks.find(m => m.id === markId).value - a.value.marks.find(m => m.id === markId).value);
        if (rankings.length === 0) {
            const noStudentsEmbed = new EmbedBuilder()
                .setColor('Orange')
                .setTitle('Classement indisponible')
                .setDescription(`Aucun·e étudiant·e n'a ajouté cette note, utilise ${commandMention(interaction.client, 'notes saisir')} pour ajouter la tienne`);

            return interaction.reply({ embeds: [noStudentsEmbed], ephemeral: true });
        }

        const studentRank = rankings.findIndex(s => s.id === interaction.user.id) + 1;
        let description = studentRank // This is equal to 0 if the student is not part of the rankings
            ? `Tu es à la ${studentRank}è${studentRank === 1 ? 're' : 'me'} place avec \`${student.marks.find(m => m.id === markId).value}\`\n`
            : (await Promotion.get(interaction.user.id)).marks.some(m => m.id === markId) // Check if the student has added this mark
                ? '*Tu ne fais pas partie du classement car tu n\'es pas noté·e*\n'
                : `⚠️ *Tu n'as pas ajouté cette note,\nutilise* ${commandMention(interaction.client, 'notes saisir')} *pour le faire.*\n`;

        // Do this for the first 10 students of the rankings
        for (i = 0; i < 10; i++) {
            const student = rankings[i]; // Get the student
            if (!student) break; // Exit loop if there is no more student

            // Format each row of the rankings
            description += `**${i + 1}** - **${student.value.anonymous ? '🕵️ Anonyme' : `[${nameFromEmail(student.value.email)}](https://discordapp.com/users/${student.id})`}** avec \`${student.value.marks.find(m => m.id === markId).value}\`\n`;
        }

        let sum = 0;
        for (const student of rankings)
            sum += student.value.marks.find(m => m.id === markId).value;

        const rankingEmbed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle(`Classement par note\n> ${publishedMark}`)
            .setDescription(description)
            .setFooter({ text: `Moyenne de la promo: ${Math.round(sum / rankings.length * 100) / 100} (sur ${rankings.length} étudiant·e·s classé·e·s)` }); // Calculate the promotion's average for this mark

        interaction.reply({ embeds: [rankingEmbed], ephemeral: true });
    }
};
