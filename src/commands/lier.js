// Third-party module
const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js'); // Elements from the discord.js library

const { commandMention, initStudent, refereeLink } = require('../util/functions'); // Local functions
const { Promotion } = require('../util/tables'); // Database table
const mails = require('../constants/mails.json'); // Constants regarding the students' mail adresses defined at setup

// Export the command's data & execute function
module.exports = {
    data: new SlashCommandBuilder()
        .setName('lier')
        .setDescription(`Lier ton compte Discord à ton adresse mail ${mails.domain}.`)
        .addStringOption(option => option
            .setName('email')
            .setDescription(`Ton adresse mail ${mails.domain}.`)
            .setRequired(true)
        ),
    
    /** @param {ChatInputCommandInteraction} interaction */
    async execute(interaction) {
        const email = interaction.options.getString('email').split('@');
        if (!email[1] || email[1] != mails.domain || !mails.students.includes(email[0])) { // Validate the mail adress
            const unknownEmbed = new EmbedBuilder()
                .setTitle('Adresse mail invalide')
                .setColor('Red')
                .setDescription(`L'adresse \`${email.join('@')}\` n'est pas enregistrée...\n***Si** c'est une erreur, contacte [le·la référent·e](${await refereeLink(interaction.client)})*`);

            return await interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
        };

        const student = (await Promotion.all()).find(s => s.value.email === email.join('@')); // Get the student in the database if any
        if (student) {
            const alreadyLinkedEmbed = new EmbedBuilder()
                .setTitle('Adresse mail déjà utilisée')
                .setColor('Orange')
                .setDescription(`L'adresse \`${email.join('@')}\` est déjà liée à [un compte](https://discordapp.com/users/${student.id})\n***Si** ce n'est pas toi, contacte [le·la référent·e](${await refereeLink(interaction.client)})*`);

            return await interaction.reply({ embeds: [alreadyLinkedEmbed], ephemeral: true });
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('Adresse mail liée')
            .setColor('Green')
            .setDescription(`L'adresse \`${email.join('@')}\` est liée à ton compte 👌\nTu peux désormais saisir tes notes, calculer tes moyennes et fixer tes objectifs!\n\n⚠️ Par défaut, ton nom apparaîtra dans les classements. Si tu veux y remédier, utilise ${commandMention(interaction.client, 'anonymat')}`);

        initStudent(interaction.user.id, email.join('@')); // Create the student's row in the database
        interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
};
