# Puck - Bash Commander - (Beta Version)

[![Discord Follow](https://dcbadge.vercel.app/api/server/wCkJFveHeF?style=flat)](https://discord.gg/wCkJFveHeF)
[![Twitter Follow](https://img.shields.io/twitter/url/https/twitter.com/bukotsunikki.svg?style=social&label=Follow%20%40NextBlockAI)](https://twitter.com/nextblockai)

Puck - Bash Commander is an extension for Visual Studio Code that brings the power of AI to your development environment. It is part of the Puck suite of AI development tools. Bash Commander uses an advanced AI model to help you execute complex development tasks quickly and efficiently.

## 📖 Table of Contents

- [🔥 Features](#-features)
- [🚀  Getting Started](#-getting-started)
- [🔧 Configuration](#-configuration)
- [📚 Using Bash Commander](#-using-bash-commander)
- [✨  Use Cases](#-use-cases)
- [🤝 Contributing](#-contributing)
- [🚩 Troubleshooting](#-troubleshooting)
- [📄  License](#-license)
- [❗ Disclaimer](#-disclaimer)
- [📌 Beta Version Disclaimer](#-beta-version-disclaimer)

## 🔥 Features

- AI-powered shell assistant: Bash Commander is an advanced shell agent that can help you implement tasks, decompose complex tasks into smaller subtasks, and even guide you through the process of completing tasks step-by-step.

- Multilingual support: Bash Commander can output shell commands for any programming language, making it a versatile tool for developers working in various languages and environments.

- Seamless integration with Visual Studio Code: Bash Commander is designed to work within your existing development workflow, integrating seamlessly with Visual Studio Code.

## 🚀 Getting Started

1. Install the Puck - [Bash Commander extension](https://marketplace.visualstudio.com/items?itemName=NextBlock.puck-bash-commander) from the Visual Studio Code marketplace.
2. Reload Visual Studio Code
3. Get Your [Open AI API Key](https://platform.openai.com/account/api-keys)
4. Add your own Open AI API key by running the  the “Set Open AI Key” command from the command palette (CMD+shift+P).
5. Reload Visual Studio Code
6. Open a  [new or existing project](https://code.visualstudio.com/docs/editor/workspaces) 
7. Launch the Bash Commander terminal by running the "Open Bash Commander" command from the command palette (CMD+shift+P).
8. Start interacting with the AI-powered shell agent by entering your development tasks and questions.
9. To Stop Bash Commander, reload the window by running the "Developer: Reload Window" command from the command palette (CMD+shift+P).


## 🔧 Configuration

Puck - Bash Commander provides several configuration options that you can customize to suit your needs. These settings can be found in the extension settings within Visual Studio Code:

- `puck.apikey`: The API key for the OpenAI GPT service. This is required for the AI-powered shell agent to function.
- `puck.temperature`: The default temperature to use in queries. This affects the creativity of the AI's responses. Higher values result in more creative responses, while lower values produce more focused and deterministic outputs.
- `puck.maxTokens`: The default maximum number of tokens to use in queries. This limits the length of the AI's responses.

## 📚 Using Bash Commander 

Once you have installed and configured the Puck - Bash Commander extension, you can start using its features to streamline your development process:

1. Open the Bash Commander terminal by running the "puck: Bash Commander" command from the command palette.
2. Enter your development task or question in the terminal. The AI-powered shell agent will respond with appropriate shell commands, guidance, or follow-up questions.
3. Execute the suggested shell commands, follow the guidance provided, or answer any follow-up questions to complete your task.

## ✨ Use Cases

- **Full Stack Development** *(Full Stack Developers)*: 
    Manage both front-end and back-end components efficiently by asking Puck - Bash Commander to switch between development environments and perform routine tasks.
    
- **Web Development Workflow** *(Web Developer)*: 
    Streamline project setup by asking Puck - Bash Commander to create directories, move files, and set up a local development environment.

- **Data Analysis and Visualization** *(Data Scientist)*: 
    Simplify Python-based data analysis by asking Puck - Bash Commander to create new Python files, set up virtual environments, and install required packages.

- **Mobile App Development** *(Mobile App Developer)*: 
    Efficiently manage React Native projects by asking Puck - Bash Commander to navigate to project folders, install packages, and link native modules.

- **DevOps Automation** *(DevOps Engineer)*: 
    Automate common tasks like setting up CI pipelines and deploying code by asking Puck - Bash Commander to create Dockerfiles, build Docker images, and push them to a container registry.

- **Developer Assistance** *(Beginner Developer)*: 
    Receive guidance on programming tasks and concepts by asking Puck - Bash Commander questions or troubleshooting problems directly in the terminal.

- **Freelance Project Management** *(Freelancer)*: 
    Adapt to different programming languages and tools by asking Puck - Bash Commander to assist with tasks like cloning Git repositories and setting up local development environments.

Here are some other example tasks and questions you can try with the Bash Commander:

    - "Create a new Python file called `hello_world.py` and write a Hello World program."
    - "Install the `numpy` package using `pip`."
    - "Create a new directory called `src` and move all JavaScript files into it."
    - "How do I set up a virtual environment for a Python project?"

## 🤝 Contributing

If you are interested in contributing to the development of Puck - Bash Commander, please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to get started.

## 🚩 Troubleshooting

In the current beta status, if Puck Bash Commander is not operating correctly, reload your visual studio code from the command pallet (cmd+shft+p) > reload window

  **Known Errors**

  - The error of overwriting files poorly is known and fixed in an upcoming release
  - The error of puck executing two commands is known and fixed in an upcoming release
  - The error of puck only doing BASH things is known and fixed in an upcoming release
  - The error of puck not shutting down fully is know and being worked on


## 📄 License

Puck - GNU General Public License v3.0

## ❗ Disclaimer

These projects, Puck and Bash Commander, are experimental applications and are provided "as-is" without any warranty, express or implied. By using this software, you agree to assume all risks associated with its use, including but not limited to data loss, system failure, or any other issues that may arise.

The developers and contributors of this project do not accept any responsibility or liability for any losses, damages, or other consequences that may occur as a result of using this software. You are solely responsible for any decisions and actions taken based on the information provided by Puck or Bash Commander.

**Please note that the use of the GPT-4 language model can be expensive due to its token usage.** By utilizing this project, you acknowledge that you are responsible for monitoring and managing your own token usage and the associated costs. It is highly recommended to check your OpenAI API usage regularly and set up any necessary limits or alerts to prevent unexpected charges.

As an experiment, Puck may generate content or take actions that are not in line with real-world business practices or legal requirements. It is your responsibility to ensure that any actions or decisions made based on the output of this software comply with all applicable laws, regulations, and ethical standards. The developers and contributors of this project shall not be held responsible for any consequences arising from the use of this software.

By using Puck and Bash Commander, you agree to indemnify, defend, and hold harmless the developers, contributors, and any affiliated parties from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of this software or your violation of these terms.


 ## 📌 Beta Version Disclaimer

Please be aware that this software/project is currently in its Beta version, which means it's still in the active development stage. This version is intended for testing and feedback purposes, not for production use.

While we've worked hard to provide a high-quality experience, it's possible you may encounter bugs, errors, or other issues. We encourage you to report any issues you encounter, and we appreciate your patience as we work on improvements.

Please also note that certain features may be incomplete, subject to change, or not fully functional. We're actively working on these areas, and we're excited about the improvements to come.

Your use of this beta software/project is at your own risk. The developers/maintainers of the project will not be held responsible for any damage, data loss, or other issues resulting from the use of this beta version.

By using this beta version, you're helping us to improve the software/project. We appreciate your feedback and suggestions!
