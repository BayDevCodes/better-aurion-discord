// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } = require('discord.js'); // Elements from the discord.js library

const { Main, Promotion } = require('../util/tables'); // Database table

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('dev')
        .setDescription('Commandes utilisables uniquement par le développeur.')
        .addSubcommand(subcommand => subcommand
            .setName('promouvoir')
            .setDescription('⚠️ Ajouter un·e référent·e pour cette instance de Better Aurion.')
            .addUserOption(option => option
                .setName('utilisateur')
                .setDescription('L\'étudiant·e à promouvoir (s\'il·elle n\'apparaît pas dans la liste, utilise son ID).')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('rafraîchir')
            .setDescription('Recalculer les moyennes de chaque étudiant·e.')
        )
        .addSubcommand(subcommand => subcommand
            .setName('reléguer')
            .setDescription('⚠️ Retirer un·e des référent·e·s de cette instance de Better Aurion.')
            .addUserOption(option => option
                .setName('utilisateur')
                .setDescription('L\'étudiant·e à reléguer (s\'il·elle n\'apparaît pas dans la liste, utilise son ID).')
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

        if (interaction.options.getSubcommand() === 'rafraîchir') {
            const refreshedEmbed = new EmbedBuilder()
                .setTitle('Moyennes recalculées')
                .setColor('Green')
                .setDescription('*Les moyennes de chaque étudiant·e ont été recalculées*');
            
            interaction.reply({ embeds: [refreshedEmbed], ephemeral: true });
            for (const student of await Promotion.all())
                Promotion.set(`${student.id}.averages`, calculateAverages(await Promotion.get(`${student.id}.marks`))); // Update the averages object
            return;
        }

        const user = interaction.options.getUser('utilisateur');
        const referee = (await Main.get('referees'))?.find(r => r === user.id);

        if (interaction.options.getSubcommand() === 'promouvoir') {
            if (referee) {
                const alreadyRefereeEmbed = new EmbedBuilder()
                    .setTitle('Déjà promu·e')
                    .setColor('Orange')
                    .setDescription(`*L'utilisateur* **${user.tag}** *est déjà référent·e de cette instance*`);

                return interaction.reply({ embeds: [alreadyRefereeEmbed], ephemeral: true });
            }

            const newRefereeEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Référent·e ajouté·e')
                .setDescription(`*L'utilisateur* **${user.tag}** *est désormais référent·e de cette instance*`);
            
            Main.push('referees', user.id);
            return interaction.reply({ embeds: [newRefereeEmbed], ephemeral: true });
        }

        if (!referee) {
            const notRefereeEmbed = new EmbedBuilder()
                .setTitle('Référent·e introuvable')
                .setColor('Orange')
                .setDescription(`*L'utilisateur* **${user.tag}** *n'est pas référent·e de cette instance*`);
            
            return interaction.reply({ embeds: [notRefereeEmbed], ephemeral: true });
        }

        const removedRefereeEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Référent·e retiré·e')
            .setDescription(`*L'utilisateur* **${user.tag}** *n'est plus référent·e de cette instance*`);
        
        Main.pull('referees', user.id);
        interaction.reply({ embeds: [removedRefereeEmbed], ephemeral: true });
    }
};
