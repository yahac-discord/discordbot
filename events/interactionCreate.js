const { isTest } = require('../config.json');
const {errorEmbed} = require('../structures/embedMsg.js');

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
            interaction.channel.send({ embeds: errorEmbed("명렁어 실행 중 오류가 발생하였습니다.", `${isTest ? "\n"+error.message : ""}`) });
        }
	},
};