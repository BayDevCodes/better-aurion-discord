// Third-party module
const { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } = require('discord.js'); // Elements from the discord.js library

const { averagesChart, commandMention, nameFromEmail, weightsChart } = require('../util/functions'); // Local functions
const { Main, Marks, Promotion } = require('../util/tables'); // Database tables
const marks = require('../constants/marks.json'); // Constants regarding the marks defined at setup

// Export the select menu's data & execute function
module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('chooseUnit')
        .addOptions(Object.keys(marks.weights).map(unitId => new StringSelectMenuOptionBuilder().setLabel(marks.names.units[unitId]).setValue(unitId))),

    /** @param {StringSelectMenuInteraction} interaction */
    async execute(interaction) {
        const embed = EmbedBuilder.from(interaction.message.embeds[0]); // Get the embed from which comes the selection
        const unitId = interaction.values[0]; // Get the unit selection

        /** @type {StringSelectMenuBuilder} */
        const courseSelectMenu = interaction.client.components.get('chooseCourse').data;
        const backButton = interaction.client.components.get('back').data;
        switch (embed.data.title.split(' ')[0]) {
            case 'Classement':
                const publishedMarkCountR = (await Marks.all()).length;
                embed.setTitle(`Classement par moyenne en ${marks.names.units[unitId]}`);

                // These rankings contains students with all published marks added and having an average in the unit
                const rankings = (await Promotion.all()).filter(s => s.value.marks.length === publishedMarkCountR && s.value.averages[unitId].self !== null).sort((a, b) => b.value.averages[unitId].self - a.value.averages[unitId].self);
                if (!rankings.length) {
                    embed.setColor('Orange').setDescription('Personne n\'a encore de moyenne pour cette unité...').setFooter({ text: ' ' });
                    return interaction.update({ components: [new ActionRowBuilder().addComponents(backButton)], embeds: [embed] }); // Force the user to go back
                }

                const studentRank = rankings.findIndex(s => s.id === interaction.user.id) + 1;
                let description = studentRank // This is equal to 0 if the student is not part of the rankings
                    ? `Tu es à la ${studentRank}è${studentRank === 1 ? 're' : 'me'} place avec \`${rankings[studentRank - 1].value.averages[unitId].self}\`\n`
                    : `⚠️ *Tu n'as pas ajouté toutes les notes disponibles,\nutilise* ${commandMention(interaction.client, 'notes manquantes')} *pour voir lesquelles.*\n`;

                // Do this for the first 10 students of the rankings
                for (i = 0; i < 10; i++) {
                    const student = rankings[i]; // Get the student
                    if (!student) break; // Exit loop if there is no more student
    
                    // Format each row of the rankings
                    description += `**${i + 1}** - **${student.value.anonymous ? '🕵️ Anonyme' : `[${nameFromEmail(student.value.email)}](https://discordapp.com/users/${student.id})`}** avec \`${student.value.averages[unitId].self}\`\n`;
                }

                courseSelectMenu.setPlaceholder('Voir le classement par moyenne d\'un cours');
                embed.setDescription(description).setFooter({ text: `${rankings.length} étudiant·e·s classé·e·s (ayant ajouté toutes leurs notes)` });
            break;

            case 'Coefficients':
                courseSelectMenu.setPlaceholder('Voir les coefficients d\'un cours en détail');
                embed.setTitle(`Coefficients en ${marks.names.units[unitId]}`).setImage(weightsChart(unitId)); // Update chart with unit's course weights
            break;

            case 'Moyenne':
                const student = await Promotion.get(interaction.user.id);
                const unitAverages = student.averages[unitId];

                embed.setTitle(`Moyenne en ${marks.names.units[unitId]}`);
                if (unitAverages.self === null) {
                    embed.setColor('Orange').setDescription('Tu n\'as pas encore de moyenne pour cette unité...').setImage();
                    return interaction.update({ components: [new ActionRowBuilder().addComponents(backButton)], embeds: [embed] }); // Force the user to go back
                }

                const names = [], values = []; // Initialize name & value arrays to use in the chart
                for (const courseId of Object.keys(marks.weights[unitId]).slice(1)) {
                    names.push(marks.names.courses[courseId]);
                    values.push(unitAverages[courseId].self);
                }
                const promotionAverages = await Main.get('promotionAverages');
                const promotionValues = promotionAverages // Are promotion averages available?
                    ? Object.keys(promotionAverages[unitId]).slice(0, -1).map(courseId => promotionAverages[unitId][courseId].self)
                    : [];

                const publishedMarkCountA = (await Marks.all()).length;
                const missingMarks = student.marks.length < publishedMarkCountA
                    ? `⚠️ *Tu n'as pas ajouté toutes les notes publiées (${student.marks.length}/${publishedMarkCountA}),\nUtilise la commande* ${commandMention(interaction.client, 'notes manquantes')} *pour voir lesquelles.*\n\n`
                    : '';

                courseSelectMenu.setPlaceholder('Voir la moyenne d\'un cours en détail');
                embed.setDescription(`${missingMarks}*Ta moyenne en ${marks.names.units[unitId]} est de \`${unitAverages.self}\`${promotionAverages && promotionAverages[unitId].self !== null ? ` [promo: \`${promotionAverages[unitId].self}\`]` : ''}\net voici le détail par cours:*`)
                    .setImage(await averagesChart(names, values, promotionValues, 'cours'));
            break;
        }

        // Add components to choose a course or go back
        courseSelectMenu.setOptions(Object.keys(marks.weights[unitId]).slice(1).map(courseId => new StringSelectMenuOptionBuilder().setLabel(marks.names.courses[courseId]).setValue(courseId)));
        const rows = [new ActionRowBuilder().addComponents(courseSelectMenu), new ActionRowBuilder().addComponents(backButton)];

        interaction.update({ components: rows, embeds: [embed] });
    }
}
