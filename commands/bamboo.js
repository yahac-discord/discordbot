const { MessageActionRow, Modal, TextInputComponent } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

function getRandomInt(min, max) {return Math.floor(Math.random() * (max - min)) + min;}

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
        const authorInput = new TextInputComponent()
            .setCustomId('authorInput')
            // The label is the prompt the user sees for this input
            .setLabel("익명은 빈칸 실명은 아무 값이나 넣어주세요")
            // Short means only a single line of text
            .setStyle('SHORT');
        // An action row only holds one text input,
        // so you need one action row per text input.
        const firstActionRow = new MessageActionRow().addComponents(titleInput);
        const secondActionRow = new MessageActionRow().addComponents(contensInput);
        const thirdActionRow = new MessageActionRow().addComponents(authorInput);
        // Add inputs to the modal
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        // Show the modal to the user
        await interaction.showModal(modal);
    },
    async process(interaction) {
        const tilte = interaction.fields.getTextInputValue('tilteInput');
        const contens = interaction.fields.getTextInputValue('contensInput');
        const author = interaction.fields.getTextInputValue('authorInput');

        // inside a command, event listener, etc.
        const exampleEmbed = new MessageEmbed()
        .setColor('#'+getRandomInt(0,255).toString(16)+getRandomInt(0,255).toString(16)+getRandomInt(0,255).toString(16))
        .setTitle(`${tilte}`)
        .setAuthor({ name: '코딩야학 대나무숲', iconURL: `https://cdn.discordapp.com/icons/${interaction.channelId}/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96`, url: 'https://cdn.discordapp.com/icons/336499288001478656/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96' })
        .setDescription(`${contens}`)
        .setTimestamp()
        .setFooter({ 
            text: `${author=='' ? "익명" : interaction.user.username}`, 
            iconURL: `${author=="" ? `https://cdn.discordapp.com/icons/${interaction.channelId}/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96` : `https://cdn.discordapp.com/icons/${interaction.user.id}/5aeb8b9b13d13c046bebb46524b77e29.webp?size=96`}`
         });
        
        interaction.channel.send({ embeds: [exampleEmbed] })
        .then(()=>{
           interaction.channel.threads.create({
                name: `${tilte}`,
                autoArchiveDuration: 60,
                reason: '대나무 숲 질문 생성',
            });
        });
    }
    
};