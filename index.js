const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Intents, MessageEmbed } = require('discord.js');
const { token, test } = require('./config.json');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        await client.commands.get(interaction.customId).process(interaction);
    }

	if (!interaction.isCommand()) {return;}

	const command = client.commands.get(interaction.commandName);
    
	if (!command) {return;}
    
	try {
		await command.execute(interaction);
        
	} catch (error) {
		console.error(error);
		
		const errorEmbed = new MessageEmbed()
        .setColor('#ed4245')
		.setTitle(`명렁어 실행 중 오류가 발생하였습니다.`)
        .setAuthor({ name: '에러 메시지'})
        .setDescription(`${test ? "\n"+error.message : ""}`)
        .setTimestamp();
        
        await interaction.channel.send({ embeds: [errorEmbed] });
	}
});

client.login(token);