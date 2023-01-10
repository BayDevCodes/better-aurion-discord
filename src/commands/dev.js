// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } = require('discord.js'); // Elements from the discord.js library

const { Main } = require('../util/tables'); // Database table

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('dev')
        .setDescription('Commandes utilisables uniquement par le développeur.')
        .addSubcommand(subcommand => subcommand
            .setName('référent')
            .setDescription('⚠️ Définir le·la référent·e de cette instance de Better Aurion.')
            .addUserOption(option => option
                .setName('utilisateur')
                .setDescription('L\'utilisateur à définir comme référent·e (s\'il·elle n\'apparaît pas dans la liste, utilise son ID).')
                .setRequired(true)
            )
        ),

    /** @param {ChatInputCommandInteraction} interaction */
    async execute(interaction) {
        const ownerId = interaction.client.application.owner instanceof User // Is the application managed by an individual or a team?
            ? interaction.client.application.owner.id
            : interaction.client.application.owner.ownerId;

        if (interaction.user.id !== ownerId) { // This command is restricted to the application manager
            const restrictedEmbed = new EmbedBuilder()
                .setTitle('Commande restreinte')
                .setColor('Red')
                .setDescription('*Cette commande est réservée au développeur*');

            return interaction.reply({ embeds: [restrictedEmbed], ephemeral: true });
        }

        const user = interaction.options.getUser('utilisateur');
        const refereeEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Référent·e défini')
            .setDescription(`*L'utilisateur* **${user.tag}** *est désormais référent·e de cette instance*`);
        
        Main.set('referee', user.id);
        interaction.reply({ embeds: [refereeEmbed], ephemeral: true });
    }
};
