const { MessageEmbed } = require('discord.js');

module.exports = {
    errorEmbed(title, msg) {
        const embed = new MessageEmbed()
        .setColor('#ed4245')
        .setTitle(title)
        .setAuthor({ name: '에러 메시지'})
        .setDescription(msg)
        .setTimestamp();
        return [embed];
    },

    bambooInfoEmbed(interaction, tilte, contens) {
        const embed = new MessageEmbed()
        .setColor('#98c379')
        .setTitle(`${tilte}`)
        .setAuthor({ name: '코딩야학 대나무숲', iconURL: interaction.guild.iconURL() })
        .setDescription(`${contens}`)
        .setTimestamp()
        .setFooter({ 
            text: "익명", 
            iconURL: interaction.guild.iconURL()
         });

         return [embed];
    },
};
