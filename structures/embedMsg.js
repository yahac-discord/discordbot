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
        .setAuthor({ name: '코딩야학 대나무숲', iconURL: interaction.guild.bannerURL(), url: 'https://cdn.discordapp.com/icons/336499288001478656/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96' })
        .setDescription(`${contens}`)
        .setTimestamp()
        .setFooter({ 
            text: "익명", 
            iconURL: interaction.guild.bannerURL()
         });

         return [embed];
    },
    simpleInfoEmbed(){
        return new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Some title')
        .setURL('https://discord.js.org/')
        .setAuthor({ name: '유저 정보', iconURL: interaction.guild.bannerURL()})
        .setDescription('Some description here')
        .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .addFields(
            { name: 'Regular field title', value: 'Some value here' },
            { name: '\u200B', value: '\u200B' },
            { name: 'Inline field title', value: 'Some value here', inline: true },
            { name: 'Inline field title', value: 'Some value here', inline: true },
        )
        .addField('Inline field title', 'Some value here', true)
        .setImage('https://i.imgur.com/AfFp7pu.png')
        .setTimestamp()
        .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });
    }
};
