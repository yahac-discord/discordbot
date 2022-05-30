function sendErrMSG(interaction, error) {
	const errorEmbed = new MessageEmbed()
	.setColor('#ed4245')
	.setTitle(`명렁어 실행 중 오류가 발생하였습니다.`)
	.setAuthor({ name: '에러 메시지'})
	.setDescription(`${test ? "\n"+error.message : ""}`)
	.setTimestamp();
	
	interaction.channel.send({ embeds: [errorEmbed] });
}

module.exports = {
	name: 'interactionCreate',
	execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
        
        if (interaction.isModalSubmit()) {
            client.commands.get(interaction.customId).process(interaction);
        }
    
        if (!interaction.isCommand()) {return;}
    
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {return;}
        
        try {
            command.execute(interaction);
            throw "에러 로그 테스트";
        } catch (error) {
            console.error(error);
            sendErrMSG(interaction, error);
        }
	},
};