// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { Main, Marks, Promotion } = require('../util/tables'); // Database tables
const { students } = require('../constants/mails.json'); // Array of student mails' first parts

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('statistiques')
        .setDescription('Qui regarde ça en vrai?'),

    /** @param {ChatInputCommandInteraction} interaction */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Create a delay for the ping calculation
        const botPing = Date.now() - interaction.createdTimestamp; // Calculate the bot ping (when interaction is deferred - when interaction is sent)

        let description = `> Serveurs: \`${interaction.client.guilds.cache.size}\`\n`;
        description += `> Latence API: \`${interaction.client.ws.ping}ms\`\n`;
        description += `> Latence Bot: \`${botPing}ms\`\n`;
        description += `> Notes publiées: \`${(await Marks.all()).length}\`\n`;
        description += `> Interactions totales: \`${(await Main.get('interactionCount')) || Number(0)}\`\n`;
        description += `> Étudiants enregistrés: \`${(await Promotion.all()).length}/${students.length}\`\n`;
        description += `> Utilisation de la RAM: \`${Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100} Mio\`\n`;
        description += `> MàJ moyennes de promo: <t:${await Main.get('promotionAveragesUpdate')}:R>\n`;

        let secondsUptime = ~~(interaction.client.uptime / 1000);
        let minutesUptime = ~~(secondsUptime / 60);
        let hoursUptime = ~~(minutesUptime / 60);
        const daysUptime = ~~(hoursUptime / 24);
        secondsUptime %= 60, minutesUptime %= 60, hoursUptime %= 24;
        description += `> Temps de fonctionnement: \`${daysUptime}j, ${hoursUptime}h, ${minutesUptime}m et ${secondsUptime}s\`\n`;

        const statsEmbed = new EmbedBuilder()
            .setTitle('Statistiques')
            .setColor('Blurple')
            .setDescription(description);

        interaction.editReply({ embeds: [statsEmbed] });
    }
};
