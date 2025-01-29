# PMD+

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/codefriar.pmd-plus) ![Visual Studio Marketplace Installs - Azure DevOps Extension](https://img.shields.io/visual-studio-marketplace/azure-devops/installs/total/codefriar.pmd-plus)](https://marketplace.visualstudio.com/items?itemName=codefriar.pmd-plus)
[![build](https://github.com/ChuckJonas/vscode-apex-pmd/actions/workflows/build.yml/badge.svg)](https://github.com/ChuckJonas/vscode-apex-pmd/actions/workflows/build.yml)
[![BuyMeACoffee](https://raw.githubusercontent.com/pachadotdev/buymeacoffee-badges/main/bmc-yellow.svg)](https://www.buymeacoffee.com/pacha)

> Because catching bugs before they catch you (in production), is always a good idea.

A VSCode plugin that brings the power of PMD static code analysis to your favorite? IDE. Finally, a way to maintain code quality without leaving your comfort zone!

Or, as all the kids be saying:

Fr fr, we all drop some cringe code at some point. This extension is lit for fixing that. Let it be your vibe check to avoid straight-up coding disasters.

> Listen, There's this cool cat named Chuck Jonas, and he's the OG badass in this space. He wrote [Apex-PMD](https://github.com/ChuckJonas/vscode-apex-pmd), and it's pretty ducking awesome. But I needed it to handle HTML files, and was tired of arguing with some cross-platform path bugs with users who were early on the learning curve. So, what's a guy to do? Well, submit a patch, obviously. But wait! Hark there be Typescript. It's a langauge I'm marginally familiar with, so I decided to basically re-write the entire thing and teach myself some better typescript. This isn't a better apex-pmd, or a replacement for Chuck's most excellent work.   

## Features

- **Realish-time Analysis**: Catch problems as you type, because waiting for CI/CD to fail is so 2000 and late
- **Custom Ruleset Support**: Bring your own rules or use the defaults—we definitely judge
- **Configurable Severity Levels**: From "meh" to "hair on fire"—you decide what matters (again, we judge)
- **Batteries Included**: Y'all know we be shipping a PMD executable, and a default ruleset. You just need to have Java > 17.0
- **Problem Window Integration**: All your issues in one place, just to remind you that you're the common denominator in all your problems—including code
- **Custom Jar Support**: Bring your own custom PMD rules implemented in Java, because no good day ever started with "let's write some java"

## Installation

1. Open VSCode. Contemplate your life choices and grab a cup of coffee while you wait for VSCode to finally launch. 
2. Go to the Extensions bit.
3. Search for "PMD+"
4. Click Install
6. Start catching bugs like a *boss*

## Configuration

### Global Settings
- **PMD Installation**: Point to your PMD installation or let us handle it
- **Ruleset File**: Choose your ruleset XML file or use ours. (Still judging)
- **Analysis Trigger**: Configure when analysis runs
- **Caching**: I can't believe we let you turn caching off.

## Usage

### Basic Usage
1. Open a file
2. Write some questionable code
3. Watch the warnings roll in like you let agentforce write your damn code
4. Fix or ignore them (we recommend fixing, shipping bugs makes Codey cry)

### Advanced Features
- **Custom Rules**: Create your own rules when the defaults just won't cut it
- **MOAR file types**: Now we support those pesky HTML files you use for LWCs. Sprinkling aura:id's arround like they're Taylor Swift lyrics.

## Performance Tips

- Use incremental analysis for large projects
- Configure appropriate cache sizes
- Don't run all rules if you don't need them (looking at you, copy-paste detection. I mean, no one would copy/pasta stuff everywhere...)

## Known Issues

- Sometimes thinks your perfectly valid code is wrong (it's probably right though)
- It May cause an existential crisis about your coding practices (blame it on your coworkers, we won't git blame you until the trial)
- It Might make you realize your "temporary" solution from 2 years ago wasn't so temporary

## Contributing

Found a bug? Want to add a feature? Have a complaint?
1. Open an issue (unless it's a complaint)
2. Fork the repo
3. Make your changes
4. Submit a PR
5. Wait patiently while we judge your code as harshly as PMD judges ours

## Credits

- Original inspiration from [vscode-apex-pmd](https://github.com/ChuckJonas/vscode-apex-pmd)
- [PMD](https://pmd.github.io/) for giving us the tools to maintain our sanity
- Coffee, lots of coffee
- Insomnia due to the loss of my dog Lilo. She was Awesome.

## License

MIT License - Because sharing is caring, and lawyers are expensive.

---

Remember: PMD is like your conscience - you can ignore it, but you probably shouldn't.
Or maybe PMD is like those bumpers that pop up along the gutters of bowling alleys when Kiddos are playing. You know the one's you can totally ignore and force the ball to jump over, but you know, if you try at all, they'll help you not embarrass yourself. 

Happy bug writing! 🐛
