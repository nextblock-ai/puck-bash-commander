class UnifiedEditor extends HTMLElement {
    roles = [];
    constructor() {
        super();
        this.messages = eval(this.getAttribute('messages'));
        this.roles = this.getAttribute('roles') ? eval(this.getAttribute('roles'))[0] : null;
        this.editor = document.createElement('div');
        this.editor.setAttribute('id', 'editor');
        this.editor.setAttribute('class', 'editor');
        this.appendChild(this.editor);
        this.editorTextInput = document.createElement('input');
        this.editorTextInput.setAttribute('id', 'editor-text-input');
        this.editorTextInput.setAttribute('class', 'editor-text-input');
        this.editorTextInput.setAttribute('type', 'text');
        this.editorTextInput.setAttribute('placeholder', 'Type your message here...');
        this.editorTextInput.addEventListener('keyup', (e) => {
            if (e.keyCode === 13) {
                this.messages.push({ role: 'hidden', content: '<br/>' });
                this.renderMessages();
            }
        });
        this.renderMessages();
    }

    getRoleStyle(role) {
        return this.roles[role].style;
    }

    clearEditor() {
        this.editor.innerHTML = '';
    }

    renderMessages() {
        this.clearEditor();
        this.messages.forEach(m => this.editor.appendChild(this.renderMessage(m)));
        this.editor.appendChild(this.editorTextInput);
    }

    renderMessage(message) {
        const style = this.getRoleStyle(message.name);
        const messageElement = document.createElement('div');
        messageElement.setAttribute('class', 'message');
        messageElement.innerHTML = message.content;
        if (style) {
            Object.keys(style).forEach(k => messageElement.style[k] = style[k]);
        }
        return messageElement;
    }

}

customElements.define('unified-editor', UnifiedEditor);

function getSystemPrompt() {
    return document.getElementById("system-prompt").value;
}
function setSystemPrompt(prompt) {
    document.getElementById("system-prompt").value = prompt;
}
const config = {
    openAIKey: "",
    systemPrompt: "You are a helpful assistant. You output content using the Markdown format. When outputting files you always output the file name prior to outputting the file content."
}
function getTemperature() {
    return document && document.getElementById("temperature").value;
}
function getMaxLength() {
    return document && document.getElementById("max-length").value;
}
function getTopP() {
    return document && document.getElementById("top-p").value;
}

function updateTemperatureLabel() {
    const temperature = document.getElementById("temperature").value;
    document.getElementById("temperature-value").textContent = temperature;
}

function updateMaxLengthLabel() {
    const maxLength = document.getElementById("max-length").value;
    document.getElementById("max-length-value").textContent = maxLength;
}

function updateTopPLabel() {
    const topP = document.getElementById("top-p").value;
    document.getElementById("top-p-value").textContent = topP;
}

function showChatDisplay() {
    const chatDisplay = document.querySelector(".chat-display");
    const unifiedDisplay = document.querySelector(".unified-display");
    chatDisplay.style.display = "flex";
    unifiedDisplay.style.display = "none";
}

function showUnifiedDisplay() {
    const chatDisplay = document.querySelector(".chat-display");
    const unifiedDisplay = document.querySelector(".unified-display");
    chatDisplay.style.display = "none";
    unifiedDisplay.style.display = "flex";
}

// toggle light / dark mode
document.getElementById("toggle-theme").addEventListener("click", () => {
    const root = document.querySelector(":root");
    const theme = document.getElementById("toggle-theme");
    if (theme.checked) {
        root.style.setProperty('--background-color', '#FFFFFF');
        root.style.setProperty('--secondary-background-color', '#F7F7F7');
        root.style.setProperty('--primary-color', '#4DD0E1');
        root.style.setProperty('--secondary-color', '#26C6DA');
        root.style.setProperty('--tertiary-color', '#f238aa');
        root.style.setProperty('--quaternary-color', '#afe29f');
        root.style.setProperty('--text-color', '#000000');
    } else {
        root.style.setProperty('--background-color', '#171717');
        root.style.setProperty('--secondary-background-color', '#212121');
        root.style.setProperty('--primary-color', '#4DD0E1');
        root.style.setProperty('--secondary-color', '#26C6DA');
        root.style.setProperty('--tertiary-color', '#f238aa');
        root.style.setProperty('--quaternary-color', '#afe29f');
        root.style.setProperty('--text-color', '#FFFFFF');
    }
});

