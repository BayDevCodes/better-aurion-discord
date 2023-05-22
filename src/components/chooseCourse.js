// Third-party module
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } = require('discord.js'); // Elements from the discord.js library

const { averagesChart, commandMention, nameFromEmail, weightsChart } = require('../util/functions'); // Local functions
const { Main, Marks, Promotion } = require('../util/tables'); // Database tables
const marks = require('../constants/marks.json'); // Constants regarding the marks defined at setup

// Export the select menu's data & execute function
module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('chooseModule'),

    /** @param {StringSelectMenuInteraction} interaction */
    async execute(interaction) {
        const embed = EmbedBuilder.from(interaction.message.embeds[0]); // Get the embed from which comes the selection
        const unitName = embed.data.title.split('en ')[1]; // Parse the unit name
        const unitId = Object.keys(marks.weights).find(unitId => marks.names.units[unitId] === unitName); // Get the unit
        const moduleId = interaction.values[0]; // Get the module selection

        embed.data.title += `\n> ${marks.names.modules[moduleId]}`; // Add module name to the title
        switch (embed.data.title.split(' ')[0]) {
            case 'Classement':
                const publishedMarkCountR = (await Marks.all()).length;

                // These rankings contains students with all published marks added and having an average in the module
                const rankings = (await Promotion.all()).filter(s => s.value.marks.length === publishedMarkCountR && s.value.averages[unitId][moduleId].self !== null).sort((a, b) => b.value.averages[unitId][moduleId].self - a.value.averages[unitId][moduleId].self);
                if (!rankings.length) {
                    embed.setColor('Orange').setDescription('Personne n\'a encore de moyenne pour ce module...').setFooter({ text: ' ' });
                    return interaction.update({ components: [interaction.message.components[1]], embeds: [embed] }); // Force the user to go back
                }

                const studentRank = rankings.findIndex(s => s.id === interaction.user.id) + 1;
                let description = studentRank // This is equal to 0 if the student is not part of the rankings
                    ? `Tu es à la ${studentRank}è${studentRank === 1 ? 're' : 'me'} place avec \`${rankings[studentRank - 1].value.averages[unitId][moduleId].self}\`\n`
                    : (await Promotion.get(interaction.user.id)).value.marks.length === publishedMarkCountR // Check if the student has added all published marks
                        ? `*Tu ne fais pas partie du classement car tu es noté·e pour aucune évaluation de ce module*\n`
                        : `⚠️ *Tu n'as pas ajouté toutes les notes disponibles,\nutilise* ${commandMention(interaction.client, 'notes manquantes')} *pour voir lesquelles.*\n`;

                // Do this for the first 10 students of the rankings
                for (i = 0; i < 10; i++) {
                    const student = rankings[i]; // Get the student
                    if (!student) break; // Exit loop if there is no more student
        
                    // Format each row of the rankings
                    description += `**${i + 1}** - **${student.value.anonymous ? '🕵️ Anonyme' : `[${nameFromEmail(student.value.email)}](https://discordapp.com/users/${student.id})`}** avec \`${student.value.averages[unitId][moduleId].self}\`\n`;
                }

                embed.setDescription(description).setFooter({ text: `${rankings.length} étudiant·e·s classé·e·s (ayant saisi toutes les notes)` });
            break;

            case 'Coefficients':
                embed.setImage(weightsChart(unitId, moduleId)); // Update chart with module's type weights
            break;

            case 'Moyenne':
                const student = await Promotion.get(interaction.user.id);
                const moduleAverages = student.averages[unitId][moduleId];

                if (moduleAverages.self === null) {
                    embed.setColor('Orange').setDescription('Tu n\'as pas encore de moyenne pour ce module...').setImage();
                    return interaction.update({ components: [interaction.message.components[1]], embeds: [embed] }); // Force the user to go back
                }

                const names = [], values = []; // Initialize name & value arrays to use in the chart
                for (const typeId of Object.keys(marks.weights[unitId][moduleId]).slice(0, -1)) {
                    names.push(marks.names.types[typeId]);
                    values.push(moduleAverages[typeId]);
                }
                const promotionAverages = await Main.get('promotionAverages');
                const promotionValues = promotionAverages // Are promotion averages available?
                    ? Object.keys(promotionAverages[unitId][moduleId]).slice(0, -1).map(typeId => promotionAverages[unitId][moduleId][typeId])
                    : [];
                
                const publishedMarkCountA = (await Marks.all()).length;
                const missingMarks = student.marks.length < publishedMarkCountA
                    ? `⚠️ *Tu n'as pas ajouté toutes les notes publiées (${student.marks.length}/${publishedMarkCountA}),\nUtilise la commande* ${commandMention(interaction.client, 'notes manquantes')} *pour voir lesquelles.*\n\n`
                    : '';

                embed.setDescription(`${missingMarks}*Ta moyenne en ${marks.names.modules[moduleId]} est de \`${moduleAverages.self}\`${promotionAverages && promotionAverages[unitId][moduleId].self !== null ? ` [promo: \`${promotionAverages[unitId][moduleId].self}\`]` : ''}\net voici le détail par type de note:*`)
                    .setImage(await averagesChart(names, values, promotionValues, 'type'));
            break;
        }

        interaction.update({ components: [interaction.message.components[1]], embeds: [embed] }); // Keep only the "back" button
    }
}
