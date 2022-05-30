const { MessageActionRow, Modal, TextInputComponent } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { bambooEmbed } = require("../structures/embedMsg.js")
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
            .setLabel("제목을 입력하세요.")
            .setStyle('SHORT');
        const contensInput = new TextInputComponent()
            .setCustomId('contensInput')
            .setLabel("내용을 입력해주세요")
            .setStyle('PARAGRAPH');
        
        const firstActionRow = new MessageActionRow().addComponents(titleInput);
        const secondActionRow = new MessageActionRow().addComponents(contensInput);

        modal.addComponents(firstActionRow, secondActionRow);
        return await interaction.showModal(modal);
    },
    async process(interaction) {
        const title = interaction.fields.getTextInputValue('tilteInput');
        const contens = interaction.fields.getTextInputValue('contensInput');
        
        interaction.reply({ content: `대나무 숲에 새로운 외침이 나타났습니다.`, embeds: bambooEmbed(interaction, title, contens) });

        const message = await interaction.fetchReply();
        
        return await message.startThread({
            name: `${tilte}`,
            autoArchiveDuration: 60,
            reason: '대나무 숲 질문 생성',
        });
    }
    
};