async function createStreamingChatCompletion(message, settings, enqueue, onClose) {
    return new Promise((resolve, reject) => {
        async function createChatCompletion(message) {
            let body = '';
            const models = [{
                id: 'gpt-4',
                name: 'gpt-4',
                description: 'The default model trained on a large dataset of English language text.',
            }, {
                id: 'gpt-4-0613',
                name: 'gpt-4-0613',
                description: 'The default model trained on a large dataset of English language text.',
            }];
            if (message instanceof Array) {
                if (message.length === 0) return reject('No messages');
                if (message[0].role !== 'system') {
                    message.unshift({
                        role: 'system',
                        content: getSystemPrompt()
                    });
                }
                body = JSON.stringify({
                    model: models[settings.model].name || "gpt-4",
                    temperature: parseInt(getTemperature()) || 1,
                    messages: message,
                    stream: true,
                    n: 1,
                });
            } else {
                body = JSON.stringify({
                    model: models[settings.model].name || "gpt-4",
                    temperature: parseInt(getTemperature()) || 1,
                    messages: [{
                        role: 'system',
                        content: getSystemPrompt()
                    }, {
                        role: 'user',
                        content: message
                    }],
                    stream: true,
                    n: 1,
                });
            }
            const reader = fetch(
                "https://api.openai.com/v1/chat/completions", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.openAIKey}`
                },
                method: "POST",
                body,
            }
            ).then((response) => {
                if (!response.body || !response.body.pipeThrough) {
                    reject('Streaming not supported');
                }
                return response.body && response.body.pipeThrough(new TextDecoderStream()).getReader();
            });
            return reader;
        }
        try {
            let finalMessage = '', buffer = '';
            let done = false, value = '';
            createChatCompletion(message).then(async (reader) => {
                while (!done) {
                    ({ done, value } = await reader.read());
                    if (value === undefined) value = '';
                    // if the value contains [DONE] then we are done - enqueue the rest of the messages up to the [DONE] and resolve
                    if (value.includes('[DONE]') || done) {
                        value = value.replace('[DONE]', '');
                        if (value) { // if there is a value, enqueue it
                            buffer += value;
                            try {
                                const json = JSON.parse(buffer);
                                if (json.choices && json.choices.length > 0) {
                                    finalMessage += json.choices[0].delta.content;
                                }
                                buffer = '';
                            } catch (e) {
                                //
                            }
                            try { await enqueue(value); }
                            catch (error) { console.error('Error:', error); }
                        }
                        // close the stream
                        try {
                            await onClose(finalMessage);
                        } catch (error) {
                            console.error('Error:', error);
                        }
                        finally {
                            return resolve({
                                role: "assistant",
                                content: finalMessage,
                            });
                        }
                    }
                    else {
                        finalMessage += value;
                        let json = null;
                        try { json = JSON.parse(value); }
                        catch (error) {
                            //
                        }
                        if (json && json.finish_reason === 'stop') {
                            done = true;
                        }
                        try { await enqueue(value); }
                        catch (error) { console.error('Error:', error); }
                    }
                }
            });
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

document.querySelector("#save-all-files").addEventListener("click", () => {
    // Your save action
});

function createMessage(role = 'user', content = '') {
    const messages = document.getElementById("messages");
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "message-wrapper";

    const messageRole = document.createElement("button");
    messageRole.className = "message-role";
    messageRole.textContent = role;
    messageRole.addEventListener("click", () => {
        const roles = ["user", "assistant", "system"];
        const currentRole = messageRole.textContent;
        const indexRole = roles.indexOf(currentRole);
        messageRole.textContent = roles[(indexRole + 1) % roles.length];
    });
    messageWrapper.appendChild(messageRole);

    const commandBar = document.createElement("div");
    commandBar.className = "command-bar";
    commandBar.innerHTML = `
      <i class="fas fa-save command-icon" onclick="saveMessage(this)"></i>
      <i class="fas fa-redo command-icon" onclick="reloadMessage(this)"></i>
      <i class="fas fa-trash command-icon" onclick="deleteMessage(this)"></i>`;
    messageWrapper.appendChild(commandBar);
    function editMessage(event) {
        const textarea = event.target;
        textarea.readOnly = false;
    }
    function endEditMessage(event) {
        const textarea = event.target;
        textarea.readOnly = true;
    }
    function saveMessage(element) {
        const textarea = element.closest(".message-wrapper").querySelector("textarea");
        // Save action implementation here
    }

    const inputMessage = document.createElement("textarea");
    inputMessage.rows = 2;
    inputMessage.value = content;
    messageWrapper.appendChild(inputMessage);
    messages.appendChild(messageWrapper);

    return messageWrapper;
}

function createAutodetectedFile(file) {
    const autodetectedFiles = document.getElementById("autodetected-files");
    const fileWrapper = document.createElement("div");
    fileWrapper.className = "file";
    const fileType = document.createElement("div");
    fileType.className = "file-type";
    fileType.textContent = file.type;
    fileWrapper.appendChild(fileType);
    const fileExcerpt = document.createElement("div");
    fileExcerpt.className = "file-excerpt";
    fileExcerpt.textContent = file.excerpt;
    fileWrapper.appendChild(fileExcerpt);
    const fileDownload = document.createElement("button");
    fileDownload.className = "file-download";
    fileDownload.textContent = "Download";
    fileDownload.addEventListener("click", () => {
        // Your download action
    });
    fileWrapper.appendChild(fileDownload);
    autodetectedFiles.appendChild(fileWrapper);

    return fileWrapper;
}

function deleteMessage(element) {
    element.closest(".message-wrapper").remove();
}

function reloadMessage(element) {
    // Your reload action
}

function getMessagesList() {
    const result = [];
    const messages = document.getElementsByClassName("message-wrapper");
    for (let i = 0; i < messages.length; i++) {
        const roleElt = messages[i].querySelector(".message-role");
        const contentElt = messages[i].querySelector("textarea");
        const role = roleElt.textContent;
        const content = contentElt.value;
        result.push({ role, content });
    }
    return result;
}

function streamAndAppendMessages() {
    const messageContainer = document.getElementById("messages");
    let latestMessageElement = null;
    const onUpdate = (newMessageContent) => {
        if (!latestMessageElement || latestMessageElement.querySelector(".message-role").textContent !== "assistant") {
            latestMessageElement = createMessage("assistant", parseIncomingStream(newMessageContent));
            messageContainer.appendChild(latestMessageElement);
        } else {
            latestMessageElement.querySelector("textarea").value += " " + parseIncomingStream(newMessageContent);
        }
    };
    const onComplete = () => {
        // create a new message
        createMessage();
        saveChatDocument();
        console.log("Streamed responses completed.");
    };
    createStreamingChatCompletion(getMessagesList(), {
        model: document.getElementById("model").value,
        temperature: getTemperature(),
        maxTokens: getMaxLength(),
    }, onUpdate, onComplete);
}

function parseIncomingStream(stringData) {
    // Split the string by the 'data: ' pattern
    let splits = stringData.split('data: ');

    // Initialize an empty string to store the result
    let result = "";

    // Iterate over the splits
    for (let i = 1; i < splits.length; i++) {
        // Parse JSON data
        let data = JSON.parse(splits[i]);

        // Check if there is 'choices' array and its first element has 'delta' property 
        // and 'content' property in 'delta' object.
        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
            // Add the content to the result string
            result += data.choices[0].delta.content + ' ';
        }
    }

    // Trim the result at the end to remove any trailing spaces
    return result.trim();
}
document.querySelector("#add-message").addEventListener("click", () => {
    createMessage();
});

document.querySelector("#submit-button").addEventListener("click", () => {
    streamAndAppendMessages();
});

function setChatDocument(_document) {
    // set prompt
    setSystemPrompt(_document.prompt);
    // set the document title
    document.getElementById("doc-title").textContent = _document.title || "Untitled";
    document.getElementById("temperature").value = _document.temperature || 1;
    document.getElementById("max-length").value = _document.maxTokens || 2048;
    document.getElementById("top-p").value = _document.topP || 1;
    // clear messages
    const messages = document.getElementById("messages");
    messages.innerHTML = "";
    _document.messages.forEach(m => createMessage(m.role, m.content));
}

function saveChatDocument() {
    const messages = getMessagesList();
    const title = document.getElementById("doc-title").textContent;
    const temperature = document.getElementById("temperature").value;
    const maxTokens = document.getElementById("max-length").value;
    const topP = document.getElementById("top-p").value;
    const prompt = getSystemPrompt();
    const documentObject = {
        title,
        temperature,
        maxTokens,
        topP,
        prompt,
        messages,
    };
    const vscode = acquireVsCodeApi();
    // post aa message to vs code
    vscode.postMessage({
        command: 'submitConversation',
        data: documentObject
    });
}
document.addEventListener("DOMContentLoaded", () => {
    // message listener - listen for messages from vs code (we are in an extension context)
    window.addEventListener('message', event => {
        const unifiedEditor = document.querySelector('unified-editor');
        const message = event.data;
        switch (message.command) {
            case 'initializeThemeSettings':
                // Initialize the theme settings - set the styles
                const themeSettings = message.data;
                const root = document.querySelector(":root");
                const themeColor = themeSettings.themeColor;
                const editorFontFamily = themeSettings.editorFontFamily;

                // set the theme color
                root.style.setProperty('--background-color', themeColor);
                // set the editor font family
                root.style.setProperty('--editor-font-family', editorFontFamily);
                break;
            case 'setDocument':
                // Update the roles
                setChatDocument(message.data);
                break;
            case 'setApiKey':
                // Update the api key
                config.openAIKey = message.data;
                break;
            default:
                break;
        }
    });
    hljs.highlightAll();
    marked.setOptions({
        highlight: function (code, language) {
            const hljs = require('highlight.js');
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            return hljs.highlight(validLanguage, code).value;
        }
    });
    setSystemPrompt(config.systemPrompt);
    document.getElementById("temperature").addEventListener("input", updateTemperatureLabel);
    document.getElementById("max-length").addEventListener("input", updateMaxLengthLabel);
    document.getElementById("top-p").addEventListener("input", updateTopPLabel);
    document.getElementById("toggle-view-mode").addEventListener("click", () => {
        const chatDisplay = document.querySelector(".chat-display");
        if (chatDisplay.style.display === "none") {
            showChatDisplay()
        }
        else {
            showUnifiedDisplay()
        }
    });
    // Select the title span
    const titleSpan = document.querySelector("#doc-title");

    // Handle double-click event on the title span
    titleSpan.addEventListener("dblclick", () => {
        // Create an input element
        const input = document.createElement("input");
        const oldValue = titleSpan.textContent;

        // Set the input field's type and value
        input.type = "text";
        input.value = oldValue;

        // Replace the input field with the span
        titleSpan.replaceWith(input);

        // Move the caret to the end of the input
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;

        // Listen for when focus leaves the input
        input.addEventListener("blur", () => {
            if (input.value.trim() == '') {
                input.value = oldValue;
            }
            // Convert the input field back into a span
            titleSpan.textContent = input.value;
            input.replaceWith(titleSpan);
        });
    });
});
