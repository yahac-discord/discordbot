const { MessageActionRow, Modal, TextInputComponent } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bamboo')
        .setDescription('익명으로 질문합니다.'),
    async execute(interaction) {
        const modal = new Modal()
            .setCustomId('bamboo') // cmd Name과 같게 설정해야 함.
            .setTitle('코딩야학 대나무 숲');

        const titleInput = new TextInputComponent()
            .setCustomId('tilteInput')
            // The label is the prompt the user sees for this input
            .setLabel("제목을 입력하세요.")
            // Short means only a single line of text
            .setStyle('SHORT');
        const contensInput = new TextInputComponent()
            .setCustomId('contensInput')
            .setLabel("내용을 입력해주세요")
            // Paragraph means multiple lines of text.
            .setStyle('PARAGRAPH');
        // An action row only holds one text input,
        // so you need one action row per text input.
        const firstActionRow = new MessageActionRow().addComponents(titleInput);
        const secondActionRow = new MessageActionRow().addComponents(contensInput);
        const thirdActionRow = new MessageActionRow().addComponents(authorInput);
        // Add inputs to the modal
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        // Show the modal to the user
        return await interaction.showModal(modal);
    },
    async process(interaction) {
        const tilte = interaction.fields.getTextInputValue('tilteInput');
        const contens = interaction.fields.getTextInputValue('contensInput');
        
        const bambooEmbed = new MessageEmbed()
        .setColor('#98c379')
        .setTitle(`${tilte}`)
        .setAuthor({ name: '코딩야학 대나무숲', iconURL: interaction.guild.bannerURL(), url: 'https://cdn.discordapp.com/icons/336499288001478656/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96' })
        .setDescription(`${contens}`)
        .setTimestamp()
        .setFooter({ 
            text: "익명", 
            iconURL: interaction.guild.bannerURL()
         });
        
        interaction.reply({ content: `대나무 숲에 새로운 외침이 나타났습니다.`, embeds: [bambooEmbed] });

        const message = await interaction.fetchReply();
        
        return await message.startThread({
            name: `${tilte}`,
            autoArchiveDuration: 60,
            reason: '대나무 숲 질문 생성',
        });
    }
    
};