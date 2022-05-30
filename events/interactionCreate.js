const { MessageEmbed } = require('discord.js');
const { isTest } = require('../config.json');

function sendErrMSG(interaction, error) {
	const errorEmbed = new MessageEmbed()
	.setColor('#ed4245')
	.setTitle(`명렁어 실행 중 오류가 발생하였습니다.`)
	.setAuthor({ name: '에러 메시지'})
	.setDescription(`${isTest ? "\n"+error.message : ""}`)
	.setTimestamp();
	
	interaction.channel.send({ embeds: [errorEmbed] });
}

module.exports = {
	name: 'interactionCreate',
	execute(client, interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
        
        try {
            if (interaction.isCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {return;}
                
                command.execute(interaction);
            }
            if (interaction.isModalSubmit()) {
                client.commands.get(interaction.customId).process(interaction);
            }
        } catch (error) {
            console.error(error);
            sendErrMSG(interaction, error);
        }
	},
};