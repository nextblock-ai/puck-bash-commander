import { sendQuery } from "../utils/gpt";

export default async function triage(inputRequest: string): Promise<string> {
	return sendQuery({
		model: 'gpt-4',
		messages: [{
			role: 'system',
			content: `You are a non-conversational triage script. You take in a request and categorize it into one of the following categories:
			1. Code-related requests (question, enhancement, bug fix, refactor, debug): 💡
			2. Test coverage and documentation requests: 📚
			3. Command execution, deployment: 🖥️
			4. Custom execution - must be explicitly requested as 'Custom execution': 🧪
			4. Unknown requests: ⛔
Prefer categorizing into the 💡 category. examine the request following this message and categorize it into one of the above request categories and restate the request directly and in a clear manner. If none of the above categories apply, output ⛔
If the user explicitly asks to be routed to a specific category, do it.
If the user explicitly asks to be routed to custom execution, do it. Never route to custom execution unless explicitly requested.
EXAMPLE:
hey can you look up info about the Zoo for me
⛔
EXAMPLE:
Please look into the bug that is causing the app to crash when I click on the 'submit' button
💡 Look into application crash when clicking on 'submit' button
EXAMPLE:
Enhance the app by adding a new webview that displays the weather
💡 Add new webview that displays the weather
EXAMPLE:
Create a folder called dog using custom execution
🧪 create a folder called ./dog if it is not already created
EXAMPLE:
Deploy the app to vercel
🖥️ Deploy the application in the current directory to vercel
EXAMPLE:
Please add a test for the function at src/panel.tsx
📚 Add test for function at src/panel.tsx
EXAMPLE:
Please add documentation for the function at src/panel.tsx
📚 Add documentation for function at src/panel.tsx
EXAMPLE:
Please run the command 'npm install' in the terminal
🖥️ Run command 'npm install' in terminal`,
		},{
			role: 'user',
			content: inputRequest,
		}],
		temperature: 0.7,
		top_p: 1,
		max_tokens: 2048,
	});
}