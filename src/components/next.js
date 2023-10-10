// Third-party module
const { ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder } = require('discord.js'); // Elements from the discord.js library

const { Marks, Promotion } = require('../util/tables'); // Database tables

// Export the button's data & execute function
module.exports = {
  data: new ButtonBuilder()
    .setCustomId('next')
    .setLabel('Page suivante')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary),

  /** @param {ButtonInteraction} interaction */
  async execute(interaction) {
    const embed = EmbedBuilder.from(interaction.message.embeds[0]); // Get the embed from which comes the click
    const studentMarks = await Promotion.get(`${interaction.user.id}.marks`); // Get the marks of the student
    const currentPage = parseInt(embed.data.footer.text.split(' ')[1]); // Get the current page from the embed's footer
    const maxPage = Math.ceil(studentMarks.length / 10); // Calculate the max page based on the number of marks

    const row = interaction.message.components[0]; // Get the button(s) attached to the embed
    if (currentPage === 1)
      row.components.unshift(interaction.client.components.get('previous').data); // Add the "previous" button if coming from the first page
    if (currentPage + 1 === maxPage) row.components.pop(); // Remove the "next" button if coming to the last page

    // Complicated stuff to format marks with their name and the value got by the student (using promises as database methods are async)
    const pageContent = await Promise.all(
      studentMarks
        .slice(currentPage * 10, currentPage * 10 + 10)
        .map(
          async (mark) =>
            `> \`${mark.id}\` *${await Marks.get(mark.id)}* **${
              mark.value < 0 ? 'non noté·e' : `avec ${mark.value}`
            }**`
        )
    );
    embed
      .setDescription(`${embed.data.description.split('\n')[0]}\n${pageContent.join('\n')}`) // Merge the start of the original description with the new mark list
      .setFooter({ text: `Page ${currentPage + 1} sur ${maxPage}` }); // Update the page

    interaction.update({ components: [row], embeds: [embed] });
  },
};
